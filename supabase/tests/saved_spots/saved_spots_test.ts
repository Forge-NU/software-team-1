import { assertEquals } from 'jsr:@std/assert@1'
import { ADMIN, assertPgError, type Db, OTHER_STUDENT, seed, STUDENT, withDb } from '../database/db.ts'

const INSUFFICIENT_PRIVILEGE = '42501' // missing grant or RLS violation

// Same statement saveSpot() sends: an insert that ignores duplicates.
const save = (db: Db, actor: string | null, locationId: number) =>
  db.as(actor).query(
    `insert into public.saved_spot (user_id, location_id) values ($1, $2)
     on conflict (user_id, location_id) do nothing`,
    [actor, locationId],
  )

const saveCount = async (db: Db, userId?: string) =>
  Number(
    (await db.query<{ n: number }>(
      userId
        ? 'select count(*)::int as n from public.saved_spot where user_id = $1'
        : 'select count(*)::int as n from public.saved_spot',
      userId ? [userId] : [],
    ))[0].n,
  )

Deno.test('saved_spot', async (t) => {
  await t.step('saving the same spot twice does not error or duplicate', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await save(db, STUDENT, locationId)
      await save(db, STUDENT, locationId)
      assertEquals(await saveCount(db, STUDENT), 1)
    }))

  await t.step('two users can save the same spot', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await save(db, STUDENT, locationId)
      await save(db, OTHER_STUDENT, locationId)
      assertEquals(await saveCount(db), 2)
    }))

  await t.step('RLS: users only see their own saves', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await save(db, STUDENT, locationId)
      await save(db, OTHER_STUDENT, locationId)
      const rows = await db.as(OTHER_STUDENT).query<{ user_id: string }>(
        'select user_id from public.saved_spot',
      )
      assertEquals(rows.map((r) => r.user_id), [OTHER_STUDENT])
    }))

  await t.step('RLS: users cannot save on behalf of someone else', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await assertPgError(
        db.as(OTHER_STUDENT).query(
          'insert into public.saved_spot (user_id, location_id) values ($1, $2)',
          [STUDENT, locationId],
        ),
        INSUFFICIENT_PRIVILEGE,
      )
      assertEquals(await saveCount(db), 0)
    }))

  await t.step("RLS: users cannot delete someone else's saves", () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await save(db, STUDENT, locationId)
      const deleted = await db.as(OTHER_STUDENT).query(
        'delete from public.saved_spot where user_id = $1 returning 1',
        [STUDENT],
      )
      assertEquals(deleted, [])
      assertEquals(await saveCount(db, STUDENT), 1)
    }))

  await t.step('users can remove their own saves, and removing twice is harmless', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await save(db, STUDENT, locationId)
      const unsave = () =>
        db.as(STUDENT).query(
          'delete from public.saved_spot where user_id = $1 and location_id = $2',
          [STUDENT, locationId],
        )
      await unsave()
      await unsave()
      assertEquals(await saveCount(db), 0)
    }))

  await t.step('saves cannot be updated (no update grant), even your own', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await save(db, STUDENT, locationId)
      await assertPgError(
        db.as(STUDENT).query('update public.saved_spot set created_at = now() where user_id = $1', [STUDENT]),
        INSUFFICIENT_PRIVILEGE,
      )
    }))

  await t.step('signed-out callers cannot read or save', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await save(db, STUDENT, locationId)
      await assertPgError(db.as(null).query('select * from public.saved_spot'), INSUFFICIENT_PRIVILEGE)
      await assertPgError(
        db.as(null).query('insert into public.saved_spot (user_id, location_id) values ($1, $2)', [ADMIN, locationId]),
        INSUFFICIENT_PRIVILEGE,
      )
    }))

  await t.step('deleting a location removes its saves', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await save(db, STUDENT, locationId)
      await db.query('delete from public.location where location_id = $1', [locationId])
      assertEquals(await saveCount(db), 0)
    }))
})
