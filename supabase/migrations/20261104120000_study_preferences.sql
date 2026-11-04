-- B-7: study preferences and the saved-spot notification setting, stored on the user's row.
-- All optional: a new user has no preferred noise, no amenities, and notifications off.

alter table public.users
  -- Reuses the noise_level lookup.
  add column preferred_noise smallint references public.noise_level (noise_level_id),
  -- No amenity lookup table exists, so these are text keys.
  add column preferred_amenities text[] not null default '{}',
  add column notify_saved_updates boolean not null default false;

-- Users could already update only their own name (initial schema). Extend that to these
-- columns only, so email and user_type stay unchangeable.
grant update (preferred_noise, preferred_amenities, notify_saved_updates) on public.users to authenticated;
