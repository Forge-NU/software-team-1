import { supabase } from './supabase'
import { type SavedSpot, type SavedSpotRow, toSavedSpots } from './savedSpotRows'

export type { SavedSpot } from './savedSpotRows'

const SAVED_SELECT = `
  created_at,
  location (
    location_id, name, location_type, campus, latitude, longitude,
    address ( street_one, city ),
    post ( created_at, crowd_level_id, noise_level_id, crowd_level ( label ), noise_level ( label ) )
  )
`

async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to save spots.')
  return user.id
}

/** Bookmarks a spot. Saving one that's already saved is a no-op, not an error. */
export async function saveSpot(locationId: number): Promise<void> {
  const userId = await currentUserId()
  const { error } = await supabase
    .from('saved_spot')
    .upsert(
      { user_id: userId, location_id: locationId },
      { onConflict: 'user_id,location_id', ignoreDuplicates: true },
    )
  if (error) throw error
}

/** Removes a bookmark. Removing one that isn't saved is a no-op. */
export async function unsaveSpot(locationId: number): Promise<void> {
  const userId = await currentUserId()
  const { error } = await supabase
    .from('saved_spot')
    .delete()
    .eq('user_id', userId)
    .eq('location_id', locationId)
  if (error) throw error
}

/**
 * The user's saved spots, most recently saved first, each with its latest
 * report and that report's time (freshness). One request, however many spots.
 */
export async function listSavedSpots(now: Date = new Date()): Promise<SavedSpot[]> {
  const userId = await currentUserId()
  const { data, error } = await supabase
    .from('saved_spot')
    .select(SAVED_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    // Only the latest post per location is needed.
    .order('created_at', { referencedTable: 'location.post', ascending: false })
    .limit(1, { referencedTable: 'location.post' })
  if (error) throw error
  return toSavedSpots((data ?? []) as unknown as SavedSpotRow[], now)
}

/** Whether the user has saved this spot, for the bookmark button's state. */
export async function isSpotSaved(locationId: number): Promise<boolean> {
  const userId = await currentUserId()
  const { count, error } = await supabase
    .from('saved_spot')
    .select('location_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('location_id', locationId)
  if (error) throw error
  return (count ?? 0) > 0
}
