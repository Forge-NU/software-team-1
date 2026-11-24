/**
 * Shared mock data for screens whose APIs aren't wired up yet (until F-7's data layer, #37).
 * Shapes match src/types/location.ts and src/lib/posts.ts exactly. Add to the arrays freely;
 * keep ids unique. Only screens import mocks, never src/lib.
 */
import { mockLocations } from './locations';
import { mockPosts } from './posts';

export { mockLocations } from './locations';
export { mockPosts } from './posts';
export { getMockExploreSpots, type MockExploreParams } from './explore';

export function getMockLocation(locationId: number) {
  return mockLocations.find((location) => location.location_id === locationId) ?? null;
}

/** Newest first, like getPostsForLocation() */
export function getMockPostsForLocation(locationId: number) {
  return mockPosts
    .filter((post) => post.location_id === locationId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
