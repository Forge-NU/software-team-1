// Shared profile types, used by the profile API, screens, context and mocks.
import type { AmenityId } from '../constants/lookups'

export interface Profile {
  userId: string
  displayName: string | null
  email: string | null
  school: string | null
  /** When the account was created (ISO string). */
  memberSince: string | null
  savedCount: number | null
}

/** One of the user's own posts, as listed on the Profile screen. */
export interface CheckIn {
  postId: string
  locationId: number
  locationName: string
  createdAt: string
  /** Upvotes minus downvotes. */
  score: number
  /** e.g. ['Quiet', 'Silent', '1 photo'] */
  details: string[]
}

export interface Preferences {
  /** A noise level id, or null for no preference. */
  preferredNoise: number | null
  preferredAmenities: AmenityId[]
  notifySavedUpdates: boolean
}
