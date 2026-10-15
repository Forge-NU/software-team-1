-- Check-ins are posts. A post records crowd, noise and wifi for a spot and
-- must be saved with at least one photo. public.photo and public.check_in go away.

-- Photo flags pointed at public.photo. Drop those targets before the table does.
delete from public.flag
where photo_id is not null
  and review_id is null
  and reported_user_id is null;

update public.flag set photo_id = null where photo_id is not null;

alter table public.flag drop constraint if exists flag_photo_id_fkey;

drop table public.photo;
drop table public.check_in;

-- Lets a post point at a seat only when that seat belongs to the post's location.
alter table public.seating_area
  add constraint seating_area_seating_id_location_id_key unique (seating_id, location_id);

create table public.post (
  post_id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.users (user_id) on delete cascade,
  location_id bigint not null references public.location (location_id) on delete cascade,
  seating_id bigint,
  crowd_level_id smallint not null references public.crowd_level (crowd_level_id),
  noise_level_id smallint references public.noise_level (noise_level_id),
  wifi_mbps real check (wifi_mbps >= 0),
  caption text check (caption is null or char_length(caption) <= 500),
  created_at timestamptz not null default now(),
  -- Null seating_id skips this check. A set seating_id must be on this location.
  foreign key (seating_id, location_id)
    references public.seating_area (seating_id, location_id)
);

create index post_location_id_created_at_idx on public.post (location_id, created_at desc);
create index post_user_id_idx on public.post (user_id);

create table public.post_photo (
  photo_id bigint generated always as identity primary key,
  post_id bigint not null references public.post (post_id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index post_photo_post_id_idx on public.post_photo (post_id);

alter table public.flag
  add constraint flag_photo_id_fkey
  foreign key (photo_id) references public.post_photo (photo_id) on delete cascade;

-- Fires at commit, so create_post can insert the post and its photos first.
create function public.ensure_post_has_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.post_photo where post_id = new.post_id) then
    raise exception 'A post needs at least one photo' using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger post_requires_photo
  after insert on public.post
  deferrable initially deferred
  for each row
  execute function public.ensure_post_has_photo();

revoke execute on function public.ensure_post_has_photo() from public, anon, authenticated;

alter table public.post enable row level security;
create policy "Signed-in users can read posts" on public.post
  for select to authenticated using (true);
create policy "Users and admins can delete posts" on public.post
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

alter table public.post_photo enable row level security;
create policy "Signed-in users can read post photos" on public.post_photo
  for select to authenticated using (true);

revoke all on public.post from anon, authenticated;
grant select, delete on public.post to authenticated;

revoke all on public.post_photo from anon, authenticated;
grant select on public.post_photo to authenticated;

-- Saves a post and its photos in one transaction. photo_paths are object names
-- already uploaded to the post-photos bucket, each under the caller's folder.
create function public.create_post(
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
begin
  if v_uid is null then
    raise exception 'Sign in to post' using errcode = '42501';
  end if;

  if coalesce(cardinality(p_photo_paths), 0) < 1 then
    raise exception 'A post needs at least one photo' using errcode = '23514';
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-photos',
  'post-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
);

-- storage.objects already has row level security on hosted Supabase. The test
-- stub turns it on itself; the migration role cannot alter that table.

create policy "Signed-in users can read post photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'post-photos');

create policy "Users can upload post photos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update their own post photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own post photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
