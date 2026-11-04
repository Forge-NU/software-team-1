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

/** List+remove every file under `folder/` (and nested folders), paginating until empty. */
export async function removeFolder(
  client: SupabaseClient,
  bucket: string,
  folder: string,
): Promise<void> {
  const limit = 100

  for (;;) {
    const { data, error } = await client.storage.from(bucket).list(folder, { limit, offset: 0 })
    if (error) throw new HttpError(500, `Storage list failed: ${error.message}`)
    if (!data?.length) return

    const filePaths: string[] = []
    for (const item of data) {
      const path = `${folder}/${item.name}`
      // Folders have no id; files do. Recurse into nested prefixes if any appear.
      if (item.id == null) {
        await removeFolder(client, bucket, path)
      } else {
        filePaths.push(path)
      }
    }

    if (filePaths.length === 0) return

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
