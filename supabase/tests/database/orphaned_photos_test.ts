import { assertEquals } from 'jsr:@std/assert@1'
import { assertPgError, type Db, seed, STUDENT, withDb } from './db.ts'

const INSUFFICIENT_PRIVILEGE = '42501'

/** Puts a file in storage, uploaded `hoursAgo` hours ago. */
const upload = (db: Db, bucket: string, path: string, hoursAgo: number) =>
  db.query(
    `insert into storage.objects (bucket_id, name, created_at) values ($1, $2, now() - make_interval(hours => $3))`,
    [bucket, path, hoursAgo],
  )

/** A post at the location with one photo row pointing at `path`. */
async function postWithPhoto(db: Db, locationId: number, path: string) {
  const [{ post_id }] = await db.query<{ post_id: number }>(
    `insert into public.post (user_id, location_id, crowd_level_id) values ($1, $2, 1) returning post_id`,
    [STUDENT, locationId],
  )
  await db.query(`insert into public.post_photo (post_id, storage_path) values ($1, $2)`, [post_id, path])
}

const orphans = async (db: Db) =>
  (await db.query<{ bucket_id: string; name: string }>(`select bucket_id, name from public.orphaned_photos()`))
    .map((row) => `${row.bucket_id}/${row.name}`)

Deno.test('orphaned_photos', async (t) => {
  await t.step('returns old files with no photo row, and nothing else', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await upload(db, 'post-photos', `${STUDENT}/used.jpg`, 48)
      await postWithPhoto(db, locationId, `${STUDENT}/used.jpg`)
      await upload(db, 'post-photos', `${STUDENT}/orphan.jpg`, 48)

      assertEquals(await orphans(db), [`post-photos/${STUDENT}/orphan.jpg`])
    }))

  await t.step('never returns files uploaded in the last 24 hours', () =>
    withDb(async (db) => {
      await seed(db)
      await upload(db, 'post-photos', `${STUDENT}/in-flight.jpg`, 1)
      await upload(db, 'post-photos', `${STUDENT}/almost-a-day.jpg`, 23)

      assertEquals(await orphans(db), [])
    }))

  await t.step("returns a deleted location's photos on the next run", () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await upload(db, 'post-photos', `${STUDENT}/snell.jpg`, 48)
      await postWithPhoto(db, locationId, `${STUDENT}/snell.jpg`)
      assertEquals(await orphans(db), [])

      await db.query(`delete from public.location where location_id = $1`, [locationId])
      assertEquals(await orphans(db), [`post-photos/${STUDENT}/snell.jpg`])
    }))

  await t.step('checks review-photos against review_photo', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      const [{ review_id }] = await db.query<{ review_id: number }>(
        `insert into public.review (user_id, seating_id, overall_rating) values ($1, $2, 4) returning review_id`,
        [STUDENT, seatingId],
      )
      await upload(db, 'review-photos', `${STUDENT}/review.jpg`, 48)
      await db.query(`insert into public.review_photo (review_id, storage_path) values ($1, $2)`, [
        review_id,
        `${STUDENT}/review.jpg`,
      ])
      await upload(db, 'review-photos', `${STUDENT}/old-review.jpg`, 48)

      assertEquals(await orphans(db), [`review-photos/${STUDENT}/old-review.jpg`])
    }))

  await t.step('only the service role can call it', () =>
    withDb(async (db) => {
      await seed(db)
      await assertPgError(db.as(STUDENT).query(`select * from public.orphaned_photos()`), INSUFFICIENT_PRIVILEGE)
      await assertPgError(db.as(null).query(`select * from public.orphaned_photos()`), INSUFFICIENT_PRIVILEGE)
    }))
})
