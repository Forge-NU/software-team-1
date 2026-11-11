
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as Location from 'expo-location'
import { createPost } from './posts'
import { exploreSpots, type ExploreSpot } from './explore'
import { mockDb } from './mocks/profileMocks'
import { mockSpots } from './mocks/checkInMocks'

// Separate from profile.ts's flag so check-ins can go live on their own.
// Real posting needs a signed-in user (F-1) since createPost() checks auth.
export const USE_MOCK_CHECK_INS = true

// ---------- Types ----------

export type Crowding = 'nearly_empty' | 'some_seats' | 'busy'
export type Noise = 'quiet' | 'moderate' | 'loud'

// The Figma has 3 options each; the database has 5 levels.
// TODO: Confirm this mapping with the team.
export const CROWDING_OPTIONS: {
  value: Crowding
  label: string
  dbId: number
}[] = [
    { value: 'nearly_empty', label: 'Nearly empty', dbId: 1 },
    { value: 'some_seats', label: 'Some seats', dbId: 3 },
    { value: 'busy', label: 'Busy', dbId: 4 },
  ]

export const NOISE_OPTIONS: {
  value: Noise
  label: string
  dbId: number
}[] = [
    { value: 'quiet', label: 'Quiet', dbId: 2 },
    { value: 'moderate', label: 'Moderate', dbId: 3 },
    { value: 'loud', label: 'Loud', dbId: 4 },
  ]

export const crowdingDbId = (v: Crowding) =>
  CROWDING_OPTIONS.find((o) => o.value === v)!.dbId

export const noiseDbId = (v: Noise) =>
  NOISE_OPTIONS.find((o) => o.value === v)!.dbId

export const crowdingLabel = (v: Crowding) =>
  CROWDING_OPTIONS.find((o) => o.value === v)!.label

export const noiseLabel = (v: Noise) =>
  NOISE_OPTIONS.find((o) => o.value === v)!.label

/**
 * A spot to check in at.
 * Search returns locations, so seatingId can be null.
 */
export interface SpotSummary {
  seatingId?: number | null
  locationId: number
  name: string
  locationName?: string | null

  // Latest status from a recent post
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

  // When the conditions applied
  appliesAt: string
}

export interface PostedCheckIn extends CheckInDraft {
  postId: string
  postedAt: string
}

// ---------- Search ----------

// Used when location permission is denied or unavailable.
const FALLBACK_ORIGIN = {
  latitude: 42.3398,
  longitude: -71.0892,
}

const SEARCH_RADIUS_METERS = 5000
const WALKING_METERS_PER_MINUTE = 80

export interface SearchOrigin {
  latitude: number
  longitude: number

  // True when we couldn't get the user's actual location.
  isFallback: boolean
}

// Accept a recent cached location to keep search fast.
const MAX_POSITION_AGE_MS = 60_000

/**
 * Get the user's current location.
 *
 * If permission is denied or location isn't available,
 * use campus coordinates as a fallback.
 *
 * Walking times stay hidden when using the fallback.
 */
export async function getSearchOrigin(): Promise<SearchOrigin> {
  try {
    // Check whether location permission is already granted.
    const existingPermission =
      await Location.getForegroundPermissionsAsync()

    let granted = existingPermission.granted

    // Ask for permission if it hasn't been granted yet.
    if (!granted && existingPermission.canAskAgain) {
      const permission =
        await Location.requestForegroundPermissionsAsync()

      granted = permission.granted
    }

    if (granted) {
      // Try using a recent location first.
      let position = await Location.getLastKnownPositionAsync({
        maxAge: MAX_POSITION_AGE_MS,
      })

      // If there's no recent location, get a new one.
      if (!position) {
        position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
      }

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        isFallback: false,
      }
    }
  } catch (error) {
    console.warn(
      'Could not get location, using campus fallback:',
      error
    )
  }

  // Search still works without location permission.
  return {
    ...FALLBACK_ORIGIN,
    isFallback: true,
  }
}

/**
 * Convert crowd level IDs to readable labels.
 */
