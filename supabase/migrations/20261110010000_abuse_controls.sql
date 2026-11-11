-- Abuse controls: post rate limits, flag a post, one report per user per target.
-- Decision (not built): do not auto-hide posts after several reports. Moderators
-- use open_flags (with report_count) and act manually. Candidate later: hide
-- after 3+ pending reports.

-- Tunable limits for create_post (keep in sync with the function body below).
-- Spot cooldown: 10 minutes. Per-user hourly cap: 10 posts.

-- ---------------------------------------------------------------------------
-- Flag: report a post; exactly one target; one report per user per target
-- ---------------------------------------------------------------------------

alter table public.flag
  add column post_id bigint references public.post (post_id) on delete cascade;

create index flag_post_id_idx on public.flag (post_id);

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.flag'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%num_nonnulls%'
  loop
    execute format('alter table public.flag drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.flag
  add constraint flag_exactly_one_target_check
  check (num_nonnulls(review_id, photo_id, reported_user_id, post_id) = 1);

create unique index flag_user_post_unique
  on public.flag (user_id, post_id)
  where post_id is not null;

create unique index flag_user_review_unique
  on public.flag (user_id, review_id)
  where review_id is not null;

create unique index flag_user_photo_unique
  on public.flag (user_id, photo_id)
  where photo_id is not null;

create unique index flag_user_reported_user_unique
  on public.flag (user_id, reported_user_id)
  where reported_user_id is not null;

-- Pending flags with how many open reports share the same target.
-- security_invoker keeps flag RLS: reporters see own rows; admins see all.
create view public.open_flags
with (security_invoker = true) as
select
  f.flag_id,
  f.user_id as reporter_id,
  f.review_id,
  f.photo_id,
  f.reported_user_id,
  f.post_id,
  f.reason,
  f.status,
  (
    select count(*)::int
    from public.flag f2
    where f2.status = 'pending'
      and f2.review_id is not distinct from f.review_id
      and f2.photo_id is not distinct from f.photo_id
      and f2.reported_user_id is not distinct from f.reported_user_id
      and f2.post_id is not distinct from f.post_id
  ) as report_count
from public.flag f
where f.status = 'pending';

revoke all on public.open_flags from public, anon;
grant select on public.open_flags to authenticated;

-- ---------------------------------------------------------------------------
-- create_post: at most 1 post per user per spot per 10 minutes; 10 / hour
-- ---------------------------------------------------------------------------

create index if not exists post_user_id_location_id_created_at_idx
  on public.post (user_id, location_id, created_at desc);

create or replace function public.create_post(
  p_location_id bigint,
  p_seating_id bigint,
  p_crowd_level_id smallint,
  p_noise_level_id smallint,
  p_wifi_mbps real,
  p_caption text,
  p_photo_paths text[]
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_post_id bigint;
  -- Tunable: keep in sync with the migration header comment.
  v_spot_cooldown interval := interval '10 minutes';
  v_hourly_cap int := 10;
begin
  if v_uid is null then
    raise exception 'Sign in to post' using errcode = '42501';
  end if;

  if p_location_id is null then
    raise exception 'A location is required' using errcode = '23502';
  end if;

  if p_crowd_level_id is null then
    raise exception 'A crowd level is required' using errcode = '23502';
  end if;

  -- Reject non-positive speeds and NaN (NaN is not equal to itself).
  if p_wifi_mbps is not null and (p_wifi_mbps <= 0 or p_wifi_mbps <> p_wifi_mbps) then
    raise exception 'Wifi speed must be greater than 0' using errcode = '23514';
  end if;

  if p_caption is not null and char_length(p_caption) > 500 then
    raise exception 'Caption must be 500 characters or fewer' using errcode = '23514';
  end if;

  if not exists (select 1 from public.location l where l.location_id = p_location_id) then
    raise exception 'Location not found' using errcode = '23503';
  end if;

  if not exists (select 1 from public.crowd_level c where c.crowd_level_id = p_crowd_level_id) then
    raise exception 'Unknown crowd level' using errcode = '23503';
  end if;

  if p_noise_level_id is not null
     and not exists (select 1 from public.noise_level n where n.noise_level_id = p_noise_level_id) then
    raise exception 'Unknown noise level' using errcode = '23503';
  end if;

  if coalesce(cardinality(p_photo_paths), 0) < 1 then
    raise exception 'A post needs at least one photo' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.post p
    where p.user_id = v_uid
      and p.location_id = p_location_id
      and p.created_at > now() - v_spot_cooldown
  ) then
    raise exception 'You can post at this spot once every % minutes.',
      (extract(epoch from v_spot_cooldown) / 60)::int
      using errcode = '23514';
  end if;

  if (
    select count(*)::int
    from public.post p
    where p.user_id = v_uid
      and p.created_at > now() - interval '1 hour'
  ) >= v_hourly_cap then
    raise exception 'Hourly post limit reached. Try again later.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(p_photo_paths) as t(path)
    where case
      when path is null or path = '' or strpos(path, '..') > 0 then true
      when coalesce((storage.foldername(path))[1], '') is distinct from v_uid::text then true
      else false
    end
  ) then
    raise exception 'Photo must be uploaded to your folder' using errcode = '42501';
  end if;

  if exists (
    select 1
    from unnest(p_photo_paths) as t(path)
    where not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'post-photos' and o.name = path
    )
  ) then
    raise exception 'Photo has not been uploaded' using errcode = '23503';
  end if;

  insert into public.post (
    user_id, location_id, seating_id, crowd_level_id, noise_level_id, wifi_mbps, caption
  )
  values (
    v_uid, p_location_id, p_seating_id, p_crowd_level_id, p_noise_level_id, p_wifi_mbps, p_caption
  )
  returning post_id into v_post_id;

  insert into public.post_photo (post_id, storage_path)
  select v_post_id, path from unnest(p_photo_paths) as t(path);

  return v_post_id;
end;
$$;

revoke execute on function public.create_post(bigint, bigint, smallint, smallint, real, text, text[]) from public, anon;
grant execute on function public.create_post(bigint, bigint, smallint, smallint, real, text, text[]) to authenticated;
