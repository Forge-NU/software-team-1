-- B-8: campus feed, newest posts across all spots, one page at a time.

-- Sorts posts newest first. post_id breaks ties.
create index post_created_at_post_id_idx on public.post (created_at desc, post_id desc);

-- Returns one page of the feed.
-- First page: pass nulls. Next page: pass the time and id of the last post you got.
create function public.get_campus_feed(
  p_before_created_at timestamptz default null,
  p_before_post_id bigint default null,
  p_limit integer default 20,
  p_saved_only boolean default false
)
returns table (
  post_id bigint,
  location_id bigint,
  location_name text,
  user_id uuid,
  author_name text,
  crowd_level_id smallint,
  crowd_level text,
  noise_level_id smallint,
  noise_level text,
  caption text,
  created_at timestamptz,
  photo_path text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_saved_location_ids bigint[];
begin
  -- Only checks saved spots (B-6) when asked.
  if p_saved_only then
    select coalesce(array_agg(s.location_id), '{}')
    into v_saved_location_ids
    from public.saved_spot s
    where s.user_id = (select auth.uid());
  end if;

  return query
  select
    p.post_id,
    p.location_id,
    l.name,
    p.user_id,
    u.name,
    p.crowd_level_id,
    cl.label,
    p.noise_level_id,
    nl.label,
    p.caption,
    p.created_at,
    ph.storage_path
  from public.post p
  join public.location l on l.location_id = p.location_id
  join public.users u on u.user_id = p.user_id
  join public.crowd_level cl on cl.crowd_level_id = p.crowd_level_id
  left join public.noise_level nl on nl.noise_level_id = p.noise_level_id
  -- Each post's first photo. Posts without a photo are skipped.
  join lateral (
    select pp.storage_path
    from public.post_photo pp
    where pp.post_id = p.post_id
    order by pp.created_at, pp.photo_id
    limit 1
  ) ph on true
  where (p_before_created_at is null
         or (p.created_at, p.post_id) < (p_before_created_at, p_before_post_id))
    and (v_saved_location_ids is null or p.location_id = any (v_saved_location_ids))
  order by p.created_at desc, p.post_id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;

-- Only signed-in users can read the feed.
revoke execute on function public.get_campus_feed(timestamptz, bigint, integer, boolean) from public, anon;
grant execute on function public.get_campus_feed(timestamptz, bigint, integer, boolean) to authenticated;