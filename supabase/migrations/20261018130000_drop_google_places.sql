-- Google Places is no longer used: its terms don't allow keeping place details in our database.
-- Locations are imported from OpenStreetMap with upsert_osm_places instead.
--
-- location.google_place_id is kept. Google allows storing place ids, and existing rows may still
-- have one, which helps match them to their OpenStreetMap equivalents.

drop function if exists public.upsert_google_place(jsonb);

comment on column public.location.google_place_id is
  'Google Places id of locations imported before the switch to OpenStreetMap. No longer written.';
