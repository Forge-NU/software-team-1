import { assertEquals } from 'jsr:@std/assert@1'
import { assertPgError, OTHER_STUDENT, seed, STUDENT, withDb } from './db.ts'

const CHECK = '23514'
const INSUFFICIENT_PRIVILEGE = '42501'

const PREFS = 'preferred_noise, preferred_amenities, notify_saved_updates'

Deno.test('study preferences', async (t) => {
  await t.step('a new user has no preferences', () =>
    withDb(async (db) => {
      await seed(db)
      assertEquals(await db.as(STUDENT).query(`select ${PREFS} from public.user_preferences`), [])
    }))

  await t.step('users can save and update their own preferences', () =>
    withDb(async (db) => {
      await seed(db)
      await db.as(STUDENT).query(`insert into public.user_preferences (preferred_noise) values (2)`)
      const rows = await db.as(STUDENT).query(
        `update public.user_preferences
         set preferred_amenities = '{outlets,wifi}', notify_saved_updates = true
         where user_id = $1 returning ${PREFS}`,
        [STUDENT],
      )
      assertEquals(rows, [{ preferred_noise: 2, preferred_amenities: ['outlets', 'wifi'], notify_saved_updates: true }])
    }))

  await t.step("users cannot read, create or update another user's preferences", () =>
    withDb(async (db) => {
      await seed(db)
      await db.query(`insert into public.user_preferences (user_id, notify_saved_updates) values ($1, false)`, [OTHER_STUDENT])

      assertEquals(await db.as(STUDENT).query(`select user_id from public.user_preferences`), [])
      await assertPgError(
        db.as(STUDENT).query(`insert into public.user_preferences (user_id) values ($1)`, [OTHER_STUDENT]),
        INSUFFICIENT_PRIVILEGE,
      )
      const updated = await db.as(STUDENT).query(
        `update public.user_preferences set notify_saved_updates = true where user_id = $1 returning user_id`,
        [OTHER_STUDENT],
      )
      assertEquals(updated, [])
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

  await t.step('rejects unknown amenities', () =>
    withDb(async (db) => {
      await seed(db)
      await assertPgError(
        db.as(STUDENT).query(`insert into public.user_preferences (preferred_amenities) values ('{outlets,sofa}')`),
        CHECK,
      )
    }))
})
