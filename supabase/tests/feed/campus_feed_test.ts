import { assert, assertEquals } from 'jsr:@std/assert@1'
import { assertPgError, type Db, OTHER_STUDENT, seed, STUDENT, withDb } from '../database/db.ts'

const INSUFFICIENT_PRIVILEGE = '42501' // missing grant or RLS violation
const INVALID_INPUT = 'P0001' // raise exception in get_campus_feed

interface FeedRow {
  post_id: number
  location_id: number
  location_name: string
  author_name: string
  crowd_level: string
  noise_level: string | null
  caption: string | null
  created_at: Date
  photo_path: string
}

interface Cursor {
  createdAt: Date
  postId: number
}

let photoCount = 0

/** Adds a location (as the owner) and returns its id. */
async function addLocation(db: Db, name: string): Promise<number> {
  const [{ location_id }] = await db.query<{ location_id: number }>(
    `insert into public.location (name, latitude, longitude, location_type, campus)
     values ($1, 42.339, -71.087, 'campus_building', 'Northeastern University')
     returning location_id`,
    [name],
  )
  return Number(location_id)
}

/** Adds a post with photos (as the owner). `minute` sets its time, so tests control the order. */
async function addPost(
  db: Db,
  opts: { userId: string; locationId: number; minute: number; photos?: number },
): Promise<{ postId: number; photoPaths: string[] }> {
  const createdAt = new Date(Date.UTC(2026, 10, 8, 12, opts.minute)).toISOString()
  const [{ post_id }] = await db.query<{ post_id: number }>(
    `insert into public.post (user_id, location_id, crowd_level_id, noise_level_id, caption, created_at)
     values ($1, $2, 2, 2, 'Plenty of seats', $3)
     returning post_id`,
    [opts.userId, opts.locationId, createdAt],
  )
  const photoPaths: string[] = []
  for (let i = 0; i < (opts.photos ?? 1); i++) {
    const path = `${opts.userId}/photo-${++photoCount}.jpg`
    await db.query(
      'insert into public.post_photo (post_id, storage_path, created_at) values ($1, $2, $3)',
      [post_id, path, new Date(Date.parse(createdAt) + i * 1000).toISOString()],
    )
    photoPaths.push(path)
  }
  return { postId: Number(post_id), photoPaths }
}

/** One feed page, read as a signed-in user (or anon when actor is null). */
const feed = (
  db: Db,
  actor: string | null,
  opts: { before?: Cursor; limit?: number; savedOnly?: boolean } = {},
) =>
  db.as(actor).query<FeedRow>('select * from public.get_campus_feed($1, $2, $3, $4)', [
    opts.before?.createdAt ?? null,
    opts.before?.postId ?? null,
    opts.limit ?? 20,
    opts.savedOnly ?? false,
  ])

const ids = (rows: FeedRow[]) => rows.map((r) => Number(r.post_id))

const cursorAfter = (rows: FeedRow[]): Cursor => {
  const last = rows[rows.length - 1]
  return { createdAt: last.created_at, postId: Number(last.post_id) }
}

/** Reads every page of the feed and returns the post ids in order. */
async function readAllPages(db: Db, limit: number): Promise<number[]> {
  const all: number[] = []
  let before: Cursor | undefined
  for (let i = 0; i < 50; i++) {
    const page = await feed(db, STUDENT, { before, limit })
    all.push(...ids(page))
    if (page.length < limit) break
    before = cursorAfter(page)
  }
  return all
}

