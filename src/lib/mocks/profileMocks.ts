import type { CheckIn, Profile } from '../profile'
 
// Mock data for the Profile screen, used while USE_MOCK_DATA is true in
// src/lib/profile.ts. Delete this file once B-2 and B-3 are live.
 
function yesterdayAt(h: number, m: number) {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}
 
/** Mutable so renames persist while the app is running. */
export const mockDb: { profile: Profile; checkIns: CheckIn[] } = {
  profile: {
    userId: 'mock-user',
    displayName: 'Angel El Moucary',
    email: 'moucary.angel@northeastern.edu',
    school: 'Northeastern University',
    memberSince: '2026-10-01T12:00:00',
    savedCount: 1,
  },
  checkIns: [
    {
      postId: 'p1',
      locationId: 1,
      locationName: 'Curry Study Room 201',
      createdAt: yesterdayAt(11, 56),
      score: 4,
      details: ['Nearly empty', 'Quiet', 'Outlets', '1 photo'],
    },
    {
      postId: 'p2',
      locationId: 2,
      locationName: 'Snell 3rd floor',
      createdAt: new Date(2026, 9, 2, 14, 10).toISOString(),
      score: 2,
      details: ['Some seats', 'Quiet', 'Outlets'],
    },
    {
      postId: 'p3',
      locationId: 3,
      locationName: 'Law Library',
      createdAt: new Date(2026, 9, 1, 16, 25).toISOString(),
      score: 0,
      details: ['Busy', 'Moderate', 'Outlets'],
    },
  ],
}
