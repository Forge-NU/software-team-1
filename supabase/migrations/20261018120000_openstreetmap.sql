-- OpenStreetMap as the source for imported locations, replacing Google Places.
-- OSM data is licensed under the ODbL: the app must show "© OpenStreetMap contributors"
-- wherever it displays locations that have an osm_type/osm_id.

alter table public.location
  add column osm_type text check (osm_type in ('node', 'way', 'relation')),
  add column osm_id bigint check (osm_id > 0),
  add constraint location_osm_ref_check check ((osm_type is null) = (osm_id is null)),
  add constraint location_osm_ref_key unique (osm_type, osm_id);

comment on column public.location.osm_type is
  'OpenStreetMap element type. Together with osm_id identifies the source element, e.g. way/123.';
comment on column public.location.osm_id is
  'OpenStreetMap element id. Set on locations imported from OSM, which must be credited in the app.';

-- Atomically creates or refreshes locations (plus address and hours) from normalized
-- OpenStreetMap payloads, returning their location ids in the same order.
-- Runs as the caller, so RLS limits it to admins and the service role.
--
-- Payload shape (an array of):
-- {
--   "osm_type": "node" | "way" | "relation", "osm_id": number,
--   "name": text, "latitude": number, "longitude": number,
--   "default_location_type": text,   -- derived from OSM tags, used on first import
--   "campus": text | null,           -- university grounds the place is on, used when campus is unset
--   "address": { street_one, street_two, city, region, postal_code, country_code } | null,
--   "hours": [{ "day": text, "open_time": "HH:MM", "close_time": "HH:MM" }] | null
-- }
-- Re-importing updates name and coordinates but keeps manual location_type, campus and price.
-- Existing address and hours are only replaced when present in the payload.
create function public.upsert_osm_places(places jsonb)
returns setof bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  place jsonb;
  v_location_id bigint;
begin
  if jsonb_typeof(places) is distinct from 'array' then
    raise exception 'places must be a JSON array';
  end if;

  for place in select value from jsonb_array_elements(places) loop
    insert into public.location (osm_type, osm_id, name, latitude, longitude, location_type, campus)
    values (
      place ->> 'osm_type',
      (place ->> 'osm_id')::bigint,
      place ->> 'name',
      (place ->> 'latitude')::double precision,
      (place ->> 'longitude')::double precision,
      coalesce(place ->> 'default_location_type', 'other'),
      place ->> 'campus'
    )
    on conflict (osm_type, osm_id) do update set
      name = excluded.name,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      campus = coalesce(public.location.campus, excluded.campus)
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

    return next v_location_id;
  end loop;
end;
$$;

revoke execute on function public.upsert_osm_places(jsonb) from public, anon;
grant execute on function public.upsert_osm_places(jsonb) to authenticated, service_role;
