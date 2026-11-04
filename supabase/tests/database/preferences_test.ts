import { assertEquals } from 'jsr:@std/assert@1'
import { assertPgError, OTHER_STUDENT, seed, STUDENT, withDb } from './db.ts'

const INSUFFICIENT_PRIVILEGE = '42501'

const PREFS = 'preferred_noise, preferred_amenities, notify_saved_updates'

Deno.test('study preferences', async (t) => {
  await t.step('a new user has no preferences', () =>
    withDb(async (db) => {
      await seed(db)
      const rows = await db.as(STUDENT).query(`select ${PREFS} from public.users where user_id = $1`, [STUDENT])
      assertEquals(rows, [{ preferred_noise: null, preferred_amenities: [], notify_saved_updates: false }])
    }))

  await t.step('users can update their own preferences', () =>
    withDb(async (db) => {
      await seed(db)
      const rows = await db.as(STUDENT).query(
        `update public.users
         set preferred_noise = 2, preferred_amenities = '{outlets,wifi}', notify_saved_updates = true
         where user_id = $1 returning ${PREFS}`,
        [STUDENT],
      )
      assertEquals(rows, [{ preferred_noise: 2, preferred_amenities: ['outlets', 'wifi'], notify_saved_updates: true }])
    }))

  await t.step("users cannot update another user's preferences", () =>
    withDb(async (db) => {
      await seed(db)
      const rows = await db.as(STUDENT).query(
        `update public.users set notify_saved_updates = true where user_id = $1 returning user_id`,
        [OTHER_STUDENT],
      )
      assertEquals(rows, [])
      const [other] = await db.query<{ notify_saved_updates: boolean }>(
        'select notify_saved_updates from public.users where user_id = $1',
        [OTHER_STUDENT],
      )
      assertEquals(other.notify_saved_updates, false)
    }))

  await t.step('email and user_type stay unchangeable', () =>
    withDb(async (db) => {
      await seed(db)
      await assertPgError(
        db.as(STUDENT).query(`update public.users set email = 'x@x.com' where user_id = $1`, [STUDENT]),
        INSUFFICIENT_PRIVILEGE,
      )
      await assertPgError(
        db.as(STUDENT).query(`update public.users set user_type = 'admin' where user_id = $1`, [STUDENT]),
        INSUFFICIENT_PRIVILEGE,
      )
    }))
})
