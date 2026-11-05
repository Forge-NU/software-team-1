import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const PHOTO_BUCKETS = ['post-photos', 'review-photos'] as const

export interface Deps {
  /** Resolve the caller from the Authorization header. Null if missing/invalid. */
  getCallerId: (authorization: string | null) => Promise<string | null>
  /** Delete every object under `{userId}/` in the photo buckets. */
  removeUserStorage: (userId: string) => Promise<void>
  /** Delete the auth user. Treat “already gone” as success for retries. */
  deleteAuthUser: (userId: string) => Promise<void>
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * List and remove every file under `folder/`, including nested prefixes.
 *
 * Always re-lists from the start (`offset: 0`) because a removed page shifts
 * what comes next. A page of only folders must not end the scan — files can
 * sit past it. If a page comes back unchanged, stop with an error instead of
 * looping forever.
 */
export async function removeFolder(
  client: SupabaseClient,
  bucket: string,
  folder: string,
): Promise<void> {
  const limit = 100
  let previousSignature: string | null = null

  for (;;) {
    const { data, error } = await client.storage.from(bucket).list(folder, { limit, offset: 0 })
    if (error) throw new HttpError(500, `Storage list failed: ${error.message}`)
    if (!data?.length) return

    const signature = data.map((item) => `${item.id ?? ''}:${item.name}`).join('\0')
    if (signature === previousSignature) {
      throw new HttpError(500, `Storage cleanup stalled under ${folder}`)
    }
    previousSignature = signature

    const filePaths: string[] = []
    const childFolders: string[] = []
    for (const item of data) {
      const path = `${folder}/${item.name}`
      // Folders have no id; files do.
      if (item.id == null) childFolders.push(path)
      else filePaths.push(path)
    }

    for (const child of childFolders) {
      await removeFolder(client, bucket, child)
    }

    if (filePaths.length === 0) continue

    const { error: removeError } = await client.storage.from(bucket).remove(filePaths)
    if (removeError) throw new HttpError(500, `Storage remove failed: ${removeError.message}`)
  }
}

export async function removeUserStorage(
  client: SupabaseClient,
  userId: string,
  buckets: readonly string[] = PHOTO_BUCKETS,
): Promise<void> {
  for (const bucket of buckets) {
    await removeFolder(client, bucket, userId)
  }
}

/** True when admin.deleteUser failed because the user is already gone. */
export function isUserAlreadyDeleted(error: { status?: number; message?: string; code?: string }): boolean {
  if (error.status === 404) return true
  if (error.code === 'user_not_found') return true
  return /not found|user not found/i.test(error.message ?? '')
}

export async function deleteAuthUser(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client.auth.admin.deleteUser(userId)
  if (!error) return
  if (isUserAlreadyDeleted(error)) return
  throw new HttpError(500, error.message)
}

export function createHandler(getDeps: () => Deps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')

      const { getCallerId, removeUserStorage, deleteAuthUser } = getDeps()
      // Identity comes only from the JWT — never from the body.
      const userId = await getCallerId(req.headers.get('Authorization'))
      if (!userId) throw new HttpError(401, 'Sign in to delete your account')

      await removeUserStorage(userId)
      await deleteAuthUser(userId)

      return json({ ok: true })
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status)
      console.error(err)
      return json({ error: 'Internal server error' }, 500)
    }
  }
}
