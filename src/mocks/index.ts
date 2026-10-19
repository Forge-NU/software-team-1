/**
 * Shared mock data for frontend work before the real APIs are wired up.
 * Import from '@/mocks', add to the arrays in locations.ts / posts.ts, and keep ids unique.
 * Don't import mocks from src/lib — they're for screens only.
 */
import { mockLocations } from './locations';
import { mockPosts } from './posts';

export { mockLocations } from './locations';
export { mockPosts, type MockPost } from './posts';

export function getMockLocation(locationId: number) {
  return mockLocations.find((location) => location.location_id === locationId) ?? null;
}

export function getMockPostsForLocation(locationId: number) {
  return mockPosts
    .filter((post) => post.location_id === locationId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
