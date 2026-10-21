import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { supabase } from './supabase'
import { USE_MOCK_DATA } from './profile'
import { mockDb } from './mocks/profileMocks'
import { mockSpots } from './mocks/checkInMocks'

// ---------- Types ----------

export type Crowding = 'nearly_empty' | 'some_seats' | 'busy'
export type Noise = 'quiet' | 'moderate' | 'loud'

// The Figma has 3 options each; the database (seed_lookups.sql) has 5 levels.
// `dbId` is the crowd_level_id / noise_level_id each chip saves as.
// TODO: confirm this mapping with the team (crowd 2 "Quiet" and 5 "Packed",
// and noise 1 "Silent" and 5 "Very loud", are unused for now).
export const CROWDING_OPTIONS: { value: Crowding; label: string; dbId: number }[] = [
  { value: 'nearly_empty', label: 'Nearly empty', dbId: 1 }, // Empty
  { value: 'some_seats', label: 'Some seats', dbId: 3 }, // Moderate
  { value: 'busy', label: 'Busy', dbId: 4 }, // Busy
]

export const NOISE_OPTIONS: { value: Noise; label: string; dbId: number }[] = [
  { value: 'quiet', label: 'Quiet', dbId: 2 }, // Quiet
  { value: 'moderate', label: 'Moderate', dbId: 3 }, // Moderate
  { value: 'loud', label: 'Loud', dbId: 4 }, // Loud
]

export const crowdingDbId = (v: Crowding) => CROWDING_OPTIONS.find((o) => o.value === v)!.dbId
export const noiseDbId = (v: Noise) => NOISE_OPTIONS.find((o) => o.value === v)!.dbId

export const crowdingLabel = (v: Crowding) => CROWDING_OPTIONS.find((o) => o.value === v)!.label
export const noiseLabel = (v: Noise) => NOISE_OPTIONS.find((o) => o.value === v)!.label

/**
 * A "spot" is a seating_area (e.g. "Curry Study Room 201") inside a
 * location (e.g. "Curry Student Center"). Check-ins attach to the seating area.
 */
export interface SpotSummary {
  seatingId: number
  locationId: number
  name: string
  locationName?: string | null
  /** Latest status, e.g. "Busy". Null until B-5 provides it. */
  status?: string | null
  statusTone?: 'highlight' | 'neutral'
  reportedAt?: string | null
  noiseLabel?: string | null
  outlets?: boolean
  walkMinutes?: number | null
}

export interface CheckInPhoto {
  uri: string
  width?: number
  height?: number
}

export interface CheckInDraft {
  location: SpotSummary
  photo: CheckInPhoto
  crowding: Crowding
  noise: Noise
  outlets: boolean
  note: string
  /** When the conditions applied. Defaults to the moment of posting. */
  appliesAt: string
}

export interface PostedCheckIn extends CheckInDraft {
  postId: string
  postedAt: string
}

// ---------- Search ----------

export async function searchSpots(query: string): Promise<SpotSummary[]> {
  const q = query.trim()
  if (!q) return []

  if (USE_MOCK_DATA) {
    const lower = q.toLowerCase()
    return mockSpots.filter((s) => s.name.toLowerCase().includes(lower))
  }

  // Search seating areas by name. TODO: also match on the location's name
  // (e.g. typing "Curry" should find every seating area in Curry Student Center).
  const { data, error } = await supabase
    .from('seating_area')
    .select('seating_id, location_id, name, location ( name )')
    .ilike('name', `%${q.replace(/[%_]/g, '')}%`)
    .order('name')
    .limit(20)
  if (error) throw error

  return (data ?? []).map((row: any) => ({
    seatingId: row.seating_id,
    locationId: row.location_id,
    name: row.name,
    locationName: row.location?.name ?? null,
  }))
}

// ---------- Photos ----------

const MAX_PHOTO_WIDTH = 1280
const JPEG_QUALITY = 0.7

/** Shrinks and re-encodes a photo so uploads stay small and fast. */
export async function compressPhoto(photo: CheckInPhoto): Promise<CheckInPhoto> {
  const context = ImageManipulator.manipulate(photo.uri)
  if (photo.width && photo.width > MAX_PHOTO_WIDTH) {
    context.resize({ width: MAX_PHOTO_WIDTH })
  }
  const image = await context.renderAsync()
  const result = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG })
  return { uri: result.uri, width: result.width, height: result.height }
}

// ---------- Submit ----------

// Set to 1 to make every mock submit fail, to test the retry flow.
const MOCK_FAILURE_RATE = 0

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Uploads the (already compressed) photo and creates the post.
 * onProgress receives 0–1.
 */
export async function submitCheckIn(
  draft: CheckInDraft,
  onProgress: (fraction: number) => void
): Promise<PostedCheckIn> {
  if (USE_MOCK_DATA) {
    for (const p of [0.15, 0.4, 0.65, 0.85]) {
      await wait(250)
      onProgress(p)
    }
    if (Math.random() < MOCK_FAILURE_RATE) throw new Error('Mock upload failed')
    onProgress(1)

    const posted: PostedCheckIn = {
      ...draft,
      postId: `mock-${Date.now()}`,
      postedAt: new Date().toISOString(),
    }
    // So the new check-in shows up on the Profile screen too.
    mockDb.checkIns.unshift({
      postId: posted.postId,
      locationId: draft.location.locationId,
      locationName: draft.location.name,
      createdAt: posted.postedAt,
      score: 0,
      details: [
        crowdingLabel(draft.crowding),
        noiseLabel(draft.noise),
        ...(draft.outlets ? ['Outlets'] : []),
        '1 photo',
      ],
    })
    return posted
  }

  // TODO(B-3): the check_in table exists, but it has no columns for outlets,
  // the note, or a photo, and there's no photo storage bucket yet. Once B-3
  // adds those, the real submit is roughly:
  //   1. upload draft.photo.uri to the storage bucket (report progress)
  //   2. insert into photo (seating_id, image_url)
  //   3. insert into check_in (seating_id, crowd_level_id, noise_level_id,
  //      checked_in_at) using crowdingDbId(draft.crowding),
  //      noiseDbId(draft.noise) and draft.appliesAt, plus the new columns
  //   4. return the created check-in
  throw new Error('Posting isn’t connected yet. It needs B-3 (photo storage + check-in fields).')
}
