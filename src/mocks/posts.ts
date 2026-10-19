import type { CrowdLevelId, NoiseLevelId } from '@/constants/lookups';

// The post table isn't in the repo's migrations yet, so this shape is a best guess.
// When src/lib/posts.ts lands, replace MockPost with its Post type and fix any fields that differ.
export interface MockPost {
  post_id: number;
  location_id: number;
  author: { user_id: string; name: string };
  body: string;
  crowd_level_id: CrowdLevelId;
  noise_level_id: NoiseLevelId | null;
  created_at: string;
  /** Same shape as VoteSummary in lib/votes.ts */
  votes: { upvotes: number; downvotes: number; score: number; myVote: 1 | -1 | null };
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const users = {
  maya: { user_id: 'mock-user-1', name: 'Maya' },
  jordan: { user_id: 'mock-user-2', name: 'Jordan' },
  priya: { user_id: 'mock-user-3', name: 'Priya' },
};

export const mockPosts: MockPost[] = [
  {
    post_id: 1,
    location_id: 1,
    author: users.maya,
    body: '2nd floor quiet zone is wide open, outlets at almost every table.',
    crowd_level_id: 2,
    noise_level_id: 1,
    created_at: minutesAgo(12),
    votes: { upvotes: 8, downvotes: 0, score: 8, myVote: null },
  },
  {
    post_id: 2,
    location_id: 1,
    author: users.jordan,
    body: 'First floor is packed with group projects, head upstairs.',
    crowd_level_id: 5,
    noise_level_id: 4,
    created_at: minutesAgo(45),
    votes: { upvotes: 5, downvotes: 1, score: 4, myVote: 1 },
  },
  {
    post_id: 3,
    location_id: 2,
    author: users.priya,
    body: 'Midterm season — every seat on 3 is taken. Basement has space.',
    crowd_level_id: 4,
    noise_level_id: 2,
    created_at: minutesAgo(30),
    votes: { upvotes: 3, downvotes: 0, score: 3, myVote: null },
  },
  {
    post_id: 4,
    location_id: 3,
    author: users.maya,
    body: 'Bates Hall is gorgeous and silent. Wifi a bit slow today.',
    crowd_level_id: 3,
    noise_level_id: 1,
    created_at: minutesAgo(90),
    votes: { upvotes: 12, downvotes: 2, score: 10, myVote: null },
  },
  {
    post_id: 5,
    location_id: 4,
    author: users.jordan,
    body: 'Music is loud but plenty of tables after the lunch rush.',
    crowd_level_id: 2,
    noise_level_id: 4,
    created_at: minutesAgo(20),
    votes: { upvotes: 1, downvotes: 1, score: 0, myVote: -1 },
  },
];
