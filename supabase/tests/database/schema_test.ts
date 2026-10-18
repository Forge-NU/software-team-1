import { assertEquals } from 'jsr:@std/assert@1'
import { ADMIN, assertPgError, OTHER_STUDENT, seed, STUDENT, withDb } from './db.ts'

const CHECK = '23514'
const FOREIGN_KEY = '23503'
const UNIQUE = '23505'
const NOT_NULL = '23502'
const INSUFFICIENT_PRIVILEGE = '42501'

Deno.test('lookup data is seeded', () =>
  withDb(async (db) => {
    const count = async (table: string) =>
      Number((await db.query<{ n: number }>(`select count(*)::int as n from public.${table}`))[0].n)

    assertEquals(await count('day'), 7)
    assertEquals(await count('price_range'), 5)
    for (const table of [
      'location_type', 'campus', 'seat_type', 'capacity', 'outlet_level', 'crowd_level', 'noise_level',
    ]) {
      assertEquals((await count(table)) > 0, true, `${table} is empty`)
    }
    // scripts/osm/overpass.ts maps OSM tags onto these names.
    const types = (await db.query<{ name: string }>('select name from public.location_type')).map((r) => r.name)
    for (const t of ['library', 'cafe', 'coworking', 'campus_building', 'park', 'restaurant', 'other']) {
      assertEquals(types.includes(t), true, `missing location_type ${t}`)
    }
  }))

Deno.test('users', async (t) => {
  await t.step('a profile is created on sign-up, using metadata name or the email prefix', () =>
    withDb(async (db) => {
      await seed(db)
      const rows = await db.query<{ user_id: string; name: string; user_type: string }>(
        'select user_id, name, user_type from public.users order by user_id',
      )
      assertEquals(rows, [
        { user_id: ADMIN, name: 'Ada Admin', user_type: 'admin' },
        { user_id: STUDENT, name: 'Sam Student', user_type: 'student' },
        { user_id: OTHER_STUDENT, name: 'other', user_type: 'student' },
      ])
    }))

  await t.step('user_type only allows student or admin', () =>
    withDb(async (db) => {
      await seed(db)
      await assertPgError(db.query(`update public.users set user_type = 'owner' where user_id = $1`, [STUDENT]), CHECK)
    }))

  await t.step('email is unique', () =>
    withDb(async (db) => {
      await seed(db)
      await assertPgError(
        db.query(`insert into auth.users (id, email) values (gen_random_uuid(), 'student@northeastern.edu')`),
        UNIQUE,
      )
    }))

  await t.step('users can rename themselves but not promote themselves or edit others', () =>
    withDb(async (db) => {
      await seed(db)
      const renamed = await db.as(STUDENT).query(
        `update public.users set name = 'Sammy' where user_id = $1 returning name`,
        [STUDENT],
      )
      assertEquals(renamed, [{ name: 'Sammy' }])

      await assertPgError(
        db.as(STUDENT).query(`update public.users set user_type = 'admin' where user_id = $1`, [STUDENT]),
        INSUFFICIENT_PRIVILEGE,
      )
      const others = await db.as(STUDENT).query(
        `update public.users set name = 'hacked' where user_id = $1 returning name`,
        [OTHER_STUDENT],
      )
      assertEquals(others, [])
    }))

  await t.step('profiles cannot be inserted directly and are hidden from anon', () =>
    withDb(async (db) => {
      await seed(db)
      await assertPgError(
        db.as(STUDENT).query(`insert into public.users (user_id, name, email) values (gen_random_uuid(), 'x', 'x@x')`),
        INSUFFICIENT_PRIVILEGE,
      )
      assertEquals(await db.as(null).query('select * from public.users'), [])
      assertEquals((await db.as(STUDENT).query('select * from public.users')).length, 3)
    }))

  await t.step('deleting an auth user removes their profile and content', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      await db.as(STUDENT).query(`insert into public.review (seating_id, overall_rating) values ($1, 4)`, [seatingId])
      await db.as(STUDENT).query(`insert into public.follow (following_id) values ($1)`, [ADMIN])
      await db.query(`delete from auth.users where id = $1`, [STUDENT])

      assertEquals(await db.query(`select * from public.users where user_id = $1`, [STUDENT]), [])
      assertEquals(await db.query('select * from public.review'), [])
      assertEquals(await db.query('select * from public.follow'), [])
    }))
})

