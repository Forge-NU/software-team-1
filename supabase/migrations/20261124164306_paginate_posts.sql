-- B-21: one page at a time of a spot's posts and of the user's own check-ins.

-- Newest first per spot and per user. post_id breaks ties.
create index post_location_created_at_post_id_idx on public.post (location_id, created_at desc, post_id desc);
create index post_user_created_at_post_id_idx on public.post (user_id, created_at desc, post_id desc);

-- The new indexes start with the same columns, so these are no longer needed.
drop index public.post_location_id_created_at_idx;
drop index public.post_user_id_idx;

-- Vote totals and the caller's own vote for the given posts.
-- Runs as the owner so it can count other users' votes, like post_vote_summary.
create function public.vote_summaries(p_post_ids bigint[])
returns table (post_id bigint, upvotes integer, downvotes integer, vote_score integer, my_vote smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ids.id,
    (count(*) filter (where v.value = 1))::integer,
    (count(*) filter (where v.value = -1))::integer,
    coalesce(sum(v.value), 0)::integer,
    max(v.value) filter (where v.user_id = (select auth.uid()))
  from unnest(p_post_ids) as ids(id)
  left join public.vote v on v.post_id = ids.id
  group by ids.id;
$$;

-- One page of posts at a spot, with each post's first photo and votes.
-- First page: leave the cursor null. Next page: pass the time and id of the last post you got.
create function public.get_location_posts(
  p_location_id bigint,
  p_oldest_first boolean default false,
  p_crowd_level_ids smallint[] default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_post_id bigint default null,
  p_limit integer default 20
)
returns table (
  post_id bigint,
  user_id uuid,
  location_id bigint,
  seating_id bigint,
  crowd_level_id smallint,
  noise_level_id smallint,
  wifi_mbps real,
  caption text,
  created_at timestamptz,
  author_name text,
  photo_id bigint,
  photo_path text,
  photo_created_at timestamptz,
  upvotes integer,
  downvotes integer,
  vote_score integer,
  my_vote smallint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_ids bigint[];
begin
  -- Validate input
  if p_location_id is null then
    raise exception 'Invalid p_location_id: must not be null.';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid p_limit: %. Must be between 1 and 100.', p_limit;
  end if;
  if num_nulls(p_cursor_created_at, p_cursor_post_id) not in (0, 2) then
    raise exception 'Invalid cursor: p_cursor_created_at and p_cursor_post_id must be set together.';
  end if;

  -- Pick this page's posts in order, starting after the cursor.
  if coalesce(p_oldest_first, false) then
    select array_agg(x.post_id order by x.created_at, x.post_id)
    into v_ids
    from (
      select p.post_id, p.created_at
      from public.post p
      where p.location_id = p_location_id
        and (p_crowd_level_ids is null or p.crowd_level_id = any (p_crowd_level_ids))
        and (p_cursor_post_id is null
             or (p.created_at, p.post_id) > (p_cursor_created_at, p_cursor_post_id))
      order by p.created_at, p.post_id
      limit p_limit
    ) x;
  else
    select array_agg(x.post_id order by x.created_at desc, x.post_id desc)
    into v_ids
    from (
      select p.post_id, p.created_at
      from public.post p
      where p.location_id = p_location_id
        and (p_crowd_level_ids is null or p.crowd_level_id = any (p_crowd_level_ids))
        and (p_cursor_post_id is null
             or (p.created_at, p.post_id) < (p_cursor_created_at, p_cursor_post_id))
      order by p.created_at desc, p.post_id desc
      limit p_limit
    ) x;
  end if;

  return query
  select
    p.post_id,
    p.user_id,
    p.location_id,
    p.seating_id,
    p.crowd_level_id,
    p.noise_level_id,
    p.wifi_mbps,
    p.caption,
    p.created_at,
    u.name,
    ph.photo_id,
    ph.storage_path,
    ph.created_at,
    coalesce(vs.upvotes, 0),
    coalesce(vs.downvotes, 0),
    coalesce(vs.vote_score, 0),
    vs.my_vote
  from unnest(v_ids) with ordinality as ids(id, ord)
  join public.post p on p.post_id = ids.id
  join public.users u on u.user_id = p.user_id
  -- Only the first photo. The photo strip loads the rest.
  left join lateral (
    select pp.photo_id, pp.storage_path, pp.created_at
    from public.post_photo pp
    where pp.post_id = p.post_id
    order by pp.created_at, pp.photo_id
    limit 1
  ) ph on true
  left join public.vote_summaries(v_ids) vs on vs.post_id = p.post_id
  order by ids.ord;
end;
$$;

-- One page of the signed-in user's own posts, newest first.
create function public.get_my_check_ins(
  p_cursor_created_at timestamptz default null,
  p_cursor_post_id bigint default null,
  p_limit integer default 20
)
returns table (
  post_id bigint,
  location_id bigint,
  location_name text,
  crowd_level_id smallint,
  noise_level_id smallint,
  created_at timestamptz,
  photo_count integer,
  vote_score integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_ids bigint[];
begin
  -- Validate input
  if v_uid is null then
    raise exception 'Sign in to see your check-ins.' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid p_limit: %. Must be between 1 and 100.', p_limit;
  end if;
  if num_nulls(p_cursor_created_at, p_cursor_post_id) not in (0, 2) then
    raise exception 'Invalid cursor: p_cursor_created_at and p_cursor_post_id must be set together.';
  end if;

  select array_agg(x.post_id order by x.created_at desc, x.post_id desc)
  into v_ids
  from (
    select p.post_id, p.created_at
    from public.post p
    where p.user_id = v_uid
      and (p_cursor_post_id is null
           or (p.created_at, p.post_id) < (p_cursor_created_at, p_cursor_post_id))
    order by p.created_at desc, p.post_id desc
    limit p_limit
  ) x;

  return query
  select
    p.post_id,
    p.location_id,
    l.name,
    p.crowd_level_id,
    p.noise_level_id,
    p.created_at,
    (select count(*) from public.post_photo pp where pp.post_id = p.post_id)::integer,
    coalesce(vs.vote_score, 0)
  from unnest(v_ids) with ordinality as ids(id, ord)
  join public.post p on p.post_id = ids.id
  join public.location l on l.location_id = p.location_id
  left join public.vote_summaries(v_ids) vs on vs.post_id = p.post_id
  order by ids.ord;
end;
$$;

-- Only signed-in users can call these.
revoke execute on function public.vote_summaries(bigint[]) from public, anon;
grant execute on function public.vote_summaries(bigint[]) to authenticated;
revoke execute on function public.get_location_posts(bigint, boolean, smallint[], timestamptz, bigint, integer) from public, anon;
grant execute on function public.get_location_posts(bigint, boolean, smallint[], timestamptz, bigint, integer) to authenticated;
revoke execute on function public.get_my_check_ins(timestamptz, bigint, integer) from public, anon;
grant execute on function public.get_my_check_ins(timestamptz, bigint, integer) to authenticated;