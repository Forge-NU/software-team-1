import { z } from 'zod'
import { supabase } from './supabase'
import { mockDb } from './mocks/profileMocks'
import { crowdLabels, noiseLabels } from './spot';

export const USE_MOCK_DATA = false

// TODO(B-2): confirm the users table's id + name columns with whoever owns B-2.
const USERS_TABLE = 'users'
const USER_ID_COL = 'user_id'
const NAME_COL = 'name'

export const MAX_NAME_LENGTH = 40

export interface Profile {
  userId: string
  displayName: string | null
  email: string | null
  school: string | null
  /** When the account was created (ISO string). */
  memberSince: string | null
  /** Null until a Saved table exists. */
  savedCount: number | null
}

export interface CheckIn {
  postId: string
  locationId: number
  locationName: string
  createdAt: string
  score: number
  /** e.g. ['Nearly empty', 'Quiet', 'Outlets', '1 photo'] */
  details: string[]
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

const SCHOOLS_BY_DOMAIN: Record<string, string> = {
  'northeastern.edu': 'Northeastern University',
}

function schoolFromEmail(email: string | null | undefined): string | null {
  const domain = email?.split('@')[1]?.toLowerCase()
  return domain ? SCHOOLS_BY_DOMAIN[domain] ?? null : null
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

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select(`${USER_ID_COL}, ${NAME_COL}`)
    .eq(USER_ID_COL, user.id)
    .maybeSingle()
  if (error) throw error

  const row = data as Record<string, unknown> | null
  return {
    userId: user.id,
    displayName: (row?.[NAME_COL] as string | null) ?? null,
    email: user.email ?? null,
    school: schoolFromEmail(user.email),
    memberSince: user.created_at ?? null,
    savedCount: null, // TODO: wire up when the Saved feature has a table
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

  const { error } = await supabase
    .from(USERS_TABLE)
    .update({ [NAME_COL]: trimmed })
    .eq(USER_ID_COL, user.id)
  if (error) throw error
  return trimmed
}

/** The user's own check-ins, newest first, with score and spot name. */
export async function getMyCheckIns(userId: string): Promise<CheckIn[]> {
  if (USE_MOCK_DATA) return [...mockDb.checkIns]

  // TODO(B-3/B-4): confirm column names once the posts table and the
  // posts_with_scores view exist, and build `details` from B-3's fields
  // (crowding, noise, amenities, photo count).
  const { data, error } = await supabase
    .from('post')
    .select('post_id, location_id, crowd_level_id, noise_level_id, created_at, location ( name ), post_photo ( count )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = (data ?? []) as unknown as MyPostRow[]

  return rows.map((row) => {
    const photos = row.post_photo?.[0]?.count ?? 0
    return {
      postId: String(row.post_id),
      locationId: Number(row.location_id),
      locationName: String(row.location?.name) ?? 'Unknown spot',
      createdAt: String(row.created_at),
      score: 0,
      details: [
        crowdLabels[row.crowd_level_id],
        row.noise_level_id ? noiseLabels[row.noise_level_id] : null,
        photos ? `${photos} photo${photos === 1 ? '' : 's'}` : null,
      ].filter((d): d is string => Boolean(d)),
    }
  })
}

// ---------- Study preferences (B-7) ----------

const PREFERENCES_TABLE = 'user_preferences'

export const AMENITIES = ['outlets', 'wifi', 'whiteboards', 'food_drinks'] as const
export type Amenity = (typeof AMENITIES)[number]

/** Onboarding's "Preferred atmosphere", as noise_level ids (seed_lookups: 2 Quiet, 4 Loud). */
export const ATMOSPHERE_NOISE_LEVEL = { quiet: 2, social: 4 } as const

const PreferencesSchema = z.object({
  /** A noise_level id, or null for no preference. */
  preferredNoise: z.number().int().min(1).max(5).nullable(),
  preferredAmenities: z.array(z.enum(AMENITIES)),
  notifySavedUpdates: z.boolean(),
})

export type Preferences = z.infer<typeof PreferencesSchema>

const NO_PREFERENCES: Preferences = { preferredNoise: null, preferredAmenities: [], notifySavedUpdates: false }

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
    preferredAmenities: (row.preferred_amenities ?? []).filter((a): a is Amenity =>
      (AMENITIES as readonly string[]).includes(a),
    ),
    notifySavedUpdates: row.notify_saved_updates,
  })
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
