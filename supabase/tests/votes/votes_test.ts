import { assertEquals } from 'jsr:@std/assert@1'
import { ADMIN, assertPgError, type Db, OTHER_STUDENT, seed, STUDENT, withDb } from '../database/db.ts'

const RAISE_EXCEPTION = 'P0001' // cast_vote and the self-vote trigger use plain "raise exception"
const INSUFFICIENT_PRIVILEGE = '42501' // missing grant or RLS violation

// Student is always the post author. Other_Student & Admin act as voters.
async function makePost(db: Db, locationId: number): Promise<number> {
  const [{ post_id }] = await db.query<{ post_id: number }>(
    `insert into public.post (user_id, location_id, crowd_level_id) values ($1, $2, 3) returning post_id`,
    [STUDENT, locationId],
  )
  return Number(post_id)
}

const vote = (db: Db, actor: string | null, postId: number, value: number) =>
  db.as(actor).query(`select public.cast_vote($1, $2::smallint)`, [postId, value])

const summary = async (db: Db, actor: string | null, postId: number) =>
  (await db.as(actor).query<{ upvotes: number; downvotes: number; vote_score: number; my_vote: number | null }>(
    `select upvotes, downvotes, vote_score, my_vote from public.post_vote_summary where post_id = $1`,
    [postId],
  ))[0]

const voteCount = async (db: Db) =>
  Number((await db.query<{ n: number }>('select count(*)::int as n from public.vote'))[0].n)

Deno.test('vote', async (t) => {
  await t.step('voting the same way twice does not double-count', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const postId = await makePost(db, locationId)
      await vote(db, OTHER_STUDENT, postId, 1)
      await vote(db, OTHER_STUDENT, postId, 1)
      assertEquals(await voteCount(db), 1)
      assertEquals(await summary(db, OTHER_STUDENT, postId), {
        upvotes: 1,
        downvotes: 0,
        vote_score: 1,
        my_vote: 1,
      })
    }))

  await t.step('switching up to down moves the score by 2', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const postId = await makePost(db, locationId)
      await vote(db, ADMIN, postId, 1)
      await vote(db, OTHER_STUDENT, postId, 1)
      assertEquals((await summary(db, OTHER_STUDENT, postId)).vote_score, 2)
      await vote(db, OTHER_STUDENT, postId, -1)
      assertEquals(await summary(db, OTHER_STUDENT, postId), {
        upvotes: 1,
        downvotes: 1,
        vote_score: 0,
        my_vote: -1,
      })
    }))

  await t.step('voting 0 removes the vote, and removing twice is harmless', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const postId = await makePost(db, locationId)
      await vote(db, OTHER_STUDENT, postId, -1)
      await vote(db, OTHER_STUDENT, postId, 0)
      await vote(db, OTHER_STUDENT, postId, 0)
      assertEquals(await voteCount(db), 0)
      const s = await summary(db, OTHER_STUDENT, postId)
      assertEquals([s.vote_score, s.my_vote], [0, null])
    }))

  await t.step('you cannot vote on your own post', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const postId = await makePost(db, locationId)
      await assertPgError(vote(db, STUDENT, postId, 1), RAISE_EXCEPTION)
      assertEquals(await voteCount(db), 0)
    }))

  await t.step('rejects bad values and signed-out callers', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const postId = await makePost(db, locationId)
      await assertPgError(vote(db, OTHER_STUDENT, postId, 5), RAISE_EXCEPTION)
      await assertPgError(vote(db, null, postId, 1), INSUFFICIENT_PRIVILEGE)
      assertEquals(await voteCount(db), 0)
    }))

  await t.step('RLS: users vote only as themselves and see only their own votes', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const postId = await makePost(db, locationId)
      // OTHER_STUDENT tries to insert a vote on behalf of ADMIN.
      await assertPgError(
        db.as(OTHER_STUDENT).query(
          `insert into public.vote (post_id, user_id, value) values ($1, $2, 1)`,
          [postId, ADMIN],
        ),
        INSUFFICIENT_PRIVILEGE,
      )
      await vote(db, OTHER_STUDENT, postId, 1)
      await vote(db, ADMIN, postId, -1)
      assertEquals((await db.as(OTHER_STUDENT).query('select * from public.vote')).length, 1)
      assertEquals(
        await db.as(OTHER_STUDENT).query(`delete from public.vote where user_id = $1 returning 1`, [ADMIN]),
        [],
      )
      await assertPgError(db.as(null).query('select * from public.vote'), INSUFFICIENT_PRIVILEGE)
    }))

  await t.step('the summary counts everyone but shows my_vote only to the caller', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const postId = await makePost(db, locationId)
      await vote(db, OTHER_STUDENT, postId, 1)
      await vote(db, ADMIN, postId, -1)
      const mine = await summary(db, OTHER_STUDENT, postId)
      assertEquals([mine.upvotes, mine.downvotes, mine.vote_score, mine.my_vote], [1, 1, 0, 1])
      assertEquals((await summary(db, ADMIN, postId)).my_vote, -1)
      assertEquals((await summary(db, STUDENT, postId)).my_vote, null)
      await assertPgError(summary(db, null, postId), INSUFFICIENT_PRIVILEGE)
    }))

  await t.step('deleting a post removes its votes', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const postId = await makePost(db, locationId)
      await vote(db, OTHER_STUDENT, postId, 1)
      await db.query('delete from public.post where post_id = $1', [postId])
      assertEquals(await voteCount(db), 0)
    }))
})