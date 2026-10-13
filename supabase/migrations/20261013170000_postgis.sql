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

CREATE OR REPLACE FUNCTION public.nearby_locations(
    lat double precision,
    lon double precision,
    radius_m double precision,
    max_results integer DEFAULT 30
)
RETURNS SETOF public.location
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- Validate lat input
    IF lat IS NULL OR lat < -90.0 OR lat > 90.0 THEN
        RAISE EXCEPTION 'Invalid latitude: %. Must be between -90 and 90 degrees.', lat;
    END IF;
    -- Validate lon input
    IF lon IS NULL OR lon < -180.0 OR lon > 180.0 THEN
        RAISE EXCEPTION 'Invalid longitude: %. Must be between -180 and 180 degrees.', lon;
    END IF;
    -- Validate radius input
    IF radius_m IS NULL OR radius_m <= 0.0 THEN
        RAISE EXCEPTION 'Invalid radius: %. Must be a positive number greater than 0.', radius_m;
    END IF;
    -- Prevent excessive results
    IF max_results IS NULL OR max_results <= 0 THEN
        RAISE EXCEPTION 'Invalid max_results: %. Must be a positive integer greater than 0.', max_results;
    ELSIF max_results > 100 THEN
        RAISE EXCEPTION 'Invalid max_results: %. Maximum allowed results per request is 100.', max_results;
    END IF;

    RETURN QUERY
    SELECT loc.*
    FROM public.location loc
    CROSS JOIN LATERAL (
        SELECT extensions.ST_SetSRID(extensions.ST_MakePoint(lon, lat), 4326)::extensions.geography AS geo_location
    ) AS loc_geo
    WHERE extensions.ST_DWithin(
        loc.geo_location,
        loc_geo.geo_location,
        radius_m
    )
    ORDER BY loc.geo_location operator(extensions.<->) loc_geo.geo_location ASC
    LIMIT max_results;
END
$$;
