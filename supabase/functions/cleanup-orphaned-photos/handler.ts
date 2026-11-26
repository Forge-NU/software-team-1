import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/** Storage only allows removing this many files per request comfortably; batch above it. */
export const REMOVE_BATCH_SIZE = 100

/** A file in storage with no matching post_photo / review_photo row (from orphaned_photos()). */
export interface OrphanedPhoto {
  bucket_id: string
  name: string
  created_at: string
}

export interface Deps {
  /** Shared secret the scheduled job sends as `Authorization: Bearer <secret>`. */
  cronSecret: string | undefined
  /** Orphaned files older than 24 hours (public.orphaned_photos). */
  findOrphans: () => Promise<OrphanedPhoto[]>
  /** Removes files from a bucket through the Storage API. */
  removeFiles: (bucket: string, paths: string[]) => Promise<void>
}

export interface CleanupResult {
  dryRun: boolean
  /** Orphaned files found, per bucket */
  found: Record<string, number>
  /** Files actually removed, per bucket (all zero on a dry run) */
  removed: Record<string, number>
  /** Dry run only: the files that would be removed */
  files?: { bucket: string; path: string; created_at: string }[]
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
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Compares in constant time, so the secret can't be guessed from response timing. */
export function secretsMatch(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given)
  const b = new TextEncoder().encode(expected)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/**
 * Finds orphaned files and, unless `dryRun`, removes them in batches. Logs the counts either way.
 */
export async function cleanup(deps: Pick<Deps, 'findOrphans' | 'removeFiles'>, dryRun: boolean): Promise<CleanupResult> {
  const orphans = await deps.findOrphans()

  const byBucket = new Map<string, string[]>()
  for (const file of orphans) {
    byBucket.set(file.bucket_id, [...(byBucket.get(file.bucket_id) ?? []), file.name])
  }

  const found: Record<string, number> = {}
  const removed: Record<string, number> = {}
  for (const [bucket, paths] of byBucket) {
    found[bucket] = paths.length
    removed[bucket] = 0
    if (dryRun) continue
    for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
      const batch = paths.slice(i, i + REMOVE_BATCH_SIZE)
      await deps.removeFiles(bucket, batch)
      removed[bucket] += batch.length
    }
  }

  console.log(JSON.stringify({ job: 'cleanup-orphaned-photos', dryRun, found, removed }))

  const result: CleanupResult = { dryRun, found, removed }
  if (dryRun) {
    result.files = orphans.map((file) => ({ bucket: file.bucket_id, path: file.name, created_at: file.created_at }))
  }
  return result
}

/** Reads `{ "dryRun": boolean }`. An empty body is a dry run, so a stray call never deletes anything. */
async function readDryRun(req: Request): Promise<boolean> {
  const text = await req.text()
  if (!text.trim()) return true
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    throw new HttpError(400, 'Body must be JSON, e.g. {"dryRun": false}')
  }
  const dryRun = (body as { dryRun?: unknown } | null)?.dryRun
  if (dryRun === undefined) return true
  if (typeof dryRun !== 'boolean') throw new HttpError(400, 'dryRun must be true or false')
  return dryRun
}

export async function findOrphans(client: SupabaseClient): Promise<OrphanedPhoto[]> {
  const { data, error } = await client.rpc('orphaned_photos')
  if (error) throw new HttpError(500, `orphaned_photos failed: ${error.message}`)
  return (data ?? []) as OrphanedPhoto[]
}

export async function removeFiles(client: SupabaseClient, bucket: string, paths: string[]): Promise<void> {
  const { error } = await client.storage.from(bucket).remove(paths)
  if (error) throw new HttpError(500, `Storage remove failed in ${bucket}: ${error.message}`)
}

export function createHandler(getDeps: () => Deps) {
  return async (req: Request): Promise<Response> => {
    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')

      const deps = getDeps()
      if (!deps.cronSecret) throw new HttpError(500, 'CRON_SECRET is not configured')

      const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
      if (!secretsMatch(token, deps.cronSecret)) throw new HttpError(401, 'Unauthorized')

      return json(await cleanup(deps, await readDryRun(req)))
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status)
      console.error(err)
      return json({ error: 'Internal server error' }, 500)
    }
  }
}
