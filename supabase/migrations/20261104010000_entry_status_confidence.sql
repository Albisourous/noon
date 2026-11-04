-- missed entries have no score; entries carry a status + confidence tier

alter table board_entries alter column score drop not null;

alter table board_entries
  add column status text not null default 'scored'
    check (status in ('scored', 'missed')),
  add column confidence text
    check (confidence in ('solid', 'building'));

-- re-create with status + confidence in the result set
drop function public.friend_board(date);

create function public.friend_board(p_wake_date date)
returns table (
  user_id uuid,
  handle text,
  score int,
  status text,
  confidence text,
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
  select m.user_id, p.handle, e.score, e.status, e.confidence, e.posted_at,
         coalesce(e.late, false)
  from members m
  left join profiles p on p.id = m.user_id
  left join board_entries e
    on e.user_id = m.user_id and e.wake_date = p_wake_date;
$$;
