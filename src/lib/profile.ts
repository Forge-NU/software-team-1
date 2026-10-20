import { supabase } from './supabase'
import { mockDb } from './mocks/profileMocks'

// Flip to false once B-2 (users/auth) and B-3 (posts) are merged.
export const USE_MOCK_DATA = true

// TODO(B-2): confirm the users table's id + name columns with whoever owns B-2.
const USERS_TABLE = 'users'
const USER_ID_COL = 'user_id'
const NAME_COL = 'display_name'

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
  if (USE_MOCK_DATA) return { ...mockProfile }

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
    mockProfile = { ...mockProfile, displayName: trimmed }
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
  if (USE_MOCK_DATA) return [...mockCheckIns]

  // TODO(B-3/B-4): confirm column names once the posts table and the
  // posts_with_scores view exist, and build `details` from B-3's fields
  // (crowding, noise, amenities, photo count).
  const { data, error } = await supabase
    .from('posts_with_scores')
    .select('post_id, location_id, created_at, score, location ( name )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map((row: any) => ({
    postId: String(row.post_id),
    locationId: row.location_id,
    locationName: row.location?.name ?? 'Unknown spot',
    createdAt: row.created_at,
    score: row.score ?? 0,
    details: [],
  }))
}

export async function signOut(): Promise<void> {
  if (USE_MOCK_DATA) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
