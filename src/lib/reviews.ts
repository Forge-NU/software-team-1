import { supabase } from './supabase'

const BUCKET = 'review-photos'
const SIGNED_URL_SECONDS = 60 * 60

const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
}

export interface ReviewPhoto {
  photo_id: number
  storage_path: string
  url: string | null
  created_at: string
}

export interface Review {
  review_id: number
  user_id: string
  seating_id: number
  overall_rating: number
  noise_rating: number | null
  wifi_rating: number | null
  comfort_rating: number | null
  comment: string | null
  created_at: string
  photos: ReviewPhoto[]
}

export interface ReviewPhotoInput {
  data: Blob | ArrayBuffer
  contentType: string
}

export interface CreateReviewInput {
  seatingId: number
  overallRating: number
  noiseRating?: number | null
  wifiRating?: number | null
  comfortRating?: number | null
  comment?: string | null
  /** Omit or pass an empty array for a review with no photos. */
  photos?: ReviewPhotoInput[]
}

interface ReviewRow {
  review_id: number
  user_id: string
  seating_id: number
  overall_rating: number
  noise_rating: number | null
  wifi_rating: number | null
  comfort_rating: number | null
  comment: string | null
  created_at: string
  review_photo: { photo_id: number; storage_path: string; created_at: string }[]
}

const REVIEW_SELECT = `
  review_id, user_id, seating_id, overall_rating, noise_rating, wifi_rating, comfort_rating, comment, created_at,
  review_photo ( photo_id, storage_path, created_at )
`

function extensionFor(contentType: string): string {
  const extension = PHOTO_TYPES[contentType]
  if (!extension) throw new Error('Photos must be jpeg, png, webp, or heic.')
  return extension
}

async function signedUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  if (paths.length === 0) return urls

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS)
  if (error) throw error

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
  }
  return urls
}

function mapReview(row: ReviewRow, urls: Map<string, string>): Review {
  return {
    review_id: row.review_id,
    user_id: row.user_id,
    seating_id: row.seating_id,
    overall_rating: row.overall_rating,
    noise_rating: row.noise_rating,
    wifi_rating: row.wifi_rating,
    comfort_rating: row.comfort_rating,
    comment: row.comment,
    created_at: row.created_at,
    photos: (row.review_photo ?? []).map((photo) => ({
      photo_id: photo.photo_id,
      storage_path: photo.storage_path,
      url: urls.get(photo.storage_path) ?? null,
      created_at: photo.created_at,
    })),
  }
}

/** Saves a review. Photos are optional; failed uploads or attach roll back the review row. */
export async function createReview(input: CreateReviewInput): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to leave a review.')

  const photos = input.photos ?? []
  const uploaded: string[] = []
  let reviewId: number | null = null

  try {
    for (const photo of photos) {
      const path = `${user.id}/${crypto.randomUUID()}.${extensionFor(photo.contentType)}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, photo.data, {
        contentType: photo.contentType,
        upsert: false,
      })
      if (error) throw error
      uploaded.push(path)
    }

    const { data, error } = await supabase
      .from('review')
      .insert({
        seating_id: input.seatingId,
        overall_rating: input.overallRating,
        noise_rating: input.noiseRating ?? null,
        wifi_rating: input.wifiRating ?? null,
        comfort_rating: input.comfortRating ?? null,
        comment: input.comment ?? null,
      })
      .select('review_id')
      .single()
    if (error) throw error
    const id = data.review_id
    reviewId = id

    if (uploaded.length > 0) {
      const { error: attachError } = await supabase.rpc('attach_review_photos', {
        p_review_id: id,
        p_photo_paths: uploaded,
      })
      if (attachError) throw attachError
    }

    return id
  } catch (err) {
    if (reviewId !== null) {
      await supabase.from('review').delete().eq('review_id', reviewId)
    }
    if (uploaded.length > 0) await supabase.storage.from(BUCKET).remove(uploaded)
    throw err
  }
}

export async function getReviewsForSeating(seatingId: number): Promise<Review[]> {
  const { data, error } = await supabase
    .from('review')
    .select(REVIEW_SELECT)
    .eq('seating_id', seatingId)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'review_photo', ascending: true })
  if (error) throw error

  const rows = (data ?? []) as unknown as ReviewRow[]
  const urls = await signedUrls(rows.flatMap((row) => (row.review_photo ?? []).map((p) => p.storage_path)))
  return rows.map((row) => mapReview(row, urls))
}