function crowdStatus(
  id: number | null
): {
  label: string
  tone: 'highlight' | 'neutral'
} | null {
  if (id == null) return null

  if (id <= 2) {
    return {
      label: 'Nearly empty',
      tone: 'neutral',
    }
  }

  if (id === 3) {
    return {
      label: 'Some seats',
      tone: 'neutral',
    }
  }

  if (id === 4) {
    return {
      label: 'Busy',
      tone: 'highlight',
    }
  }

  return {
    label: 'Packed',
    tone: 'highlight',
  }
}

/**
 * Convert an Explore spot to a reusable search result.
 */
function toSpotSummary(
  spot: ExploreSpot,
  origin: SearchOrigin
): SpotSummary {
  // Only show crowd and noise if the post is recent.
  const status = spot.is_current
    ? crowdStatus(spot.crowd_level_id)
    : null

  return {
    locationId: spot.location_id,
    seatingId: null,
    name: spot.name,

    status: status?.label ?? null,
    statusTone: status?.tone,

    reportedAt: spot.is_current
      ? spot.last_updated_at
      : null,

    noiseLabel: spot.is_current
      ? spot.noise_level
      : null,

    // Don't show misleading walk times from fallback coordinates.
    walkMinutes: origin.isFallback
      ? null
      : Math.max(
        1,
        Math.round(
          spot.distance_meters / WALKING_METERS_PER_MINUTE
        )
      ),
  }
}

/**
 * Search spots by name.
 */
export async function searchSpots(
  query: string,
  origin: SearchOrigin
): Promise<SpotSummary[]> {
  const q = query.trim()

  if (!q) return []

  // Use mock spots while mock check-ins are enabled.
  if (USE_MOCK_CHECK_INS) {
    const lower = q.toLowerCase()

    return mockSpots.filter((spot) =>
      spot.name.toLowerCase().includes(lower)
    )
  }

  const spots = await exploreSpots({
    latitude: origin.latitude,
    longitude: origin.longitude,
    radiusMeters: SEARCH_RADIUS_METERS,
    search: q,
    sort: 'distance',
    limit: 20,
  })

  return spots.map((spot) =>
    toSpotSummary(spot, origin)
  )
}

// ---------- Photos ----------

const MAX_PHOTO_WIDTH = 1280
const JPEG_QUALITY = 0.7

/**
 * Shrinks and re-encodes a photo so uploads stay small.
 */
export async function compressPhoto(
  photo: CheckInPhoto
): Promise<CheckInPhoto> {
  const context = ImageManipulator.manipulate(photo.uri)

  if (photo.width && photo.width > MAX_PHOTO_WIDTH) {
    context.resize({
      width: MAX_PHOTO_WIDTH,
    })
  }

  const image = await context.renderAsync()

  const result = await image.saveAsync({
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  })

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  }
}

// ---------- Submit ----------

// Set to 1 to make every mock submit fail.
const MOCK_FAILURE_RATE = 0

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Uploads the compressed photo and creates the post.
 *
 * onProgress receives a value between 0 and 1.
 *
 * Note: posts don't currently store outlets or custom
 * appliesAt times.
 */
export async function submitCheckIn(
  draft: CheckInDraft,
  onProgress: (fraction: number) => void
): Promise<PostedCheckIn> {
  if (USE_MOCK_CHECK_INS) {
    for (const progress of [0.15, 0.4, 0.65, 0.85]) {
      await wait(250)
      onProgress(progress)
    }

    if (Math.random() < MOCK_FAILURE_RATE) {
      throw new Error('Mock upload failed')
    }

    onProgress(1)

    const posted: PostedCheckIn = {
      ...draft,
      postId: `mock-${Date.now()}`,
      postedAt: new Date().toISOString(),
    }

    // Add the check-in to the mock profile data.
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

  // CreatePost doesn't have a progress callback,
  // so update progress in stages.
  onProgress(0.1)

  const file = await fetch(draft.photo.uri)
  const data = await file.arrayBuffer()

  onProgress(0.3)

  const postId = await createPost({
    locationId: draft.location.locationId,
    seatingId: draft.location.seatingId ?? null,
    crowdLevelId: crowdingDbId(draft.crowding),
    noiseLevelId: noiseDbId(draft.noise),
    caption: draft.note || null,

    // compressPhoto always outputs JPEG.
    photos: [
      {
        data,
        contentType: 'image/jpeg',
      },
    ],
  })

  onProgress(1)

  return {
    ...draft,
    postId: String(postId),
    postedAt: new Date().toISOString(),
  }
}
