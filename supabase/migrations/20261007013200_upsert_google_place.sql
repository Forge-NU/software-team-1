-- Atomically creates or refreshes a location (plus address and hours) from a
-- normalized Google Places payload. Runs as the caller, so RLS limits it to admins.
--
-- Payload shape:
-- {
--   "google_place_id": text, "name": text, "latitude": number, "longitude": number,
--   "default_location_type": text,   -- derived from Google types, used on first import
--   "location_type": text | null,    -- explicit override, always applied
--   "campus": text | null,           -- explicit override, always applied
--   "price_range_id": int | null,
--   "address": { street_one, street_two, city, region, postal_code, country_code } | null,
--   "hours": [{ "day": text, "open_time": "HH:MM", "close_time": "HH:MM" }] | null
-- }
-- Existing hours are only replaced when "hours" is present.
create function public.upsert_google_place(place jsonb)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_location_id bigint;
begin
  insert into public.location (
    google_place_id, name, latitude, longitude, location_type, campus, price_range_id
  )
  values (
    place ->> 'google_place_id',
    place ->> 'name',
    (place ->> 'latitude')::double precision,
    (place ->> 'longitude')::double precision,
    coalesce(place ->> 'location_type', place ->> 'default_location_type', 'other'),
    place ->> 'campus',
    (place ->> 'price_range_id')::smallint
  )
  on conflict (google_place_id) do update set
    name = excluded.name,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    price_range_id = excluded.price_range_id,
    location_type = coalesce(place ->> 'location_type', public.location.location_type),
    campus = coalesce(place ->> 'campus', public.location.campus)
  returning location_id into v_location_id;

  if jsonb_typeof(place -> 'address') = 'object' then
    insert into public.address (
      location_id, street_one, street_two, city, region, postal_code, country_code
    )
    values (
      v_location_id,
      place -> 'address' ->> 'street_one',
      place -> 'address' ->> 'street_two',
      place -> 'address' ->> 'city',
      place -> 'address' ->> 'region',
      place -> 'address' ->> 'postal_code',
      place -> 'address' ->> 'country_code'
    )
    on conflict (location_id) do update set
      street_one = excluded.street_one,
      street_two = excluded.street_two,
      city = excluded.city,
      region = excluded.region,
      postal_code = excluded.postal_code,
      country_code = excluded.country_code;
  end if;

  if jsonb_typeof(place -> 'hours') = 'array' then
    delete from public.day_hours where location_id = v_location_id;
    insert into public.day_hours (location_id, day, open_time, close_time)
    select v_location_id, h.day, h.open_time, h.close_time
    from jsonb_to_recordset(place -> 'hours') as h(day text, open_time time, close_time time);
  end if;

  return v_location_id;
end;
$$;

revoke execute on function public.upsert_google_place(jsonb) from public, anon;
grant execute on function public.upsert_google_place(jsonb) to authenticated;
