import type { CrowdLevelId, NoiseLevelId } from '@/constants/lookups';
import type { Post } from '@/lib/posts';

// Shaped exactly like getPostsForLocation() results, so swapping mocks for real data is a one-line change.
// Every post has at least one photo, like real posts. Photo URLs are stable placeholder images.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const photo = (photoId: number, createdAt: string) => ({
  photo_id: photoId,
  storage_path: `mock/${photoId}.jpg`,
  url: `https://picsum.photos/seed/spotted-${photoId}/800/600`,
  created_at: createdAt,
});

interface MockPostInput {
  post_id: number;
  location_id: number;
  author_name: string;
  crowd_level_id: CrowdLevelId;
  noise_level_id: NoiseLevelId | null;
  caption: string | null;
  minutes_ago: number;
  photo_count?: number;
}

function mockPost({ minutes_ago, photo_count = 1, ...post }: MockPostInput): Post {
  const created_at = minutesAgo(minutes_ago);
  return {
    ...post,
    user_id: `mock-user-${post.author_name.toLowerCase()}`,
    seating_id: null,
    wifi_mbps: null,
    created_at,
    photos: Array.from({ length: photo_count }, (_, i) => photo(post.post_id * 10 + i, created_at)),
  };
}

export const mockPosts: Post[] = [
  mockPost({ post_id: 1, location_id: 1, author_name: 'Maya', crowd_level_id: 2, noise_level_id: 1, minutes_ago: 12, photo_count: 2,
    caption: '2nd floor quiet zone is wide open, outlets at almost every table.' }),
  mockPost({ post_id: 2, location_id: 1, author_name: 'Jordan', crowd_level_id: 5, noise_level_id: 4, minutes_ago: 45,
    caption: 'First floor is packed with group projects, head upstairs.' }),
  mockPost({ post_id: 3, location_id: 2, author_name: 'Priya', crowd_level_id: 4, noise_level_id: 2, minutes_ago: 30,
    caption: 'Midterm season — every seat on 3 is taken. Basement has space.' }),
  mockPost({ post_id: 4, location_id: 3, author_name: 'Maya', crowd_level_id: 3, noise_level_id: 1, minutes_ago: 90,
    caption: 'Bates Hall is gorgeous and silent. Wifi a bit slow today.' }),
  mockPost({ post_id: 5, location_id: 4, author_name: 'Jordan', crowd_level_id: 2, noise_level_id: 4, minutes_ago: 20,
    caption: 'Music is loud but plenty of tables after the lunch rush.' }),
  // Older than the 90-minute "recent" window, for testing stale-status handling
  mockPost({ post_id: 6, location_id: 5, author_name: 'Priya', crowd_level_id: 2, noise_level_id: 2, minutes_ago: 240,
    caption: null }),
];
