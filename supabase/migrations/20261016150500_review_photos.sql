-- Optional photos on reviews. Check-in posts still require at least one photo.

create table public.review_photo (
  photo_id bigint generated always as identity primary key,
  review_id bigint not null references public.review (review_id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index review_photo_review_id_idx on public.review_photo (review_id);

alter table public.review_photo enable row level security;
create policy "Anyone can read review photos" on public.review_photo
  for select to anon, authenticated using (true);
create policy "Review authors can delete their review photos" on public.review_photo
  for delete to authenticated
  using (
    exists (
      select 1 from public.review r
      where r.review_id = review_photo.review_id
        and r.user_id = (select auth.uid())
    )
    or (select public.is_admin())
  );

revoke insert, update on public.review_photo from anon, authenticated;
grant select, delete on public.review_photo to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos',
  'review-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy "Signed-in users can read review photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'review-photos');

create policy "Users can upload review photos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update their own review photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own review photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Links uploaded objects to a review the caller owns. p_photo_paths may be empty.
create function public.attach_review_photos(
  p_review_id bigint,
  p_photo_paths text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sign in to attach photos' using errcode = '42501';
  end if;

  if coalesce(cardinality(p_photo_paths), 0) < 1 then
    return;
  end if;

  if not exists (
    select 1 from public.review r
    where r.review_id = p_review_id and r.user_id = v_uid
  ) then
    raise exception 'Review not found' using errcode = '42501';
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
      where o.bucket_id = 'review-photos' and o.name = path
    )
  ) then
    raise exception 'Photo has not been uploaded' using errcode = '23503';
  end if;

  insert into public.review_photo (review_id, storage_path)
  select p_review_id, path from unnest(p_photo_paths) as t(path);
end;
$$;

revoke execute on function public.attach_review_photos(bigint, text[]) from public, anon;
grant execute on function public.attach_review_photos(bigint, text[]) to authenticated;
