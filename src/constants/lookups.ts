// Labels for lookup ids, matching supabase/migrations/20261007013100_seed_lookups.sql.
// Update both together if the seed changes.

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

export const PRICE_RANGES = {
  0: 'Free',
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
} as const;

export type CrowdLevelId = keyof typeof CROWD_LEVELS;
export type NoiseLevelId = keyof typeof NOISE_LEVELS;
export type PriceRangeId = keyof typeof PRICE_RANGES;
