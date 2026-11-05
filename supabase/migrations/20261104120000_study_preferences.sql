-- B-7: study preferences and the saved-spot notification setting.
--
-- Kept in their own table rather than on users: users is readable by every signed-in user
-- (for author names), and preferences should only be visible to their owner.
-- Preferences are optional: a new user has no row, which means no preferences.

create table public.user_preferences (
  user_id uuid primary key default auth.uid() references public.users (user_id) on delete cascade,
  -- Reuses the noise_level lookup. Onboarding's Quiet is 2 (Quiet) and Social is 4 (Loud).
  preferred_noise smallint references public.noise_level (noise_level_id),
  -- No amenity lookup table exists, so these are fixed keys.
  preferred_amenities text[] not null default '{}'
    check (preferred_amenities <@ array['outlets', 'wifi', 'whiteboards', 'food_drinks']),
  notify_saved_updates boolean not null default false
);

-- RLS: users can only read, create and change their own preferences.
alter table public.user_preferences enable row level security;

create policy "Users can read their own preferences" on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users can create their own preferences" on public.user_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users can update their own preferences" on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.user_preferences from anon, authenticated;
grant select, insert, update on public.user_preferences to authenticated;
