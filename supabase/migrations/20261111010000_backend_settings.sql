-- Tunable backend knobs (rate limits, etc.) so we can change values without
-- replacing create_post. Defaults: spot cooldown 10 minutes, hourly cap 100.

create table public.backend_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.backend_settings (key, value, description) values
  (
    'post_spot_cooldown_minutes',
    '10',
    'Minimum minutes between posts by the same user at the same spot'
  ),
  (
    'post_hourly_cap',
    '100',
    'Maximum posts per user across all spots in a rolling hour'
  );

create function public.backend_setting(p_key text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select value from public.backend_settings where key = p_key;
$$;

revoke execute on function public.backend_setting(text) from public, anon;
grant execute on function public.backend_setting(text) to authenticated;

alter table public.backend_settings enable row level security;

create policy "Signed-in users can read backend settings" on public.backend_settings
  for select to authenticated using (true);

create policy "Admins can insert backend settings" on public.backend_settings
  for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update backend settings" on public.backend_settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete backend settings" on public.backend_settings
  for delete to authenticated
  using ((select public.is_admin()));

revoke all on public.backend_settings from anon, authenticated;
grant select on public.backend_settings to authenticated;
grant insert, update, delete on public.backend_settings to authenticated;

-- Match create_post: wifi is optional, but when set must be > 0 (not zero).
alter table public.post drop constraint if exists post_wifi_mbps_check;
alter table public.post
  add constraint post_wifi_mbps_check
  check (wifi_mbps is null or wifi_mbps > 0);

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
  v_spot_cooldown_minutes int := coalesce(
    nullif(public.backend_setting('post_spot_cooldown_minutes'), '')::int,
    10
  );
  v_hourly_cap int := coalesce(
    nullif(public.backend_setting('post_hourly_cap'), '')::int,
    100
  );
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

  if v_spot_cooldown_minutes < 0 or v_hourly_cap < 1 then
    raise exception 'Invalid post rate limit settings' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.post p
    where p.user_id = v_uid
      and p.location_id = p_location_id
      and p.created_at > now() - make_interval(mins => v_spot_cooldown_minutes)
  ) then
    raise exception
      'You can post at this spot once every % %.',
      v_spot_cooldown_minutes,
      case when v_spot_cooldown_minutes = 1 then 'minute' else 'minutes' end
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
