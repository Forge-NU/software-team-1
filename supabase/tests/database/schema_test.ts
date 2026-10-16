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
    // google.ts maps Google types onto these names.
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

  await t.step('google_place_id is unique', () =>
    withDb(async (db) => {
      await db.query(...insert({ google_place_id: 'ChIJ1' }))
      await assertPgError(db.query(...insert({ google_place_id: 'ChIJ1' })), UNIQUE)
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
      await db.as(STUDENT).query(`insert into public.photo (seating_id, image_url) values ($1, 'https://x/p.jpg')`, [
        seatingId,
      ])
      await db.as(STUDENT).query(`insert into public.check_in (seating_id, crowd_level_id) values ($1, 3)`, [seatingId])
      await db.as(OTHER_STUDENT).query(`insert into public.flag (review_id, reason) values ($1, 'spam')`, [review_id])

      await db.query(`delete from public.location where location_id = $1`, [locationId])

      for (const table of [
        'address', 'day_hours', 'area', 'seating_area', 'overall_ratings', 'review', 'photo', 'check_in', 'flag',
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

Deno.test('check_in', () =>
  withDb(async (db) => {
    const { seatingId } = await seed(db)
    const checkIn = (crowd: number | null, noise: number | null, wifi: number | null) =>
      db.as(STUDENT).query(
        `insert into public.check_in (seating_id, crowd_level_id, noise_level_id, wifi_mbps) values ($1, $2, $3, $4)`,
        [seatingId, crowd, noise, wifi],
      )
    await assertPgError(checkIn(null, 2, 50), NOT_NULL)
    await assertPgError(checkIn(9, 2, 50), FOREIGN_KEY)
    await assertPgError(checkIn(3, 9, 50), FOREIGN_KEY)
    await assertPgError(checkIn(3, 2, -1), CHECK)
    await checkIn(3, null, null)
    await checkIn(3, 2, 85.5)

    const rows = await db.query<{ user_id: string }>('select user_id from public.check_in')
    assertEquals(rows.every((r) => r.user_id === STUDENT), true, 'user_id should default to the caller')
  }))

Deno.test('flag', async (t) => {
  await t.step('must target something, and at most one of review or photo', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      const [{ review_id }] = await db.as(OTHER_STUDENT).query<{ review_id: number }>(
        `insert into public.review (seating_id, overall_rating) values ($1, 1) returning review_id`,
        [seatingId],
      )
      const [{ photo_id }] = await db.as(OTHER_STUDENT).query<{ photo_id: number }>(
        `insert into public.photo (seating_id, image_url) values ($1, 'https://x/p.jpg') returning photo_id`,
        [seatingId],
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

  await t.step('users manage only their own reviews, photos and check-ins', () =>
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
      await db.as(OTHER_STUDENT).query(`insert into public.photo (seating_id, image_url) values ($1, 'https://x')`, [
        seatingId,
      ])
      await db.as(OTHER_STUDENT).query(`insert into public.check_in (seating_id, crowd_level_id) values ($1, 1)`, [
        seatingId,
      ])

      assertEquals((await db.as(null).query('select * from public.review')).length, 1)
      for (const table of ['review', 'photo', 'check_in']) {
        assertEquals(await db.as(STUDENT).query(`delete from public.${table} returning 1`), [], table)
      }
      assertEquals(await db.as(STUDENT).query(`update public.review set overall_rating = 5 returning 1`), [])
    }))

  await t.step('admins can moderate reviews and photos', () =>
    withDb(async (db) => {
      const { seatingId } = await seed(db)
      await db.as(STUDENT).query(`insert into public.review (seating_id, overall_rating) values ($1, 2)`, [seatingId])
      await db.as(STUDENT).query(`insert into public.photo (seating_id, image_url) values ($1, 'https://x')`, [seatingId])
      assertEquals((await db.as(ADMIN).query(`delete from public.review returning 1`)).length, 1)
      assertEquals((await db.as(ADMIN).query(`delete from public.photo returning 1`)).length, 1)
    }))
})

Deno.test('upsert_google_place', async (t) => {
  const place = {
    google_place_id: 'ChIJsnell',
    name: 'Snell Library',
    latitude: 42.338,
    longitude: -71.088,
    default_location_type: 'library',
    location_type: null,
    campus: 'Northeastern University',
    price_range_id: 0,
    address: {
      street_one: '360 Huntington Ave',
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
  const upsert = (db: Parameters<Parameters<typeof withDb>[0]>[0], actor: string | null, payload: unknown) =>
    db.as(actor).query<{ id: number }>('select public.upsert_google_place($1) as id', [payload])

  await t.step('only admins can import', () =>
    withDb(async (db) => {
      await seed(db)
      await assertPgError(upsert(db, null, place), INSUFFICIENT_PRIVILEGE)
      await assertPgError(upsert(db, STUDENT, place), INSUFFICIENT_PRIVILEGE)
    }))

  await t.step('creates a location with address and hours', () =>
    withDb(async (db) => {
      await seed(db)
      const [{ id }] = await upsert(db, ADMIN, place)

      assertEquals(
        await db.query(
          `select name, location_type, campus, price_range_id from public.location where location_id = $1`,
          [id],
        ),
        [{ name: 'Snell Library', location_type: 'library', campus: 'Northeastern University', price_range_id: 0 }],
      )
      assertEquals(await db.query(`select city, country_code from public.address where location_id = $1`, [id]), [
        { city: 'Boston', country_code: 'US' },
      ])
      assertEquals(
        await db.query(`select day, open_time, close_time from public.day_hours where location_id = $1 order by day`, [
          id,
        ]),
        [
          { day: 'Friday', open_time: '08:00:00', close_time: '02:00:00' },
          { day: 'Monday', open_time: '00:00:00', close_time: '24:00:00' },
        ],
      )
    }))

  await t.step('re-importing updates Google fields but keeps manual classification', () =>
    withDb(async (db) => {
      await seed(db)
      const [{ id }] = await upsert(db, ADMIN, place)
      await db.as(ADMIN).query(`update public.location set location_type = 'campus_building' where location_id = $1`, [id])

      const [{ id: again }] = await upsert(db, ADMIN, {
        ...place,
        name: 'Snell Library (renamed)',
        campus: null,
        price_range_id: null,
        address: { ...place.address, street_one: '1 New St' },
        hours: [{ day: 'Tuesday', open_time: '09:00', close_time: '17:00' }],
      })

      assertEquals(again, id)
      assertEquals(
        await db.query(`select name, location_type, campus, price_range_id from public.location where location_id = $1`, [
          id,
        ]),
        [{ name: 'Snell Library (renamed)', location_type: 'campus_building', campus: 'Northeastern University', price_range_id: null }],
      )
      assertEquals(await db.query(`select street_one from public.address where location_id = $1`, [id]), [
        { street_one: '1 New St' },
      ])
      assertEquals(await db.query(`select day from public.day_hours where location_id = $1`, [id]), [{ day: 'Tuesday' }])
    }))

  await t.step('explicit overrides replace the classification', () =>
    withDb(async (db) => {
      await seed(db)
      const [{ id }] = await upsert(db, ADMIN, place)
      await upsert(db, ADMIN, { ...place, location_type: 'coworking', campus: 'MIT' })
      assertEquals(await db.query(`select location_type, campus from public.location where location_id = $1`, [id]), [
        { location_type: 'coworking', campus: 'MIT' },
      ])
    }))

  await t.step('missing hours or address leaves existing data alone', () =>
    withDb(async (db) => {
      await seed(db)
      const [{ id }] = await upsert(db, ADMIN, place)
      await upsert(db, ADMIN, { ...place, hours: null, address: null })
      assertEquals((await db.query(`select * from public.day_hours where location_id = $1`, [id])).length, 2)
      assertEquals((await db.query(`select * from public.address where location_id = $1`, [id])).length, 1)
    }))

  await t.step('falls back to other when no type is given', () =>
    withDb(async (db) => {
      await seed(db)
      const [{ id }] = await upsert(db, ADMIN, { ...place, default_location_type: null })
      assertEquals(await db.query(`select location_type from public.location where location_id = $1`, [id]), [
        { location_type: 'other' },
      ])
    }))

  await t.step('rejects unknown location types and campuses', () =>
    withDb(async (db) => {
      await seed(db)
      await assertPgError(upsert(db, ADMIN, { ...place, location_type: 'spaceship' }), FOREIGN_KEY)
      await assertPgError(upsert(db, ADMIN, { ...place, campus: 'Hogwarts' }), FOREIGN_KEY)
    }))
})
