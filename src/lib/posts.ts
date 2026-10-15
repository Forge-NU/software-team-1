import { supabase } from './supabase'

const BUCKET = 'post-photos'
const RECENT_PHOTO_LIMIT = 24
const SIGNED_URL_SECONDS = 60 * 60

const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
}

export interface PostPhoto {
  photo_id: number
  storage_path: string
  url: string
  created_at: string
}

export interface Post {
  post_id: number
  user_id: string
  location_id: number
  seating_id: number | null
  crowd_level_id: number
  noise_level_id: number | null
  wifi_mbps: number | null
  caption: string | null
  created_at: string
  author_name: string
  photos: PostPhoto[]
}

export interface RecentPhoto {
  photo_id: number
  post_id: number
  url: string
  created_at: string
}

export interface CreatePostPhoto {
  data: Blob | ArrayBuffer
  contentType: string
}

export interface CreatePostInput {
  locationId: number
  seatingId?: number | null
  crowdLevelId: number
  noiseLevelId?: number | null
  wifiMbps?: number | null
  caption?: string | null
  photos: CreatePostPhoto[]
}

interface PostRow {
  post_id: number
  user_id: string
  location_id: number
  seating_id: number | null
  crowd_level_id: number
  noise_level_id: number | null
  wifi_mbps: number | null
  caption: string | null
  created_at: string
  users: { name: string } | null
  post_photo: { photo_id: number; storage_path: string; created_at: string }[]
}

interface RecentPhotoRow {
  photo_id: number
  post_id: number
  storage_path: string
  created_at: string
}

const POST_SELECT = `
  post_id, user_id, location_id, seating_id, crowd_level_id, noise_level_id, wifi_mbps, caption, created_at,
  users ( name ),
  post_photo ( photo_id, storage_path, created_at )
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
    if (!item.path || !item.signedUrl) throw new Error(item.error ?? 'Could not sign photo URL')
    urls.set(item.path, item.signedUrl)
  }
  for (const path of paths) {
    if (!urls.has(path)) throw new Error('Could not sign photo URL')
  }
  return urls
}

/** Uploads the photos, then saves the post. A failed upload never writes a post. */
export async function createPost(input: CreatePostInput): Promise<number> {
  if (input.photos.length < 1) throw new Error('A post needs at least one photo.')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to post.')

  const uploaded: string[] = []
  try {
    for (const photo of input.photos) {
      const path = `${user.id}/${crypto.randomUUID()}.${extensionFor(photo.contentType)}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, photo.data, {
        contentType: photo.contentType,
        upsert: false,
      })
      if (error) throw error
      uploaded.push(path)
    }

    const { data, error } = await supabase.rpc('create_post', {
      p_location_id: input.locationId,
      p_seating_id: input.seatingId ?? null,
      p_crowd_level_id: input.crowdLevelId,
      p_noise_level_id: input.noiseLevelId ?? null,
      p_wifi_mbps: input.wifiMbps ?? null,
      p_caption: input.caption ?? null,
      p_photo_paths: uploaded,
    })
    if (error) throw error
    return Number(data)
  } catch (err) {
    if (uploaded.length > 0) await supabase.storage.from(BUCKET).remove(uploaded)
    throw err
  }
}

/** Newest first, with a signed URL for each photo and the author's display name. */
export async function getPostsForLocation(locationId: number): Promise<Post[]> {
  const { data, error } = await supabase
    .from('post')
    .select(POST_SELECT)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'post_photo', ascending: true })
  if (error) throw error

  const rows = (data ?? []) as unknown as PostRow[]
  const urls = await signedUrls(rows.flatMap((row) => row.post_photo.map((photo) => photo.storage_path)))
  return rows.map((row) => ({
    post_id: row.post_id,
    user_id: row.user_id,
    location_id: row.location_id,
    seating_id: row.seating_id,
    crowd_level_id: row.crowd_level_id,
    noise_level_id: row.noise_level_id,
    wifi_mbps: row.wifi_mbps,
    caption: row.caption,
    created_at: row.created_at,
    author_name: row.users?.name ?? '',
    photos: row.post_photo.map((photo) => ({
      photo_id: photo.photo_id,
      storage_path: photo.storage_path,
      url: urls.get(photo.storage_path) ?? '',
      created_at: photo.created_at,
    })),
  }))
}

/** Newest photos at a spot, for the photo strip. */
export async function getRecentPhotos(locationId: number, limit = RECENT_PHOTO_LIMIT): Promise<RecentPhoto[]> {
  const { data, error } = await supabase
    .from('post_photo')
    .select('photo_id, post_id, storage_path, created_at, post!inner(location_id)')
    .eq('post.location_id', locationId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error

  const rows = (data ?? []) as unknown as RecentPhotoRow[]
  const urls = await signedUrls(rows.map((row) => row.storage_path))
  return rows.map((row) => ({
    photo_id: row.photo_id,
    post_id: row.post_id,
    url: urls.get(row.storage_path) ?? '',
    created_at: row.created_at,
  }))
}

/**
 * Deletes the post, then its files. The row is removed first so a caller who
 * can read but not delete someone else's post cannot remove their photos.
 */
export async function deletePost(postId: number): Promise<void> {
  const { data: photos, error: photosError } = await supabase
    .from('post_photo')
    .select('storage_path')
    .eq('post_id', postId)
  if (photosError) throw photosError

  const { data: deleted, error } = await supabase.from('post').delete().eq('post_id', postId).select('post_id')
  if (error) throw error
  if (!deleted?.length) return

  const paths = (photos ?? []).map((photo) => photo.storage_path)
  if (paths.length === 0) return
  const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths)
  if (storageError) throw storageError
}
