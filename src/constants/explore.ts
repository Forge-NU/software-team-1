// Explore settings shared by the list (F-3), the map (F-2) and their data hook.

/**
 * Where Explore measures distance from until the app asks for the user's location.
 * Roughly the center of Northeastern's campus.
 */
export const DEFAULT_EXPLORE_ORIGIN = { latitude: 42.3398, longitude: -71.0892 } as const;

/** Same default as exploreSpots() in src/lib/explore.ts. */
export const EXPLORE_RADIUS_METERS = 2000;

/**
 * B-5's "best options" ranking (#25), to match the "Best options right now" header.
 * 'distance' is nearest first; rankSpots() supports both.
 */
export const EXPLORE_SORT: 'best' | 'distance' = 'best';
