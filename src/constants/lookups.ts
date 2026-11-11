// Labels for lookup ids. Posts from src/lib/posts.ts only carry the ids, so screens map them here.
// Must match supabase/migrations/20261007013100_seed_lookups.sql; update both together.
// These are seeded rows, not types, so `supabase gen types` can't generate them.

export const CROWD_LEVELS = {
  1: 'Empty',
  2: 'Quiet',
  3: 'Moderate',
  4: 'Busy',
  5: 'Packed',
} as const;

export const NOISE_LEVELS = {
  1: 'Silent',
  2: 'Quiet',
  3: 'Moderate',
  4: 'Loud',
  5: 'Very loud',
} as const;

export const OUTLET_LEVELS = {
  0: 'None',
  1: 'Few',
  2: 'Some',
  3: 'Plenty',
} as const;

export const PHONE_POLICIES = {
  0: 'No Phone Calls Allowed',
  1: 'Quiet Phone Calls Only',
  2: 'Phone Calls Allowed',
} as const;

export const PRICE_RANGES = {
  0: 'Free',
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
} as const;

// Study preference amenities. Must match the check on user_preferences.preferred_amenities in
// supabase/migrations/20261104120000_study_preferences.sql; there's no lookup table for these.
export const AMENITIES = {
  outlets: 'Outlets',
  wifi: 'Wi-Fi',
  whiteboards: 'Whiteboards',
  food_drinks: 'Food & drinks',
} as const;

/** Onboarding's "Preferred atmosphere", as noise level ids (Quiet and Loud). */
export const ATMOSPHERE_NOISE_LEVEL = { quiet: 2, social: 4 } as const satisfies Record<string, NoiseLevelId>;

export type CrowdLevelId = keyof typeof CROWD_LEVELS;
export type AmenityId = keyof typeof AMENITIES;
export type NoiseLevelId = keyof typeof NOISE_LEVELS;
export type OutletLevelId = keyof typeof OUTLET_LEVELS;
export type PhonePolicyId = keyof typeof PHONE_POLICIES;
export type PriceRangeId = keyof typeof PRICE_RANGES;