Deno.test('location', async (t) => {
  const insert = (fields: Record<string, unknown>) => {
    const row = { name: 'Cafe', latitude: 42.3, longitude: -71.1, location_type: 'cafe', ...fields }
    const cols = Object.keys(row)
    return [
      `insert into public.location (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
      Object.values(row),
    ] as const
  }

  await t.step('validates coordinates', () =>
    withDb(async (db) => {
      await assertPgError(db.query(...insert({ latitude: 91 })), CHECK)
      await assertPgError(db.query(...insert({ latitude: -91 })), CHECK)
      await assertPgError(db.query(...insert({ longitude: 181 })), CHECK)
      await db.query(...insert({ latitude: 90, longitude: -180 }))
    }))

  await t.step('requires a known location type and allows an optional known campus and price', () =>
    withDb(async (db) => {
      await assertPgError(db.query(...insert({ location_type: null })), NOT_NULL)
      await assertPgError(db.query(...insert({ location_type: 'spaceship' })), FOREIGN_KEY)
      await assertPgError(db.query(...insert({ campus: 'Hogwarts' })), FOREIGN_KEY)
      await assertPgError(db.query(...insert({ price_range_id: 9 })), FOREIGN_KEY)
      await db.query(...insert({ campus: null, price_range_id: null }))
      await db.query(...insert({ campus: 'MIT', price_range_id: 2 }))
    }))

  await t.step('google_place_id is unique, and the Google import function is gone', () =>
    withDb(async (db) => {
      await db.query(...insert({ google_place_id: 'ChIJ1' }))
      await assertPgError(db.query(...insert({ google_place_id: 'ChIJ1' })), UNIQUE)
      assertEquals(await db.query(`select to_regprocedure('public.upsert_google_place(jsonb)') as fn`), [{ fn: null }])
    }))

  await t.step('address country_code must be two uppercase letters', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await assertPgError(
        db.query(`insert into public.address (location_id, country_code) values ($1, 'usa')`, [locationId]),
        CHECK,
      )
      await db.query(`insert into public.address (location_id, city, country_code) values ($1, 'Boston', 'US')`, [
        locationId,
      ])
      await assertPgError(db.query(`insert into public.address (location_id) values ($1)`, [locationId]), UNIQUE)
    }))

  await t.step('day_hours has one row per day, supports 24:00 and overnight hours', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await db.query(
        `insert into public.day_hours (location_id, day, open_time, close_time) values
           ($1, 'Monday', '00:00', '24:00'), ($1, 'Friday', '18:00', '02:00')`,
        [locationId],
      )
      await assertPgError(
        db.query(`insert into public.day_hours values ($1, 'Monday', '09:00', '17:00')`, [locationId]),
        UNIQUE,
      )
      await assertPgError(
        db.query(`insert into public.day_hours values ($1, 'Funday', '09:00', '17:00')`, [locationId]),
        FOREIGN_KEY,
      )
    }))

  await t.step('deleting a location removes everything under it', () =>
    withDb(async (db) => {
      const { locationId, seatingId } = await seed(db)
      await db.query(`insert into public.address (location_id, city) values ($1, 'Boston')`, [locationId])
      await db.query(`insert into public.day_hours values ($1, 'Monday', '09:00', '17:00')`, [locationId])
      const [{ review_id }] = await db.as(STUDENT).query<{ review_id: number }>(
        `insert into public.review (seating_id, overall_rating) values ($1, 5) returning review_id`,
        [seatingId],
      )
      await db.query(`insert into storage.objects (bucket_id, name) values ('post-photos', $1)`, [
        `${STUDENT}/cascade.jpg`,
      ])
      await db.as(STUDENT).query(
        `select public.create_post($1, $2, 3::smallint, null::smallint, null::real, null::text, $3)`,
        [locationId, seatingId, [`${STUDENT}/cascade.jpg`]],
      )
      await db.as(OTHER_STUDENT).query(`insert into public.flag (review_id, reason) values ($1, 'spam')`, [review_id])

      await db.query(`delete from public.location where location_id = $1`, [locationId])

      for (const table of [
        'address', 'day_hours', 'area', 'seating_area', 'overall_ratings', 'review', 'post', 'post_photo', 'flag',
      ]) {
        assertEquals(await db.query(`select * from public.${table}`), [], `${table} not emptied`)
      }
    }))
})

Deno.test('seating_area', async (t) => {
  await t.step('requires known seat type, capacity and outlet level', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const insert = (seatType: string, capacity: number, outlets: number) =>
        db.query(
          `insert into public.seating_area (location_id, name, seat_type, capacity_id, outlet_level_id)
           values ($1, 'x', $2, $3, $4)`,
          [locationId, seatType, capacity, outlets],
        )
      await assertPgError(insert('hammock', 1, 0), FOREIGN_KEY)
      await assertPgError(insert('desk', 99, 0), FOREIGN_KEY)
      await assertPgError(insert('desk', 1, 99), FOREIGN_KEY)
      await insert('desk', 1, 0)
    }))

  await t.step('area is optional but must belong to the same location', () =>
    withDb(async (db) => {
      const { areaId } = await seed(db)
      const [{ location_id: otherLocation }] = await db.query<{ location_id: number }>(
        `insert into public.location (name, latitude, longitude, location_type)
         values ('Other', 42, -71, 'cafe') returning location_id`,
      )
      const insert = (areaId: number | null) =>
        db.query(
          `insert into public.seating_area (location_id, area_id, name, seat_type, capacity_id, outlet_level_id)
           values ($1, $2, 'x', 'desk', 1, 0)`,
          [otherLocation, areaId],
        )
      await assertPgError(insert(areaId), FOREIGN_KEY)
      await insert(null)
    }))

  await t.step('deleting an area keeps its seating areas but clears area_id', () =>
    withDb(async (db) => {
      const { areaId, seatingId, locationId } = await seed(db)
      await db.query(`delete from public.area where area_id = $1`, [areaId])
      assertEquals(await db.query(`select area_id, location_id from public.seating_area where seating_id = $1`, [seatingId]), [
        { area_id: null, location_id: locationId },
      ])
    }))
})

Deno.test('reviews and overall_ratings', async (t) => {
  const ratings = (db: Parameters<Parameters<typeof withDb>[0]>[0], seatingId: number) =>
    db.query(
      `select average_rating, noise_rating, wifi_rating, comfort_rating, review_count
       from public.overall_ratings where seating_id = $1`,
      [seatingId],
    )

  await t.step('ratings must be between 1 and 5, overall is required', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      const review = (cols: string, values: string) =>
        db.as(STUDENT).query(`insert into public.review (seating_id, ${cols}) values ($1, ${values})`, [seatingId])
      await assertPgError(review('overall_rating', '0'), CHECK)
      await assertPgError(review('overall_rating', '6'), CHECK)
      await assertPgError(review('overall_rating, noise_rating', '3, 6'), CHECK)
      await assertPgError(review('noise_rating', '3'), NOT_NULL)
      await review('overall_rating, noise_rating, wifi_rating, comfort_rating', '1, 5, 5, 5')
    }))

  await t.step('overall_ratings is recalculated on insert, update and delete', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      assertEquals(await ratings(db, seatingId), [])

      await db.as(STUDENT).query(
        `insert into public.review (seating_id, overall_rating, noise_rating) values ($1, 5, 4)`,
        [seatingId],
      )
      const [{ review_id }] = await db.as(OTHER_STUDENT).query<{ review_id: number }>(
        `insert into public.review (seating_id, overall_rating, wifi_rating) values ($1, 2, 3) returning review_id`,
        [seatingId],
      )
      assertEquals(await ratings(db, seatingId), [
        { average_rating: '3.50', noise_rating: '4.00', wifi_rating: '3.00', comfort_rating: null, review_count: 2 },
      ])

      await db.as(OTHER_STUDENT).query(`update public.review set overall_rating = 4 where review_id = $1`, [review_id])
      assertEquals((await ratings(db, seatingId))[0].average_rating, '4.50')

      await db.as(OTHER_STUDENT).query(`delete from public.review where review_id = $1`, [review_id])
      assertEquals(await ratings(db, seatingId), [
        { average_rating: '5.00', noise_rating: '4.00', wifi_rating: null, comfort_rating: null, review_count: 1 },
      ])
    }))

  await t.step('moving a review to another seat updates both summaries', () =>
    withDb(async (db) => {
      const { seatingId, locationId } = await seed(db)
      const [{ seating_id: otherSeat }] = await db.query<{ seating_id: number }>(
        `insert into public.seating_area (location_id, name, seat_type, capacity_id, outlet_level_id)
         values ($1, 'Couches', 'couch', 2, 1) returning seating_id`,
        [locationId],
      )
      const [{ review_id }] = await db.as(STUDENT).query<{ review_id: number }>(
        `insert into public.review (seating_id, overall_rating) values ($1, 4) returning review_id`,
        [seatingId],
      )
      await db.query(`update public.review set seating_id = $1 where review_id = $2`, [otherSeat, review_id])

      assertEquals((await ratings(db, seatingId))[0].review_count, 0)
      assertEquals((await ratings(db, otherSeat))[0].review_count, 1)
    }))

  await t.step('users cannot write overall_ratings directly', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      await assertPgError(
        db.as(ADMIN).query(`insert into public.overall_ratings (seating_id, review_count) values ($1, 100)`, [seatingId]),
        INSUFFICIENT_PRIVILEGE,
      )
    }))
})

Deno.test('post', async (t) => {
  const photoPath = (userId: string, file = 'photo.jpg') => `${userId}/${file}`

  const putPhoto = (db: Parameters<Parameters<typeof withDb>[0]>[0], path: string) =>
    db.query(`insert into storage.objects (bucket_id, name) values ('post-photos', $1)`, [path])

  const createPost = (
    db: Parameters<Parameters<typeof withDb>[0]>[0],
    actor: string | null,
    locationId: number,
    paths: string[],
    fields: {
      seatingId?: number | null
      crowd?: number | null
      noise?: number | null
      wifi?: number | null
      caption?: string | null
    } = {},
  ) =>
    db.as(actor).query<{ post_id: number }>(
      `select public.create_post($1, $2, $3, $4, $5, $6, $7) as post_id`,
      [
        locationId,
        fields.seatingId === undefined ? null : fields.seatingId,
        fields.crowd === undefined ? 3 : fields.crowd,
        fields.noise === undefined ? null : fields.noise,
        fields.wifi === undefined ? null : fields.wifi,
        fields.caption === undefined ? null : fields.caption,
        paths,
      ],
    )

  const postCount = (db: Parameters<Parameters<typeof withDb>[0]>[0]) =>
    db.query<{ n: number }>('select count(*)::int as n from public.post')

  await t.step('needs a known crowd level, and noise and wifi are optional', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const path = photoPath(STUDENT)
      await putPhoto(db, path)
      const post = (crowd: number | null, noise: number | null, wifi: number | null) =>
        createPost(db, STUDENT, locationId, [path], { crowd, noise, wifi })
      await assertPgError(post(null, 2, 50), NOT_NULL)
      await assertPgError(post(9, 2, 50), FOREIGN_KEY)
      await assertPgError(post(3, 9, 50), FOREIGN_KEY)
      await assertPgError(post(3, 2, -1), CHECK)
      assertEquals(await postCount(db), [{ n: 0 }])
      await post(3, null, null)
    }))

  await t.step('rejects a caption longer than 500 characters', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const path = photoPath(STUDENT)
      await putPhoto(db, path)
      await assertPgError(createPost(db, STUDENT, locationId, [path], { caption: 'x'.repeat(501) }), CHECK)
      await createPost(db, STUDENT, locationId, [path], { caption: 'x'.repeat(500) })
    }))

  await t.step('cannot be created without a photo, a missing upload, or another user\'s folder', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await assertPgError(createPost(db, STUDENT, locationId, []), CHECK)
      await assertPgError(createPost(db, STUDENT, locationId, [photoPath(STUDENT, 'missing.jpg')]), FOREIGN_KEY)
      await putPhoto(db, photoPath(OTHER_STUDENT))
      await assertPgError(createPost(db, STUDENT, locationId, [photoPath(OTHER_STUDENT)]), INSUFFICIENT_PRIVILEGE)
      assertEquals(await postCount(db), [{ n: 0 }])
    }))

  await t.step('a direct insert without a photo fails when the constraint is checked', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      await db.query(`insert into public.post (user_id, location_id, crowd_level_id) values ($1, $2, 1)`, [
        STUDENT,
        locationId,
      ])
      await assertPgError(db.query('set constraints post_requires_photo immediate'), CHECK)
    }))

  await t.step('saves the post and its photos for the caller', () =>
    withDb(async (db) => {
      const { locationId, seatingId } = await seed(db)
      const paths = [photoPath(STUDENT, 'one.jpg'), photoPath(STUDENT, 'two.jpg')]
      await putPhoto(db, paths[0])
      await putPhoto(db, paths[1])
      const [{ post_id }] = await createPost(db, STUDENT, locationId, paths, {
        seatingId,
        noise: 2,
        wifi: 85.5,
        caption: 'Window seat',
      })

      assertEquals(
        await db.query(
          `select user_id, location_id, seating_id, crowd_level_id, noise_level_id, wifi_mbps, caption
           from public.post where post_id = $1`,
          [post_id],
        ),
        [{
          user_id: STUDENT,
          location_id: locationId,
          seating_id: seatingId,
          crowd_level_id: 3,
          noise_level_id: 2,
          wifi_mbps: 85.5,
          caption: 'Window seat',
        }],
      )
      assertEquals(
        await db.query(`select storage_path from public.post_photo where post_id = $1 order by storage_path`, [post_id]),
        [{ storage_path: paths[0] }, { storage_path: paths[1] }],
      )
      assertEquals(
        await db.query(
          `select u.name as author_name from public.post p
           join public.users u on u.user_id = p.user_id where p.post_id = $1`,
          [post_id],
        ),
        [{ author_name: 'Sam Student' }],
      )
    }))

  await t.step('a seat from another location is rejected and leaves no post', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const [{ location_id: otherLocation }] = await db.query<{ location_id: number }>(
        `insert into public.location (name, latitude, longitude, location_type)
         values ('Other', 42, -71, 'cafe') returning location_id`,
      )
      const [{ seating_id: otherSeat }] = await db.query<{ seating_id: number }>(
        `insert into public.seating_area (location_id, name, seat_type, capacity_id, outlet_level_id)
         values ($1, 'Other desks', 'desk', 1, 0) returning seating_id`,
        [otherLocation],
      )
      const path = photoPath(STUDENT)
      await putPhoto(db, path)
      await assertPgError(createPost(db, STUDENT, locationId, [path], { seatingId: otherSeat }), FOREIGN_KEY)
      assertEquals(await postCount(db), [{ n: 0 }])
    }))

  await t.step('newest post for a location comes first', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const olderPath = photoPath(STUDENT, 'older.jpg')
      const newerPath = photoPath(OTHER_STUDENT, 'newer.jpg')
      await putPhoto(db, olderPath)
      await putPhoto(db, newerPath)
      const [{ post_id: older }] = await createPost(db, STUDENT, locationId, [olderPath])
      const [{ post_id: newer }] = await createPost(db, OTHER_STUDENT, locationId, [newerPath])
      await db.query(`update public.post set created_at = now() - interval '1 hour' where post_id = $1`, [older])

      assertEquals(
        await db.query<{ post_id: number }>(
          `select post_id from public.post where location_id = $1 order by created_at desc`,
          [locationId],
        ),
        [{ post_id: newer }, { post_id: older }],
      )
    }))

  await t.step('signed-in users can read, and only the owner or an admin can delete', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const path = photoPath(STUDENT)
      await putPhoto(db, path)

      await assertPgError(db.as(null).query('select * from public.post'), INSUFFICIENT_PRIVILEGE)
      await assertPgError(db.as(null).query('select * from public.post_photo'), INSUFFICIENT_PRIVILEGE)
      await assertPgError(createPost(db, null, locationId, [path]), INSUFFICIENT_PRIVILEGE)
      await assertPgError(
        db.as(STUDENT).query(`insert into public.post (location_id, crowd_level_id) values ($1, 1)`, [locationId]),
        INSUFFICIENT_PRIVILEGE,
      )

      const [{ post_id }] = await createPost(db, STUDENT, locationId, [path])
      assertEquals((await db.as(OTHER_STUDENT).query('select * from public.post')).length, 1)
      assertEquals((await db.as(OTHER_STUDENT).query('select * from public.post_photo')).length, 1)
      assertEquals(await db.as(OTHER_STUDENT).query(`delete from public.post returning post_id`), [])
      await assertPgError(
        db.as(STUDENT).query(`update public.post set caption = 'nope' where post_id = $1`, [post_id]),
        INSUFFICIENT_PRIVILEGE,
      )

      assertEquals(await db.as(STUDENT).query(`delete from public.post where post_id = $1 returning post_id`, [post_id]), [
        { post_id },
      ])
      assertEquals(await db.query('select * from public.post_photo'), [])

      await putPhoto(db, photoPath(STUDENT, 'again.jpg'))
      await createPost(db, STUDENT, locationId, [photoPath(STUDENT, 'again.jpg')])
      assertEquals((await db.as(ADMIN).query(`delete from public.post returning post_id`)).length, 1)
    }))

  await t.step('signed-in users can upload post photos only into their own folder', () =>
    withDb(async (db) => {
      await seed(db)
      const insert = (actor: string | null, path: string) =>
        db.as(actor).query(`insert into storage.objects (bucket_id, name) values ('post-photos', $1)`, [path])

      await assertPgError(insert(null, photoPath(STUDENT, 'anon.jpg')), INSUFFICIENT_PRIVILEGE)
      await assertPgError(insert(STUDENT, photoPath(OTHER_STUDENT, 'stolen.jpg')), INSUFFICIENT_PRIVILEGE)
      await insert(STUDENT, photoPath(STUDENT, 'mine.jpg'))

      assertEquals(await db.as(null).query(`select name from storage.objects`), [])
      assertEquals(await db.as(OTHER_STUDENT).query<{ name: string }>(`select name from storage.objects`), [
        { name: photoPath(STUDENT, 'mine.jpg') },
      ])
      assertEquals(
        await db.as(OTHER_STUDENT).query(`delete from storage.objects returning name`),
        [],
      )
      assertEquals(await db.as(STUDENT).query(`delete from storage.objects returning name`), [
        { name: photoPath(STUDENT, 'mine.jpg') },
      ])
    }))

  await t.step('deleting the location or the author removes the post', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      const [{ location_id: otherLocation }] = await db.query<{ location_id: number }>(
        `insert into public.location (name, latitude, longitude, location_type)
         values ('Other', 42, -71, 'cafe') returning location_id`,
      )
      await putPhoto(db, photoPath(STUDENT, 'here.jpg'))
      await putPhoto(db, photoPath(OTHER_STUDENT, 'there.jpg'))
      await createPost(db, STUDENT, locationId, [photoPath(STUDENT, 'here.jpg')])
      await createPost(db, OTHER_STUDENT, otherLocation, [photoPath(OTHER_STUDENT, 'there.jpg')])

      await db.query(`delete from public.location where location_id = $1`, [locationId])
      assertEquals(await db.query<{ user_id: string }>('select user_id from public.post'), [{ user_id: OTHER_STUDENT }])

      await db.query(`delete from auth.users where id = $1`, [OTHER_STUDENT])
      assertEquals(await db.query('select * from public.post'), [])
      assertEquals(await db.query('select * from public.post_photo'), [])
    }))
})

Deno.test('review_photo', async (t) => {
  const photoPath = (userId: string, file = 'review.jpg') => `${userId}/${file}`

  const putReviewPhoto = (db: Parameters<Parameters<typeof withDb>[0]>[0], path: string) =>
    db.query(`insert into storage.objects (bucket_id, name) values ('review-photos', $1)`, [path])

  const attach = (
    db: Parameters<Parameters<typeof withDb>[0]>[0],
    actor: string | null,
    reviewId: number,
    paths: string[],
  ) =>
    db.as(actor).query(`select public.attach_review_photos($1, $2)`, [reviewId, paths])

  await t.step('reviews can exist with no photos', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      await db.as(STUDENT).query(`insert into public.review (seating_id, overall_rating) values ($1, 4)`, [seatingId])
      assertEquals(await db.query('select * from public.review_photo'), [])
    }))

  await t.step('attach is optional and links uploaded files to the author review', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      const path = photoPath(STUDENT)
      await putReviewPhoto(db, path)
      const [{ review_id }] = await db.as(STUDENT).query<{ review_id: number }>(
        `insert into public.review (seating_id, overall_rating) values ($1, 5) returning review_id`,
        [seatingId],
      )
      await attach(db, STUDENT, review_id, [path])
      assertEquals(
        await db.query(`select storage_path from public.review_photo where review_id = $1`, [review_id]),
        [{ storage_path: path }],
      )
    }))

  await t.step('empty paths are a no-op', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      const [{ review_id }] = await db.as(STUDENT).query<{ review_id: number }>(
        `insert into public.review (seating_id, overall_rating) values ($1, 3) returning review_id`,
        [seatingId],
      )
      await attach(db, STUDENT, review_id, [])
      assertEquals(await db.query('select * from public.review_photo'), [])
    }))

  await t.step('cannot attach to someone else review or from another user folder', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      const [{ review_id }] = await db.as(STUDENT).query<{ review_id: number }>(
        `insert into public.review (seating_id, overall_rating) values ($1, 3) returning review_id`,
        [seatingId],
      )
      await putReviewPhoto(db, photoPath(OTHER_STUDENT))
      await assertPgError(attach(db, OTHER_STUDENT, review_id, [photoPath(OTHER_STUDENT)]), INSUFFICIENT_PRIVILEGE)
      await putReviewPhoto(db, photoPath(STUDENT))
      await assertPgError(attach(db, STUDENT, review_id, [photoPath(OTHER_STUDENT)]), INSUFFICIENT_PRIVILEGE)
      assertEquals(await db.query('select * from public.review_photo'), [])
    }))

  await t.step('deleting a review removes its photos', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      const path = photoPath(STUDENT)
      await putReviewPhoto(db, path)
      const [{ review_id }] = await db.as(STUDENT).query<{ review_id: number }>(
        `insert into public.review (seating_id, overall_rating) values ($1, 2) returning review_id`,
        [seatingId],
      )
      await attach(db, STUDENT, review_id, [path])
      await db.as(STUDENT).query(`delete from public.review where review_id = $1`, [review_id])
      assertEquals(await db.query('select * from public.review_photo'), [])
    }))
})

Deno.test('flag', async (t) => {
  await t.step('must target something, and at most one of review or photo', () =>
    withDb(async (db) => {
      const { seatingId, locationId } = await seed(db)
      const [{ review_id }] = await db.as(OTHER_STUDENT).query<{ review_id: number }>(
        `insert into public.review (seating_id, overall_rating) values ($1, 1) returning review_id`,
        [seatingId],
      )
      await db.query(`insert into storage.objects (bucket_id, name) values ('post-photos', $1)`, [
        `${OTHER_STUDENT}/flag.jpg`,
      ])
      const [{ post_id }] = await db.as(OTHER_STUDENT).query<{ post_id: number }>(
        `select public.create_post($1, null::bigint, 3::smallint, null::smallint, null::real, null::text, $2) as post_id`,
        [locationId, [`${OTHER_STUDENT}/flag.jpg`]],
      )
      const [{ photo_id }] = await db.query<{ photo_id: number }>(
        `select photo_id from public.post_photo where post_id = $1`,
        [post_id],
      )
      const flag = (review: number | null, photo: number | null, user: string | null) =>
        db.as(STUDENT).query(
          `insert into public.flag (review_id, photo_id, reported_user_id, reason) values ($1, $2, $3, 'spam')`,
          [review, photo, user],
        )
      await assertPgError(flag(null, null, null), CHECK)
      await assertPgError(flag(review_id, photo_id, null), CHECK)
      await flag(review_id, null, OTHER_STUDENT)
      await flag(null, photo_id, null)
      await flag(null, null, OTHER_STUDENT)
    }))

  await t.step('status is restricted, and reporters can only submit pending flags', () =>
    withDb(async (db) => {
      await seed(db)
      await assertPgError(
        db.query(`insert into public.flag (user_id, reported_user_id, reason, status) values ($1, $2, 'x', 'maybe')`, [
          STUDENT,
          OTHER_STUDENT,
        ]),
        CHECK,
      )
      await assertPgError(
        db.as(STUDENT).query(
          `insert into public.flag (reported_user_id, reason, status) values ($1, 'x', 'resolved')`,
          [OTHER_STUDENT],
        ),
        INSUFFICIENT_PRIVILEGE,
      )
    }))

  await t.step('only the reporter and admins can see flags, and only admins can resolve them', () =>
    withDb(async (db) => {
      await seed(db)
      const [{ flag_id }] = await db.as(STUDENT).query<{ flag_id: number }>(
        `insert into public.flag (reported_user_id, reason) values ($1, 'rude') returning flag_id`,
        [OTHER_STUDENT],
      )
      assertEquals((await db.as(STUDENT).query('select * from public.flag')).length, 1)
      assertEquals((await db.as(ADMIN).query('select * from public.flag')).length, 1)
      assertEquals(await db.as(OTHER_STUDENT).query('select * from public.flag'), [])
      assertEquals(await db.as(null).query('select * from public.flag'), [])

      assertEquals(
        await db.as(STUDENT).query(`update public.flag set status = 'dismissed' where flag_id = $1 returning flag_id`, [
          flag_id,
        ]),
        [],
      )
      assertEquals(
        await db.as(ADMIN).query(`update public.flag set status = 'resolved' where flag_id = $1 returning status`, [
          flag_id,
        ]),
        [{ status: 'resolved' }],
      )
    }))

  await t.step('deleting a reported user removes flags about them', () =>
    withDb(async (db) => {
      await seed(db)
      await db.as(STUDENT).query(`insert into public.flag (reported_user_id, reason) values ($1, 'rude')`, [OTHER_STUDENT])
      await db.query(`delete from auth.users where id = $1`, [OTHER_STUDENT])
      assertEquals(await db.query('select * from public.flag'), [])
    }))
})

Deno.test('follow', () =>
  withDb(async (db) => {
    await seed(db)
    await db.as(STUDENT).query(`insert into public.follow (following_id) values ($1)`, [ADMIN])
    await assertPgError(db.as(STUDENT).query(`insert into public.follow (following_id) values ($1)`, [ADMIN]), UNIQUE)
    await assertPgError(db.as(STUDENT).query(`insert into public.follow (following_id) values ($1)`, [STUDENT]), CHECK)
    await assertPgError(
      db.as(STUDENT).query(`insert into public.follow (follower_id, following_id) values ($1, $2)`, [
        OTHER_STUDENT,
        ADMIN,
      ]),
      INSUFFICIENT_PRIVILEGE,
    )
    assertEquals(await db.as(OTHER_STUDENT).query(`delete from public.follow returning follower_id`), [])
    assertEquals(await db.as(STUDENT).query(`delete from public.follow returning follower_id`), [{ follower_id: STUDENT }])
  }))

Deno.test('row level security', async (t) => {
  await t.step('anyone can read the catalog, only admins can change it', () =>
    withDb(async (db) => {
      const { locationId } = await seed(db)
      assertEquals((await db.as(null).query('select * from public.location')).length, 1)
      assertEquals((await db.as(null).query('select * from public.campus')).length > 0, true)

      await assertPgError(
        db.as(STUDENT).query(
          `insert into public.location (name, latitude, longitude, location_type) values ('x', 1, 1, 'cafe')`,
        ),
        INSUFFICIENT_PRIVILEGE,
      )
      await assertPgError(db.as(STUDENT).query(`insert into public.campus values ('Fake U')`), INSUFFICIENT_PRIVILEGE)
      assertEquals(await db.as(STUDENT).query(`delete from public.location returning location_id`), [])
      assertEquals(
        await db.as(null).query(`update public.location set name = 'x' returning location_id`),
        [],
      )

      await db.as(ADMIN).query(`update public.location set name = 'Snell' where location_id = $1`, [locationId])
      await db.as(ADMIN).query(`insert into public.campus values ('Fake U')`)
    }))

  await t.step('users manage only their own reviews', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      await assertPgError(
        db.as(STUDENT).query(`insert into public.review (user_id, seating_id, overall_rating) values ($1, $2, 1)`, [
          OTHER_STUDENT,
          seatingId,
        ]),
        INSUFFICIENT_PRIVILEGE,
      )
      await assertPgError(
        db.as(null).query(`insert into public.review (seating_id, overall_rating) values ($1, 1)`, [seatingId]),
        INSUFFICIENT_PRIVILEGE,
      )

      await db.as(OTHER_STUDENT).query(`insert into public.review (seating_id, overall_rating) values ($1, 2)`, [seatingId])

      assertEquals((await db.as(null).query('select * from public.review')).length, 1)
      assertEquals(await db.as(STUDENT).query(`delete from public.review returning 1`), [])
      assertEquals(await db.as(STUDENT).query(`update public.review set overall_rating = 5 returning 1`), [])
    }))

  await t.step('admins can moderate reviews and posts', () =>
    withDb(async (db) => {
      const { seatingId, locationId } = await seed(db)
      await db.as(STUDENT).query(`insert into public.review (seating_id, overall_rating) values ($1, 2)`, [seatingId])
      await db.query(`insert into storage.objects (bucket_id, name) values ('post-photos', $1)`, [
        `${STUDENT}/moderate.jpg`,
      ])
      await db.as(STUDENT).query(
        `select public.create_post($1, null::bigint, 3::smallint, null::smallint, null::real, null::text, $2)`,
        [locationId, [`${STUDENT}/moderate.jpg`]],
      )
      assertEquals((await db.as(ADMIN).query(`delete from public.review returning 1`)).length, 1)
      assertEquals((await db.as(ADMIN).query(`delete from public.post returning 1`)).length, 1)
    }))
})

Deno.test('nearby_locations', async (t) => {
  type DbArg = Parameters<Parameters<typeof withDb>[0]>[0]
  const RAISE = 'P0001'
  // Snell Library. 0.001 degrees of latitude is about 111 m.
  const here = { lat: 42.338, lon: -71.088 }

  const insert = async (db: DbArg, name: string, latitude: number, fields: Record<string, unknown> = {}) => {
    const row = { name, latitude, longitude: here.lon, location_type: 'cafe', ...fields }
    const cols = Object.keys(row)
    const [{ location_id }] = await db.query<{ location_id: number }>(
      `insert into public.location (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       returning location_id`,
      Object.values(row),
    )
    return location_id
  }

  const nearby = (db: DbArg, args: Record<string, unknown> = {}) => {
    const all = { lat: here.lat, lon: here.lon, radius_m: 500, ...args }
    const keys = Object.keys(all)
    return db.as(null).query<{ location_id: number; name: string; latitude: number; longitude: number }>(
      `select location_id, name, latitude, longitude
       from public.nearby_locations(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')})`,
      Object.values(all),
    )
  }
  const names = async (db: DbArg, args: Record<string, unknown> = {}) => (await nearby(db, args)).map((r) => r.name)

  await t.step('geo_location is computed from latitude and longitude', () =>
    withDb(async (db) => {
      const id = await insert(db, 'Cafe', 42.3)
      const point = (sql: string) =>
        db.query<{ lat: number; lon: number }>(sql, [id]).then(([r]) => r)
      const select = `select extensions.ST_Y(geo_location::extensions.geometry) as lat,
                             extensions.ST_X(geo_location::extensions.geometry) as lon
                      from public.location where location_id = $1`
      assertEquals(await point(select), { lat: 42.3, lon: here.lon })
      await db.query(`update public.location set latitude = 40, longitude = -70 where location_id = $1`, [id])
      assertEquals(await point(select), { lat: 40, lon: -70 })
    }))

  await t.step('every location has coordinates and a geo_location', () =>
    withDb(async (db) => {
      await assertPgError(insert(db, 'No latitude', null as unknown as number), NOT_NULL)
      await assertPgError(insert(db, 'No longitude', 42.3, { longitude: null }), NOT_NULL)
      const [{ notnull }] = await db.query<{ notnull: boolean }>(
        `select attnotnull as notnull from pg_attribute
         where attrelid = 'public.location'::regclass and attname = 'geo_location'`,
      )
      assertEquals(notnull, true)
    }))

  await t.step('returns locations within the radius, nearest first', () =>
    withDb(async (db) => {
      await insert(db, 'Far', 42.348) // ~1.1 km
      await insert(db, 'Mid', 42.340) // ~222 m
      await insert(db, 'Here', 42.338)
      await insert(db, 'Near', 42.339) // ~111 m
      assertEquals(await names(db), ['Here', 'Near', 'Mid'])
      assertEquals(await names(db, { radius_m: 150 }), ['Here', 'Near'])
      assertEquals(await names(db, { radius_m: 2000 }), ['Here', 'Near', 'Mid', 'Far'])
    }))

  await t.step('breaks distance ties by location_id', () =>
    withDb(async (db) => {
      const ids = [await insert(db, 'A', 42.339), await insert(db, 'B', 42.339), await insert(db, 'C', 42.339)]
      assertEquals((await nearby(db)).map((r) => r.location_id), ids)
    }))

  await t.step('filters by campus, location type, price range and name', () =>
    withDb(async (db) => {
      await insert(db, 'Snell Library', 42.338, { location_type: 'library', campus: 'Northeastern University' })
      await insert(db, 'Tatte Bakery', 42.339, { campus: 'Northeastern University', price_range_id: 2 })
      await insert(db, 'Pavement', 42.340, { campus: 'MIT', price_range_id: 1 })

      assertEquals(await names(db, { campus_filter: 'Northeastern University' }), ['Snell Library', 'Tatte Bakery'])
      assertEquals(await names(db, { location_type_filter: 'cafe' }), ['Tatte Bakery', 'Pavement'])
      assertEquals(await names(db, { price_range_filter: 1 }), ['Pavement'])
      assertEquals(await names(db, { name_filter: 'LIBR' }), ['Snell Library'])
      assertEquals(
        await names(db, { campus_filter: 'Northeastern University', location_type_filter: 'cafe', price_range_filter: 2 }),
        ['Tatte Bakery'],
      )
      assertEquals(await names(db, { campus_filter: 'MIT', location_type_filter: 'library' }), [])
    }))

  await t.step('name filter matches LIKE wildcards literally', () =>
    withDb(async (db) => {
      await insert(db, '100% Cafe', 42.338)
      await insert(db, '100 Cafe', 42.338)
      await insert(db, 'Cafe_One', 42.339)
      await insert(db, 'CafeXOne', 42.339)
      await insert(db, 'Back\\slash', 42.340)
      await insert(db, 'Backslash', 42.340)
      assertEquals(await names(db, { name_filter: '%' }), ['100% Cafe'])
      assertEquals(await names(db, { name_filter: '_' }), ['Cafe_One'])
      assertEquals(await names(db, { name_filter: '\\' }), ['Back\\slash'])
    }))

  await t.step('the cursor continues after the previous page without gaps or duplicates', () =>
    withDb(async (db) => {
      // Three at the same distance so a page boundary falls inside a tie.
      for (const [name, lat] of [['A', 42.338], ['B', 42.339], ['C', 42.339], ['D', 42.339], ['E', 42.340]] as const) {
        await insert(db, name, lat)
      }
      const everything = await names(db)
      assertEquals(everything.length, 5)

      const seen: string[] = []
      let after: { after_latitude: number; after_longitude: number; after_location_id: number } | undefined
      for (let i = 0; i < 10; i++) {
        const page = await nearby(db, { page_size: 2, ...after })
        if (page.length === 0) break
        seen.push(...page.map((r) => r.name))
        const last = page[page.length - 1]
        after = { after_latitude: last.latitude, after_longitude: last.longitude, after_location_id: last.location_id }
      }
      assertEquals(seen, everything)
    }))

  await t.step('page_size limits the number of rows', () =>
    withDb(async (db) => {
      for (let i = 0; i < 5; i++) await insert(db, `Cafe ${i}`, 42.338)
      assertEquals((await nearby(db, { page_size: 3 })).length, 3)
      assertEquals((await nearby(db)).length, 5)
    }))

  await t.step('rejects invalid input', () =>
    withDb(async (db) => {
      for (
        const args of [
          { lat: 91 },
          { lat: -91 },
          { lat: null },
          { lon: 181 },
          { lon: -181 },
          { radius_m: 0 },
          { radius_m: -5 },
          { page_size: 0 },
          { page_size: 101 },
          { after_location_id: 1 },
          { after_latitude: 42, after_longitude: -71 },
        ]
      ) {
        await assertPgError(nearby(db, args), RAISE)
      }
      await nearby(db, { lat: 90, lon: -180, page_size: 100 })
    }))
})

Deno.test('upsert_osm_places', async (t) => {
  type DbArg = Parameters<Parameters<typeof withDb>[0]>[0]
  const place = {
    osm_type: 'way',
    osm_id: 29566437,
    name: 'Snell Library',
    latitude: 42.338,
    longitude: -71.088,
    default_location_type: 'library',
    campus: 'Northeastern University',
    address: {
      street_one: '360 Huntington Avenue',
      street_two: null,
      city: 'Boston',
      region: 'MA',
      postal_code: '02115',
      country_code: 'US',
    },
    hours: [
      { day: 'Monday', open_time: '00:00', close_time: '24:00' },
      { day: 'Friday', open_time: '08:00', close_time: '02:00' },
    ],
  }
  const upsert = (db: DbArg, actor: string | null | undefined, places: unknown) => {
    const q = actor === undefined ? db : db.as(actor)
    return q.query<{ id: number }>('select id from public.upsert_osm_places($1) as id', [places])
  }
  const location = (db: DbArg, id: number) =>
    db.query(
      `select osm_type, osm_id, name, latitude, location_type, campus, price_range_id
       from public.location where location_id = $1`,
      [id],
    )

  await t.step('only admins and the service role can import', () =>
    withDb(async (db) => {
      await seed(db)
      await assertPgError(upsert(db, null, [place]), INSUFFICIENT_PRIVILEGE)
      await assertPgError(upsert(db, STUDENT, [place]), INSUFFICIENT_PRIVILEGE)
      assertEquals((await upsert(db, ADMIN, [place])).length, 1)
      const [{ allowed }] = await db.query<{ allowed: boolean }>(
        `select has_function_privilege('service_role', 'public.upsert_osm_places(jsonb)', 'execute') as allowed`,
      )
      assertEquals(allowed, true)
    }))

  await t.step('creates locations with address and hours, returning ids in order', () =>
    withDb(async (db) => {
      const cafe = { ...place, osm_type: 'node', osm_id: 1, name: 'Tatte', default_location_type: 'cafe', campus: null }
      const [{ id }, { id: cafeId }] = await upsert(db, undefined, [place, { ...cafe, address: null, hours: null }])

      assertEquals(await location(db, id), [{
        osm_type: 'way',
        osm_id: 29566437,
        name: 'Snell Library',
        latitude: 42.338,
        location_type: 'library',
        campus: 'Northeastern University',
        price_range_id: null,
      }])
      assertEquals((await location(db, cafeId))[0].name, 'Tatte')
      assertEquals(await db.query(`select city, country_code from public.address where location_id = $1`, [id]), [
        { city: 'Boston', country_code: 'US' },
      ])
      assertEquals(
        await db.query(`select day, open_time, close_time from public.day_hours where location_id = $1 order by day`, [id]),
        [
          { day: 'Friday', open_time: '08:00:00', close_time: '02:00:00' },
          { day: 'Monday', open_time: '00:00:00', close_time: '24:00:00' },
        ],
      )
      assertEquals(await db.query(`select * from public.address where location_id = $1`, [cafeId]), [])
    }))

  await t.step('falls back to other when no type is given', () =>
    withDb(async (db) => {
      const [{ id }] = await upsert(db, undefined, [{ ...place, default_location_type: null }])
      assertEquals((await location(db, id))[0].location_type, 'other')
    }))

  await t.step('re-importing refreshes OSM fields but keeps manual type, campus and price', () =>
    withDb(async (db) => {
      const [{ id }] = await upsert(db, undefined, [place])
      await db.query(
        `update public.location set location_type = 'campus_building', campus = 'MIT', price_range_id = 0
         where location_id = $1`,
        [id],
      )
      const [{ id: again }] = await upsert(db, undefined, [{
        ...place,
        name: 'Snell Library (renamed)',
        latitude: 42.339,
        default_location_type: 'cafe',
        campus: 'Northeastern University',
        address: { ...place.address, street_one: '1 New St' },
        hours: [{ day: 'Tuesday', open_time: '09:00', close_time: '17:00' }],
      }])

      assertEquals(again, id)
      assertEquals(await location(db, id), [{
        osm_type: 'way',
        osm_id: 29566437,
        name: 'Snell Library (renamed)',
        latitude: 42.339,
        location_type: 'campus_building',
        campus: 'MIT',
        price_range_id: 0,
      }])
      assertEquals(await db.query(`select street_one from public.address where location_id = $1`, [id]), [
        { street_one: '1 New St' },
      ])
      assertEquals(await db.query(`select day from public.day_hours where location_id = $1`, [id]), [{ day: 'Tuesday' }])
      assertEquals((await db.query('select * from public.location')).length, 1)
    }))

  await t.step('re-importing fills in a missing campus', () =>
    withDb(async (db) => {
      const [{ id }] = await upsert(db, undefined, [{ ...place, campus: null }])
      await upsert(db, undefined, [place])
      assertEquals((await location(db, id))[0].campus, 'Northeastern University')
    }))

  await t.step('missing hours or address leaves existing data alone, an empty week clears hours', () =>
    withDb(async (db) => {
      const [{ id }] = await upsert(db, undefined, [place])
      await upsert(db, undefined, [{ ...place, hours: null, address: null }])
      assertEquals((await db.query(`select * from public.day_hours where location_id = $1`, [id])).length, 2)
      assertEquals((await db.query(`select * from public.address where location_id = $1`, [id])).length, 1)
      await upsert(db, undefined, [{ ...place, hours: [] }])
      assertEquals(await db.query(`select * from public.day_hours where location_id = $1`, [id]), [])
    }))

  await t.step('the same id with a different element type is a different location', () =>
    withDb(async (db) => {
      const ids = await upsert(db, undefined, [place, { ...place, osm_type: 'node' }])
      assertEquals(new Set(ids.map((r) => r.id)).size, 2)
    }))

  await t.step('a failing place rolls back the whole batch', () =>
    withDb(async (db) => {
      await assertPgError(upsert(db, undefined, [place, { ...place, osm_id: 2, campus: 'Hogwarts' }]), FOREIGN_KEY)
      assertEquals(await db.query('select * from public.location'), [])
    }))

  await t.step('rejects payloads that are not an array', () =>
    withDb(async (db) => {
      await assertPgError(upsert(db, undefined, place), 'P0001')
    }))

  await t.step('osm_type and osm_id are validated and set together', () =>
    withDb(async (db) => {
      const insert = (osmType: string | null, osmId: number | null) =>
        db.query(
          `insert into public.location (name, latitude, longitude, location_type, osm_type, osm_id)
           values ('x', 42, -71, 'cafe', $1, $2)`,
          [osmType, osmId],
        )
      await assertPgError(insert('area', 1), CHECK)
      await assertPgError(insert('node', 0), CHECK)
      await assertPgError(insert('node', null), CHECK)
      await assertPgError(insert(null, 1), CHECK)
      await insert('node', 1)
      await assertPgError(insert('node', 1), UNIQUE)
      await insert(null, null)
      await insert(null, null)
    }))
})
