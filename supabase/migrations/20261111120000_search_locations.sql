-- B-11: search locations by name, with or without the user's location.
-- nearby_locations has a name filter, but needs coordinates and has no text index.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Trigram index: keeps partial ("sne" -> "Snell") and fuzzy ("libary" -> "Library")
-- name matches fast, for both the ILIKE and the word-similarity checks below.
CREATE INDEX IF NOT EXISTS location_name_trgm_idx
    ON public.location USING GIN (name extensions.gin_trgm_ops);

-- TODO(B-12): once floor/building-level spots exist, index and search their names too.

CREATE OR REPLACE FUNCTION public.search_locations(
    query text,
    -- Optional: the user's position. Used to rank equally good name matches by distance.
    lat double precision DEFAULT NULL,
    lon double precision DEFAULT NULL,
    result_limit integer DEFAULT 20
)
RETURNS SETOF public.location
LANGUAGE plpgsql
STABLE
SET search_path = ''
   -- pg_trgm's default (0.6) misses one-letter typos ("libary" vs "Library" scores 0.5)
SET pg_trgm.word_similarity_threshold = '0.4'
AS $$
DECLARE
    q text := btrim(coalesce(query, ''));
    escaped text;
BEGIN
    -- Validate coordinates: both or neither, and in range
    IF num_nulls(lat, lon) = 1 THEN
        RAISE EXCEPTION 'Invalid coordinates: lat and lon must be given together.';
    END IF;
    IF lat IS NOT NULL AND (lat < -90.0 OR lat > 90.0) THEN
        RAISE EXCEPTION 'Invalid latitude: %. Must be between -90 and 90 degrees.', lat;
    END IF;
    IF lon IS NOT NULL AND (lon < -180.0 OR lon > 180.0) THEN
        RAISE EXCEPTION 'Invalid longitude: %. Must be between -180 and 180 degrees.', lon;
    END IF;
    -- Validate result_limit and query length
    IF result_limit IS NULL OR result_limit <= 0 OR result_limit > 50 THEN
        RAISE EXCEPTION 'Invalid result_limit: %. Must be between 1 and 50.', result_limit;
    END IF;
    IF length(q) > 100 THEN
        RAISE EXCEPTION 'Invalid query: must be at most 100 characters.';
    END IF;
    -- An empty query has no results
    IF q = '' THEN
        RETURN;
    END IF;

    -- Escape LIKE wildcards so the query is matched literally (same as nearby_locations)
    escaped := replace(replace(replace(lower(q), '\', '\\'), '%', '\%'), '_', '\_');

    RETURN QUERY
    WITH query_point AS (
        SELECT CASE WHEN lat IS NULL THEN NULL ELSE
            extensions.ST_SetSRID(extensions.ST_MakePoint(lon, lat), 4326)::extensions.geography
        END AS point
    ),
    ranked AS (
        SELECT
            loc.location_id,
            -- Name match quality first: 1 = the name starts with the query, 2 = a later word
            -- does, 3 = the name contains it, 4 = only a fuzzy match (typos)
            CASE
                WHEN lower(loc.name) LIKE escaped || '%' THEN 1
                WHEN lower(loc.name) LIKE '% ' || escaped || '%' THEN 2
                WHEN lower(loc.name) LIKE '%' || escaped || '%' THEN 3
                ELSE 4
            END AS match_tier,
            extensions.word_similarity(q, loc.name) AS similarity,
            -- NULL when no coordinates were given
            loc.geo_location operator(extensions.<->) query_point.point AS distance_m
        FROM public.location loc
        CROSS JOIN query_point
        WHERE lower(loc.name) LIKE '%' || escaped || '%'
           OR q operator(extensions.<%) loc.name
    )
    SELECT loc.*
    FROM ranked r
    JOIN public.location loc ON loc.location_id = r.location_id
    ORDER BY
        r.match_tier,
        -- Among fuzzy matches, the closest spelling first
        CASE WHEN r.match_tier = 4 THEN -r.similarity END,
        -- Then nearest first, when coordinates were given
        r.distance_m NULLS LAST,
        loc.name,
        loc.location_id
    LIMIT result_limit;
END
$$;

GRANT EXECUTE ON FUNCTION public.search_locations(text, double precision, double precision, integer)
    TO anon, authenticated;
