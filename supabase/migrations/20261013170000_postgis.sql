-- Adds the PostGIS extension to enable spatial data types and functions in the database
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Geography column for location table, used for spatial queries and mapping
ALTER TABLE public.location
    ADD COLUMN IF NOT EXISTS geo_location extensions.geography(Point, 4326)
        GENERATED ALWAYS AS (
            extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::extensions.geography
        ) STORED;

-- Index on the geography column to improve performance of spatial queries
CREATE INDEX IF NOT EXISTS location_geo_location_idx
    ON public.location USING GIST (geo_location);