Deno.test('get_campus_feed', async (t) => {
  await t.step('returns posts from every spot, newest first, with spot, author, labels and first photo', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const curry = await addLocation(db, 'Curry Student Center')
      const older = await addPost(db, { userId: STUDENT, locationId, minute: 1, photos: 2 })
      const newer = await addPost(db, { userId: OTHER_STUDENT, locationId: curry, minute: 2 })

      const rows = await feed(db, STUDENT)
      assertEquals(ids(rows), [newer.postId, older.postId])

      const post = rows[1]
      assertEquals(post.location_name, 'Snell Library')
      assertEquals(post.author_name, 'Sam Student')
      assertEquals(post.crowd_level, 'Quiet')
      assertEquals(post.noise_level, 'Quiet')
      assertEquals(post.caption, 'Plenty of seats')
      assertEquals(post.photo_path, older.photoPaths[0])
      assertEquals(rows[0].location_name, 'Curry Student Center')
    }))

  await t.step('paging never repeats or skips posts, even when two share the same time', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const posts = []
      for (const minute of [1, 2, 3, 3, 4, 5, 5]) {
        posts.push({ minute, ...(await addPost(db, { userId: STUDENT, locationId, minute })) })
      }
      // Newest first; when two posts share a time, the higher post_id comes first.
      const expected = [...posts]
        .sort((a, b) => b.minute - a.minute || b.postId - a.postId)
        .map((p) => p.postId)

      assertEquals(await readAllPages(db, 2), expected)
      assertEquals(await readAllPages(db, 3), expected)
    }))

  await t.step('a new post does not shift the next page', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const posts = []
      for (const minute of [1, 2, 3, 4]) {
        posts.push((await addPost(db, { userId: STUDENT, locationId, minute })).postId)
      }

      const page1 = await feed(db, STUDENT, { limit: 2 })
      assertEquals(ids(page1), [posts[3], posts[2]])

      await addPost(db, { userId: OTHER_STUDENT, locationId, minute: 10 })

      const page2 = await feed(db, STUDENT, { limit: 2, before: cursorAfter(page1) })
      assertEquals(ids(page2), [posts[1], posts[0]])
    }))

  await t.step('every returned post has a photo', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const withPhoto = await addPost(db, { userId: STUDENT, locationId, minute: 1 })
      // The photo rule only runs at commit, and tests roll back, so this post can exist here.
      await addPost(db, { userId: STUDENT, locationId, minute: 2, photos: 0 })

      const rows = await feed(db, STUDENT)
      assertEquals(ids(rows), [withPhoto.postId])
      assert(rows.every((r) => r.photo_path))
    }))

  await t.step('signed-out callers cannot read the feed', () =>
    withDb(async (db) => {
      await seed(db)
      await assertPgError(feed(db, null), INSUFFICIENT_PRIVILEGE)
    }))

  await t.step('savedOnly returns only posts at saved spots', () =>
    withDb(async (db) => {
      const [{ exists }] = await db.query<{ exists: boolean }>(
        `select to_regclass('public.saved_spot') is not null as exists`,
      )
      if (!exists) {
        console.log('    skipped: saved_spot (B-6) is not merged yet')
        return
      }

      const { locationId } = await seed(db)
      const curry = await addLocation(db, 'Curry Student Center')
      const saved = await addPost(db, { userId: OTHER_STUDENT, locationId, minute: 1 })
      await addPost(db, { userId: OTHER_STUDENT, locationId: curry, minute: 2 })
      await db.query('insert into public.saved_spot (user_id, location_id) values ($1, $2)', [STUDENT, locationId])

      assertEquals(ids(await feed(db, STUDENT, { savedOnly: true })), [saved.postId])
      assertEquals(ids(await feed(db, OTHER_STUDENT, { savedOnly: true })), [])
    }))

  await t.step('the feed query uses the new index', () =>
    withDb(async (db) => {
      // With few rows Postgres may scan the whole table, so turn that off to check the index can be used.
      await db.query('set local enable_seqscan = off')
      const plan = await db.query<Record<string, string>>(
        `explain
         select p.post_id from public.post p
         where (p.created_at, p.post_id) < (now(), 9223372036854775807)
         order by p.created_at desc, p.post_id desc
         limit 20`,
      )
      const text = plan.map((row) => Object.values(row)[0]).join('\n')
      assert(text.includes('post_created_at_post_id_idx'), text)
    }))

  await t.step('rejects a cursor with only one part set', () =>
    withDb(async (db) => {
      await seed(db)
      const call = (createdAt: string | null, postId: number | null) =>
        db.as(STUDENT).query('select * from public.get_campus_feed($1, $2, $3, $4)', [createdAt, postId, 20, false])
      await assertPgError(call('2026-11-08T12:00:00Z', null), INVALID_INPUT)
      await assertPgError(call(null, 5), INVALID_INPUT)
    }))

  await t.step('rejects a missing or out-of-range limit, and allows 1 to 100', () =>
    withDb(async (db) => {
      await seed(db)
      const call = (limit: number | null) =>
        db.as(STUDENT).query('select * from public.get_campus_feed(null, null, $1, false)', [limit])
      await assertPgError(call(0), INVALID_INPUT)
      await assertPgError(call(101), INVALID_INPUT)
      await assertPgError(call(null), INVALID_INPUT)
      assertEquals(await call(1), [])
      assertEquals(await call(100), [])
    }))
})