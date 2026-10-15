-- B-2: profiles table, auto-created on sign-up, protected by RLS

-- 1. The profiles table. Each profile's id is the same as the user's auth id.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text, -- placeholder
  created_at timestamptz not null default now()
);

-- 2. Turn on Row Level Security. With RLS on, nobody can do anything
--    to this table except what the policies below allow.
alter table public.profiles enable row level security;

-- Anyone signed in can read profiles and the posts will show the aythors name
create policy "Signed-in users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only update their own profile.
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Users may only change these two columns (not id or created_at).
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- 3. Automatically create a profile whenever new users signs up.
--    The display name comes from the sign-up form. If it's missing,
--    we fall back to the part of the email before the @.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();