import { z } from 'zod'
import { supabase } from './supabase'
import { mockDb } from './mocks/profileMocks'
import { crowdLabels, noiseLabels } from './spot'
import { AMENITIES, AmenityId } from '../constants/lookups'
import type { CheckIn, Preferences, Profile } from '../types/profile'

// Set to true to run the Profile and Settings screens against ./mocks/profileMocks instead of Supabase.
export const USE_MOCK_DATA = false

export const MAX_NAME_LENGTH = 40

const SCHOOLS_BY_DOMAIN: Record<string, string> = {
  'northeastern.edu': 'Northeastern University',
}

function schoolFromEmail(email: string | null | undefined): string | null {
  const domain = email?.split('@')[1]?.toLowerCase()
  return domain ? SCHOOLS_BY_DOMAIN[domain] ?? null : null
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// ---------- API ----------

function validateName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error('Enter a name.')
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`Names can be up to ${MAX_NAME_LENGTH} characters.`)
  }
  return trimmed
}

/** Returns null when nobody is signed in. */
export async function getMyProfile(): Promise<Profile | null> {
  if (USE_MOCK_DATA) return { ...mockDb.profile }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [userResult, savedResult] = await Promise.all([
    supabase.from('users').select('name').eq('user_id', user.id).maybeSingle(),
    // RLS limits saved_spot to the caller's own rows
    supabase.from('saved_spot').select('location_id', { count: 'exact', head: true }),
  ])
  if (userResult.error) throw userResult.error
  if (savedResult.error) throw savedResult.error

  return {
    userId: user.id,
    displayName: userResult.data?.name ?? null,
    email: user.email ?? null,
    school: schoolFromEmail(user.email),
    memberSince: user.created_at ?? null,
    savedCount: savedResult.count ?? 0,
  }
}

export async function updateDisplayName(name: string): Promise<string> {
  const trimmed = validateName(name)

  if (USE_MOCK_DATA) {
    mockDb.profile = { ...mockDb.profile, displayName: trimmed }
    return trimmed
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You are signed out. Sign in again to continue.')

  const { error } = await supabase.from('users').update({ name: trimmed }).eq('user_id', user.id)
  if (error) throw error
  return trimmed
}

interface MyPostRow {
  post_id: number
  location_id: number
  crowd_level_id: number
  noise_level_id: number | null
  created_at: string
  location: { name: string } | null
  post_photo: { count: number }[]
}

/** The user's own posts, newest first, with vote score and spot name. */
export async function getMyCheckIns(userId: string): Promise<CheckIn[]> {
  if (USE_MOCK_DATA) return [...mockDb.checkIns]

  const { data, error } = await supabase
    .from('post')
    .select(`
      post_id, location_id, crowd_level_id, noise_level_id, created_at,
      location!post_location_id_fkey ( name ),
      post_photo ( count )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = (data ?? []) as unknown as MyPostRow[]
  if (rows.length === 0) return []

  const { data: votes, error: votesError } = await supabase
    .from('post_vote_summary')
    .select('post_id, vote_score')
    .in('post_id', rows.map((row) => row.post_id))
  if (votesError) throw votesError
  const scores = new Map((votes ?? []).map((v) => [v.post_id as number, v.vote_score as number]))

  return rows.map((row) => {
    const photos = row.post_photo[0]?.count ?? 0
    return {
      postId: String(row.post_id),
      locationId: row.location_id,
      locationName: row.location?.name ?? 'Unknown spot',
      createdAt: row.created_at,
      score: scores.get(row.post_id) ?? 0,
      details: [
        crowdLabels[row.crowd_level_id],
        row.noise_level_id != null ? noiseLabels[row.noise_level_id] : undefined,
        photos > 0 ? plural(photos, 'photo') : undefined,
      ].filter((d): d is string => Boolean(d)),
    }
  })
}

// ---------- Study preferences (B-7) ----------

const PREFERENCES_TABLE = 'user_preferences'

const AMENITY_IDS = Object.keys(AMENITIES) as [AmenityId, ...AmenityId[]]

const PreferencesSchema = z.object({
  preferredNoise: z.number().int().min(1).max(5).nullable(),
  preferredAmenities: z.array(z.enum(AMENITY_IDS)),
  notifySavedUpdates: z.boolean(),
}) satisfies z.ZodType<Preferences>

export const NO_PREFERENCES: Preferences = { preferredNoise: null, preferredAmenities: [], notifySavedUpdates: false }

let mockPreferences: Preferences = { ...NO_PREFERENCES }

interface PreferencesRow {
  preferred_noise: number | null
  preferred_amenities: string[] | null
  notify_saved_updates: boolean
}

function fromRow(row: PreferencesRow): Preferences {
  return PreferencesSchema.parse({
    preferredNoise: row.preferred_noise,
    // Drop values this app version doesn't know, so a new amenity added later can't break reads
    preferredAmenities: (row.preferred_amenities ?? []).filter((a): a is AmenityId => Object.hasOwn(AMENITIES, a)),
    notifySavedUpdates: row.notify_saved_updates,
  })
}

/** A short summary like "Quiet · Outlets · Wi-Fi", or null when nothing is set. */
export function summarizePreferences(prefs: Preferences): string | null {
  const parts = [
    prefs.preferredNoise != null ? noiseLabels[prefs.preferredNoise] : undefined,
    ...prefs.preferredAmenities.map((a) => AMENITIES[a]),
  ].filter((p): p is string => Boolean(p))
  return parts.length > 0 ? parts.join(' · ') : null
}

/** The signed-in user's preferences. A new user has none, which is not an error. */
export async function getPreferences(): Promise<Preferences> {
  if (USE_MOCK_DATA) return { ...mockPreferences }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You are signed out. Sign in again to continue.')

  const { data, error } = await supabase
    .from(PREFERENCES_TABLE)
    .select('preferred_noise, preferred_amenities, notify_saved_updates')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  return data ? fromRow(data as PreferencesRow) : { ...NO_PREFERENCES }
}

/**
 * Saves only the fields passed in (e.g. just the Settings notification toggle),
 * and returns the full saved preferences.
 */
export async function updatePreferences(changes: Partial<Preferences>): Promise<Preferences> {
  const valid = PreferencesSchema.partial().parse(changes)

  if (USE_MOCK_DATA) {
    mockPreferences = { ...mockPreferences, ...valid }
    return { ...mockPreferences }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You are signed out. Sign in again to continue.')

  const row: Record<string, unknown> = { user_id: user.id }
  if (valid.preferredNoise !== undefined) row.preferred_noise = valid.preferredNoise
  if (valid.preferredAmenities !== undefined) row.preferred_amenities = valid.preferredAmenities
  if (valid.notifySavedUpdates !== undefined) row.notify_saved_updates = valid.notifySavedUpdates

  // Creates the row on first save; afterwards only the columns sent here change
  const { data, error } = await supabase
    .from(PREFERENCES_TABLE)
    .upsert(row, { onConflict: 'user_id' })
    .select('preferred_noise, preferred_amenities, notify_saved_updates')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Your preferences weren’t saved. Try again.')
  return fromRow(data as PreferencesRow)
}

export async function signOut(): Promise<void> {
  if (USE_MOCK_DATA) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
