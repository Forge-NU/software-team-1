-- B-26: find photo files in storage that no longer belong to a post or review.
--
-- Files and rows drift apart when a location is deleted (the rows cascade, the files don't),
-- when the app is killed between upload and create_post, or when deletePost removes the row
-- but not the files. The cleanup-orphaned-photos Edge Function calls this, then removes the
-- files through the Storage API (Supabase doesn't allow deleting from storage.objects directly).
--
-- Only files older than min_age are returned, so uploads still waiting for create_post are
-- never touched. Only the service role can call this.

create function public.orphaned_photos(
  min_age interval default interval '24 hours',
  max_rows integer default 1000
)
returns table (bucket_id text, name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, o.name, o.created_at
  from storage.objects o
  where o.created_at < now() - min_age
    and (
      (o.bucket_id = 'post-photos'
        and not exists (select 1 from public.post_photo p where p.storage_path = o.name))
      or (o.bucket_id = 'review-photos'
        and not exists (select 1 from public.review_photo r where r.storage_path = o.name))
    )
  order by o.created_at
  limit max_rows;
$$;

revoke all on function public.orphaned_photos(interval, integer) from public, anon, authenticated;
grant execute on function public.orphaned_photos(interval, integer) to service_role;
