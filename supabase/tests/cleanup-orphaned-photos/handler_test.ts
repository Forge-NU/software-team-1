import { assertEquals } from 'jsr:@std/assert@1'
import {
  createHandler,
  type OrphanedPhoto,
  REMOVE_BATCH_SIZE,
  secretsMatch,
} from '../../functions/cleanup-orphaned-photos/handler.ts'

const SECRET = 'test-cron-secret'

const orphan = (bucket: string, name: string): OrphanedPhoto => ({
  bucket_id: bucket,
  name,
  created_at: '2026-11-01T00:00:00Z',
})

function makeHandler(orphans: OrphanedPhoto[], cronSecret: string | undefined = SECRET) {
  const removeCalls: { bucket: string; paths: string[] }[] = []
  const handler = createHandler(() => ({
    cronSecret,
    findOrphans: async () => orphans,
    removeFiles: async (bucket, paths) => {
      removeCalls.push({ bucket, paths })
    },
  }))
  return { handler, removeCalls }
}

function request(
  handler: (req: Request) => Promise<Response>,
  init: { method?: string; secret?: string | null; body?: string } = {},
) {
  const headers = new Headers()
  if (init.secret !== null) headers.set('Authorization', `Bearer ${init.secret ?? SECRET}`)
  return handler(
    new Request('http://supabase.test/functions/v1/cleanup-orphaned-photos', {
      method: init.method ?? 'POST',
      headers,
      body: init.body,
    }),
  )
}

const FILES = [
  orphan('post-photos', 'u1/a.jpg'),
  orphan('post-photos', 'u1/b.jpg'),
  orphan('review-photos', 'u2/r.jpg'),
]

Deno.test('POST /cleanup-orphaned-photos', async (t) => {
  await t.step('a dry run lists the files without removing anything', async () => {
    const { handler, removeCalls } = makeHandler(FILES)
    const res = await request(handler, { body: '{"dryRun": true}' })
    assertEquals(res.status, 200)
    const body = await res.json()
    assertEquals(body.dryRun, true)
    assertEquals(body.found, { 'post-photos': 2, 'review-photos': 1 })
    assertEquals(body.removed, { 'post-photos': 0, 'review-photos': 0 })
    assertEquals(body.files.map((f: { path: string }) => f.path), ['u1/a.jpg', 'u1/b.jpg', 'u2/r.jpg'])
    assertEquals(removeCalls, [])
  })

  await t.step('an empty body is a dry run', async () => {
    const { handler, removeCalls } = makeHandler(FILES)
    const res = await request(handler)
    assertEquals((await res.json()).dryRun, true)
    assertEquals(removeCalls, [])
  })

  await t.step('dryRun false removes the files per bucket and reports the counts', async () => {
    const { handler, removeCalls } = makeHandler(FILES)
    const res = await request(handler, { body: '{"dryRun": false}' })
    assertEquals(res.status, 200)
    const body = await res.json()
    assertEquals(body.removed, { 'post-photos': 2, 'review-photos': 1 })
    assertEquals(body.files, undefined)
    assertEquals(removeCalls, [
      { bucket: 'post-photos', paths: ['u1/a.jpg', 'u1/b.jpg'] },
      { bucket: 'review-photos', paths: ['u2/r.jpg'] },
    ])
  })

  await t.step('removes large sets in batches', async () => {
    const many = Array.from({ length: REMOVE_BATCH_SIZE * 2 + 5 }, (_, i) => orphan('post-photos', `u1/${i}.jpg`))
    const { handler, removeCalls } = makeHandler(many)
    const body = await (await request(handler, { body: '{"dryRun": false}' })).json()
    assertEquals(removeCalls.map((c) => c.paths.length), [REMOVE_BATCH_SIZE, REMOVE_BATCH_SIZE, 5])
    assertEquals(body.removed, { 'post-photos': many.length })
  })

  await t.step('nothing to clean up', async () => {
    const { handler } = makeHandler([])
    const body = await (await request(handler, { body: '{"dryRun": false}' })).json()
    assertEquals([body.found, body.removed], [{}, {}])
  })

  await t.step('rejects a missing or wrong secret', async () => {
    const { handler, removeCalls } = makeHandler(FILES)
    for (const secret of [null, 'wrong', '']) {
      const res = await request(handler, { secret, body: '{"dryRun": false}' })
      assertEquals(res.status, 401, String(secret))
      await res.body?.cancel()
    }
    assertEquals(removeCalls, [])
  })

  await t.step('refuses to run when CRON_SECRET is not set', async () => {
    const { handler, removeCalls } = makeHandler(FILES, '')
    const res = await request(handler, { secret: '', body: '{"dryRun": false}' })
    assertEquals(res.status, 500)
    await res.body?.cancel()
    assertEquals(removeCalls, [])
  })

  await t.step('rejects non-POST requests and bad bodies', async () => {
    const { handler } = makeHandler(FILES)
    const get = await request(handler, { method: 'GET' })
    assertEquals(get.status, 405)
    await get.body?.cancel()
    for (const body of ['not json', '{"dryRun": "no"}']) {
      const res = await request(handler, { body })
      assertEquals(res.status, 400, body)
      await res.body?.cancel()
    }
  })
})

Deno.test('secretsMatch', () => {
  assertEquals(secretsMatch('abc', 'abc'), true)
  assertEquals(secretsMatch('abc', 'abd'), false)
  assertEquals(secretsMatch('ab', 'abc'), false)
})
