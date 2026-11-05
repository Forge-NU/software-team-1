// Explore settings shared by the list (F-3), the map (F-2) and their data hook.

/**
 * Where Explore measures distance from until the app asks for the user's location.
 * Roughly the center of Northeastern's campus.
 */
export const DEFAULT_EXPLORE_ORIGIN = { latitude: 42.3398, longitude: -71.0892 } as const;

/** Same default as exploreSpots() in src/lib/explore.ts. */
export const EXPLORE_RADIUS_METERS = 2000;

/**
 * Nearest first for now. Flip to 'best' once B-5's "best options" ranking is signed off;
 * rankSpots() already supports it, so nothing else changes.
 */
export const EXPLORE_SORT: 'best' | 'distance' = 'distance';
