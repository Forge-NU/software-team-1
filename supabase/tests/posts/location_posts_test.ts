import { assert, assertEquals } from 'jsr:@std/assert@1'
import { ADMIN, assertPgError, type Db, OTHER_STUDENT, seed, STUDENT, withDb } from '../database/db.ts'

const INSUFFICIENT_PRIVILEGE = '42501' // missing grant or RLS violation
const INVALID_INPUT = 'P0001' // raise exception in the page functions

interface SpotPostRow {
  post_id: number
  author_name: string
  crowd_level_id: number
  created_at: Date
  photo_path: string | null
  upvotes: number
  downvotes: number
  vote_score: number
  my_vote: number | null
}

interface CheckInRow {
  post_id: number
  location_name: string
  created_at: Date
  photo_count: number
  vote_score: number
}

interface Cursor {
  createdAt: Date
  postId: number
}

let photoCount = 0

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
  opts: { userId: string; locationId: number; minute: number; crowd?: number; photos?: number },
): Promise<{ postId: number; photoPaths: string[] }> {
  const createdAt = new Date(Date.UTC(2026, 10, 20, 12, opts.minute)).toISOString()
  const [{ post_id }] = await db.query<{ post_id: number }>(
    `insert into public.post (user_id, location_id, crowd_level_id, noise_level_id, caption, created_at)
     values ($1, $2, $3, 2, 'Plenty of seats', $4)
     returning post_id`,
    [opts.userId, opts.locationId, opts.crowd ?? 2, createdAt],
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

/** Adds a vote as the owner (skips RLS, keeps the no-voting-on-your-own-post rule). */
const vote = (db: Db, userId: string, postId: number, value: 1 | -1) =>
  db.query('insert into public.vote (post_id, user_id, value) values ($1, $2, $3)', [postId, userId, value])

/** One page of a spot's posts, read as a signed-in user (or anon when actor is null). */
const spotPosts = (
  db: Db,
  actor: string | null,
  locationId: number | null,
  opts: { oldestFirst?: boolean; crowds?: number[] | null; before?: Cursor; limit?: number | null } = {},
) =>
  db.as(actor).query<SpotPostRow>(
    'select * from public.get_location_posts($1, $2, $3::smallint[], $4, $5, $6)',
    [
      locationId,
      opts.oldestFirst ?? false,
      opts.crowds ?? null,
      opts.before?.createdAt ?? null,
      opts.before?.postId ?? null,
      opts.limit === undefined ? 20 : opts.limit,
    ],
  )

/** One page of the caller's check-ins. */
const checkIns = (db: Db, actor: string | null, opts: { before?: Cursor; limit?: number } = {}) =>
  db.as(actor).query<CheckInRow>('select * from public.get_my_check_ins($1, $2, $3)', [
    opts.before?.createdAt ?? null,
    opts.before?.postId ?? null,
    opts.limit ?? 20,
  ])

const ids = (rows: { post_id: number }[]) => rows.map((r) => Number(r.post_id))

const cursorAfter = (rows: { post_id: number; created_at: Date }[]): Cursor => {
  const last = rows[rows.length - 1]
  return { createdAt: last.created_at, postId: Number(last.post_id) }
}

/** Reads every page and returns the post ids in order. */
async function readAll(
  fetchPage: (before?: Cursor) => Promise<{ post_id: number; created_at: Date }[]>,
  limit: number,
): Promise<number[]> {
  const all: number[] = []
  let before: Cursor | undefined
  for (let i = 0; i < 50; i++) {
    const page = await fetchPage(before)
    all.push(...ids(page))
    if (page.length < limit) break
    before = cursorAfter(page)
  }
  return all
}

Deno.test('get_location_posts', async (t) => {
  await t.step("returns a spot's posts newest first, with author, first photo and votes", () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const curry = await addLocation(db, 'Curry Student Center')
      const older = await addPost(db, { userId: ADMIN, locationId, minute: 1, photos: 2 })
      const newer = await addPost(db, { userId: ADMIN, locationId, minute: 2 })
      await addPost(db, { userId: ADMIN, locationId: curry, minute: 3 })
      await vote(db, STUDENT, older.postId, 1)
      await vote(db, OTHER_STUDENT, older.postId, -1)
      await vote(db, OTHER_STUDENT, newer.postId, 1)

      const rows = await spotPosts(db, STUDENT, locationId)
      assertEquals(ids(rows), [newer.postId, older.postId])
      assertEquals(rows[1].author_name, 'Ada Admin')
      assertEquals(rows[1].photo_path, older.photoPaths[0])
      assertEquals(
        [rows[1].upvotes, rows[1].downvotes, rows[1].vote_score, rows[1].my_vote],
        [1, 1, 0, 1],
      )
      assertEquals([rows[0].upvotes, rows[0].my_vote], [1, null])

      // Same counts for another user, but my_vote is theirs
      const theirs = await spotPosts(db, OTHER_STUDENT, locationId)
      assertEquals([theirs[1].vote_score, theirs[1].my_vote], [0, -1])
      assertEquals(theirs[0].my_vote, 1)
    }))

  await t.step('paging returns every post exactly once, newest and oldest first, even with ties', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const posts = []
      for (const minute of [1, 2, 3, 3, 4, 5, 5]) {
        posts.push({ minute, ...(await addPost(db, { userId: ADMIN, locationId, minute })) })
      }
      const newestFirst = [...posts]
        .sort((a, b) => b.minute - a.minute || b.postId - a.postId)
        .map((p) => p.postId)
      const oldestFirst = [...newestFirst].reverse()

      for (const limit of [2, 3]) {
        assertEquals(await readAll((before) => spotPosts(db, STUDENT, locationId, { before, limit }), limit), newestFirst)
        assertEquals(
          await readAll((before) => spotPosts(db, STUDENT, locationId, { before, limit, oldestFirst: true }), limit),
          oldestFirst,
        )
      }
    }))

  await t.step('the last page is short, and asking past it returns nothing', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      for (const minute of [1, 2, 3, 4, 5]) await addPost(db, { userId: ADMIN, locationId, minute })

      const page1 = await spotPosts(db, STUDENT, locationId, { limit: 2 })
      const page2 = await spotPosts(db, STUDENT, locationId, { limit: 2, before: cursorAfter(page1) })
      const page3 = await spotPosts(db, STUDENT, locationId, { limit: 2, before: cursorAfter(page2) })
      assertEquals([page1.length, page2.length, page3.length], [2, 2, 1])

      const page4 = await spotPosts(db, STUDENT, locationId, { limit: 2, before: cursorAfter(page3) })
      assertEquals(page4, [])
    }))

  await t.step('the review filter keeps only those crowd levels while paging', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const crowds = [1, 4, 2, 5, 3, 1]
      const posts = []
      for (let i = 0; i < crowds.length; i++) {
        posts.push({ crowd: crowds[i], ...(await addPost(db, { userId: ADMIN, locationId, minute: i + 1, crowd: crowds[i] })) })
      }
      const expected = posts
        .filter((p) => p.crowd === 1 || p.crowd === 2)
        .map((p) => p.postId)
        .reverse()

      assertEquals(
        await readAll((before) => spotPosts(db, STUDENT, locationId, { before, limit: 2, crowds: [1, 2] }), 2),
        expected,
      )
    }))

  await t.step('rejects a half-set cursor, a missing location, and a limit outside 1 to 100', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const call = (createdAt: string | null, postId: number | null, limit: number | null, loc: number | null = locationId) =>
        db.as(STUDENT).query('select * from public.get_location_posts($1, false, null, $2, $3, $4)', [loc, createdAt, postId, limit])

      await assertPgError(call('2026-11-20T12:00:00Z', null, 20), INVALID_INPUT)
      await assertPgError(call(null, 5, 20), INVALID_INPUT)
      await assertPgError(call(null, null, 20, null), INVALID_INPUT)
      await assertPgError(call(null, null, 0), INVALID_INPUT)
      await assertPgError(call(null, null, 101), INVALID_INPUT)
      await assertPgError(call(null, null, null), INVALID_INPUT)
      assertEquals(await call(null, null, 1), [])
      assertEquals(await call(null, null, 100), [])
    }))

  await t.step('signed-out callers cannot read spot posts or check-ins', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await assertPgError(spotPosts(db, null, locationId), INSUFFICIENT_PRIVILEGE)
      await assertPgError(checkIns(db, null), INSUFFICIENT_PRIVILEGE)
    }))

  await t.step('the spot query uses the new index', () =>
    withDb(async (db) => {
      // With few rows Postgres may scan the whole table, so turn that off to check the index can be used.
      await db.query('set local enable_seqscan = off')
      const plan = await db.query<Record<string, string>>(
        `explain
         select p.post_id from public.post p
         where p.location_id = 1
           and (p.created_at, p.post_id) < (now(), 9223372036854775807)
         order by p.created_at desc, p.post_id desc
         limit 20`,
      )
      const text = plan.map((row) => Object.values(row)[0]).join('\n')
      assert(text.includes('post_location_created_at_post_id_idx'), text)
    }))
})

