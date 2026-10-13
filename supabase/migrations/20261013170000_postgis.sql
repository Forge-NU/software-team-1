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
    -- Filters
    campus_filter text DEFAULT NULL,
    location_type_filter text DEFAULT NULL,
    name_filter text DEFAULT NULL,
    price_range_filter smallint DEFAULT NULL,
    -- Pagination parameters: the coordinates and id of the last location on the previous page
    after_latitude double precision DEFAULT NULL,
    after_longitude double precision DEFAULT NULL,
    after_location_id bigint DEFAULT NULL,
    page_size integer DEFAULT 30
)
RETURNS SETOF public.location
LANGUAGE plpgsql
STABLE
SET search_path = ''
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
    -- Validate page_size input
    IF page_size IS NULL OR page_size <= 0 OR page_size > 100 THEN
        RAISE EXCEPTION 'Invalid page_size: %. Must be between 1 and 100.', page_size;
    END IF;
    -- Validate cursor input: either all three parts are set or none are
    IF num_nulls(after_latitude, after_longitude, after_location_id) NOT IN (0, 3) THEN
        RAISE EXCEPTION 'Invalid cursor: after_latitude, after_longitude and after_location_id must be set together.';
    END IF;

    RETURN QUERY
    WITH query_point AS (
        SELECT extensions.ST_SetSRID(
            extensions.ST_MakePoint(lon, lat),
            4326
        )::extensions.geography AS point
    ),
    -- Distance of the previous page's last location, computed the same way as geo_location
    -- so that it compares exactly with the distances below
    anchor AS (
        SELECT extensions.ST_SetSRID(
            extensions.ST_MakePoint(after_longitude, after_latitude),
            4326
        )::extensions.geography operator(extensions.<->) query_point.point AS distance_m
        FROM query_point
    )
    SELECT loc.*
    FROM public.location loc
    CROSS JOIN query_point
    CROSS JOIN anchor
    WHERE extensions.ST_DWithin(loc.geo_location, query_point.point, radius_m)
      AND (campus_filter IS NULL OR loc.campus = campus_filter)
      AND (location_type_filter IS NULL OR loc.location_type = location_type_filter)
      -- Escape LIKE wildcards so the name is matched literally
      AND (name_filter IS NULL OR loc.name ILIKE
           '%' || replace(replace(replace(name_filter, '\', '\\'), '%', '\%'), '_', '\_') || '%')
      AND (price_range_filter IS NULL OR loc.price_range_id = price_range_filter)
      AND (after_location_id IS NULL OR
           (loc.geo_location operator(extensions.<->) query_point.point, loc.location_id)
             > (anchor.distance_m, after_location_id))
    ORDER BY loc.geo_location operator(extensions.<->) query_point.point, loc.location_id
    LIMIT page_size;
END
$$;
