-- Invite-only access (bathtub launch): sign-up stays open, but the app
-- gates on profiles.invited — set true only by redeeming an invite code.
-- Redeeming also friends the inviter instantly, so a new user's board
-- works on day one. Bootstrap: insert a row with inviter_id NULL and a
-- hand-picked code, redeem it yourself, then mint codes via create_invite().

create table invites (
  code text primary key,
  inviter_id uuid references profiles (id) on delete cascade,
  redeemed_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

alter table profiles add column invited boolean not null default false;

-- invited is grant-only via redeem_invite — never user-writable
revoke update (invited) on profiles from authenticated;

alter table invites enable row level security;

-- invitees never read the table; inviters see codes they minted
create policy "invites read own" on invites
  for select using (inviter_id = auth.uid());

create function public.create_invite()
returns text
language plpgsql
security definer set search_path = public
as $$
declare v_code text;
begin
  if not exists (
    select 1 from profiles where id = auth.uid() and invited
  ) then
    raise exception 'invites are for members only';
  end if;
  v_code := lower(substr(md5(gen_random_uuid()::text || auth.uid()::text), 1, 10));
  insert into invites (code, inviter_id) values (v_code, auth.uid());
  return v_code;
end;
$$;

create function public.redeem_invite(p_code text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare v_inviter uuid;
begin
  update invites
     set redeemed_by = auth.uid(), redeemed_at = now()
   where code = lower(trim(p_code))
     and redeemed_by is null
     and (inviter_id is null or inviter_id <> auth.uid())
  returning inviter_id into v_inviter;
  if not found then
    raise exception 'invalid or already used invite';
  end if;

  update profiles set invited = true where id = auth.uid();

  -- instant mutual friendship: an invite link doubles as a friend-add
  if v_inviter is not null and not exists (
    select 1 from friendships
     where least(requester_id, addressee_id) = least(v_inviter, auth.uid())
       and greatest(requester_id, addressee_id) = greatest(v_inviter, auth.uid())
  ) then
    insert into friendships (requester_id, addressee_id, status)
    values (v_inviter, auth.uid(), 'accepted');
  end if;
end;
$$;