Deno.test('get_my_check_ins', async (t) => {
  await t.step('returns only my posts, newest first, paged with ties, with spot, photo count and score', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const mine = []
      for (const minute of [1, 2, 2, 3]) {
        mine.push({ minute, ...(await addPost(db, { userId: ADMIN, locationId, minute, photos: minute === 3 ? 2 : 1 })) })
      }
      const theirs = await addPost(db, { userId: STUDENT, locationId, minute: 4 })
      await vote(db, STUDENT, mine[3].postId, 1)
      await vote(db, OTHER_STUDENT, mine[3].postId, 1)

      const expected = [...mine]
        .sort((a, b) => b.minute - a.minute || b.postId - a.postId)
        .map((p) => p.postId)
      assertEquals(await readAll((before) => checkIns(db, ADMIN, { before, limit: 2 }), 2), expected)

      const [newest] = await checkIns(db, ADMIN, { limit: 1 })
      assertEquals(newest.location_name, 'Snell Library')
      assertEquals([newest.photo_count, newest.vote_score], [2, 2])

      assertEquals(ids(await checkIns(db, STUDENT)), [theirs.postId])
    }))

  await t.step('rejects a half-set cursor and a limit outside 1 to 100', () =>
    withDb(async (db) => {
      await seed(db)
      const call = (createdAt: string | null, postId: number | null, limit: number | null) =>
        db.as(STUDENT).query('select * from public.get_my_check_ins($1, $2, $3)', [createdAt, postId, limit])

      await assertPgError(call('2026-11-20T12:00:00Z', null, 20), INVALID_INPUT)
      await assertPgError(call(null, 5, 20), INVALID_INPUT)
      await assertPgError(call(null, null, 0), INVALID_INPUT)
      await assertPgError(call(null, null, 101), INVALID_INPUT)
      assertEquals(await call(null, null, 100), [])
    }))
})