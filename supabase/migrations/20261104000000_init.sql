-- Napking v1 schema (per DESIGN.md)

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique,
  tz text not null default 'UTC',
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles (id) on delete cascade,
  addressee_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- one relationship per unordered pair, regardless of who requested
create unique index friendships_pair_unique on friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table sleep_nights (
  user_id uuid not null references profiles (id) on delete cascade,
  wake_date date not null,
  source text not null default 'healthkit',
  start_time timestamptz,
  end_time timestamptz,
  asleep_min int,
  inbed_min int,
  awakenings int,
  tz text not null default 'UTC',
  raw_json jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, wake_date)
);

create table board_entries (
  user_id uuid not null references profiles (id) on delete cascade,
  wake_date date not null,
  score int not null check (score between 0 and 100),
  formula_version int not null,
  posted_at timestamptz not null default now(),
  late boolean not null default false,
  primary key (user_id, wake_date)
);

alter table profiles enable row level security;
alter table friendships enable row level security;
alter table sleep_nights enable row level security;
alter table board_entries enable row level security;

-- profiles: readable by any authed user (needed for handle search), writable only by self
create policy "profiles readable" on profiles
  for select to authenticated using (true);
create policy "profiles update own" on profiles
  for update using (id = auth.uid());

create policy "friendships read own" on friendships
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friendships request own" on friendships
  for insert with check (requester_id = auth.uid());
create policy "friendships update parties" on friendships
  for update using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friendships delete parties" on friendships
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());

-- raw sleep data is private: score only is shared
create policy "sleep read own" on sleep_nights
  for select using (user_id = auth.uid());
create policy "sleep write own" on sleep_nights
  for insert with check (user_id = auth.uid());
create policy "sleep update own" on sleep_nights
  for update using (user_id = auth.uid());

create policy "entries read self + friends" on board_entries
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = board_entries.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = board_entries.user_id))
    )
  );
create policy "entries insert own" on board_entries
  for insert with check (user_id = auth.uid());
-- no update/delete policies: entries are immutable once posted

-- board = me + accepted friends, with their entry for a wake_date (null = pending)
create function public.friend_board(p_wake_date date)
returns table (
  user_id uuid,
  handle text,
  score int,
  posted_at timestamptz,
  late boolean
)
language sql
security invoker
stable
as $$
  with me as (select auth.uid() as uid),
  members as (
    select uid as user_id from me
    union
    select case when f.requester_id = m.uid then f.addressee_id else f.requester_id end
    from friendships f, me m
    where f.status = 'accepted'
      and (f.requester_id = m.uid or f.addressee_id = m.uid)
  )
  select m.user_id, p.handle, e.score, e.posted_at, coalesce(e.late, false)
  from members m
  left join profiles p on p.id = m.user_id
  left join board_entries e
    on e.user_id = m.user_id and e.wake_date = p_wake_date;
$$;
