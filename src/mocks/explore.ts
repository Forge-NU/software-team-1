import { CROWD_LEVELS, NOISE_LEVELS, type CrowdLevelId, type NoiseLevelId } from '@/constants/lookups';
import { rankSpots, type ExploreFilters, type ExploreSpot, type LocationRow } from '@/lib/exploreRanking';

import { mockLocations } from './locations';
import { mockPosts } from './posts';

export interface MockExploreParams {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  filters?: ExploreFilters;
  sort?: 'best' | 'distance';
  limit?: number;
}

/**
 * Stand-in for exploreSpots() in src/lib/explore.ts: same params, same ExploreSpot results,
 * and the same rankSpots() ranking, so swapping to live data is a one-line change.
 *
 * Differences from live data: every mock spot is returned (the real radius is applied
 * server side), and mocks have no seating areas, so groupStudy and chargers match nothing.
 */
export function getMockExploreSpots(params: MockExploreParams): ExploreSpot[] {
  const rows: LocationRow[] = mockLocations.map((location) => ({
    location_id: location.location_id,
    name: location.name,
    location_type: location.location_type,
    campus: location.campus,
    price_range_id: location.price_range_id,
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.address ? { street_one: location.address.street_one, city: location.address.city } : null,
    area: [],
    seating_area: [],
    post: mockPosts
      .filter((post) => post.location_id === location.location_id)
      .map((post) => ({
        created_at: post.created_at,
        crowd_level_id: post.crowd_level_id,
        noise_level_id: post.noise_level_id,
        crowd_level: { label: CROWD_LEVELS[post.crowd_level_id as CrowdLevelId] },
        noise_level: post.noise_level_id != null ? { label: NOISE_LEVELS[post.noise_level_id as NoiseLevelId] } : null,
        post_photo: post.photos.map((photo) => ({ storage_path: photo.storage_path, created_at: photo.created_at })),
      })),
  }));

  const spots = rankSpots(rows, { ...params, radiusMeters: params.radiusMeters ?? 2000 });

  // exploreSpots() signs photo paths into URLs; mock photos already have public URLs.
  const photoUrls = new Map(mockPosts.flatMap((post) => post.photos.map((photo) => [photo.storage_path, photo.url] as const)));
  return spots.map((spot) => ({
    ...spot,
    latest_photo_url: spot.latest_photo_path ? photoUrls.get(spot.latest_photo_path) ?? null : null,
  }));
}
