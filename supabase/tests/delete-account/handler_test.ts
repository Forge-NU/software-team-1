import { assertEquals, assertRejects } from 'jsr:@std/assert@1'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  createHandler,
  deleteAuthUser,
  HttpError,
  isUserAlreadyDeleted,
  PHOTO_BUCKETS,
  removeFolder,
  removeUserStorage,
} from '../../functions/delete-account/handler.ts'

const USER_A = '11111111-1111-1111-1111-111111111111'
const USER_B = '22222222-2222-2222-2222-222222222222'
const AUTH_A = 'Bearer user-a-jwt'

type Stored = Record<string, string[]>

/** Minimal Storage surface: list/remove by path prefix under each bucket. */
function fakeStorageClient(objects: Stored): SupabaseClient {
  return {
    storage: {
      from(bucket: string) {
        return {
          async list(folder: string, opts?: { limit?: number; offset?: number }) {
            const paths = objects[bucket] ?? []
            const prefix = `${folder}/`
            const names = new Map<string, { name: string; id: string | null }>()
            for (const path of paths) {
              if (!path.startsWith(prefix)) continue
              const rest = path.slice(prefix.length)
              const slash = rest.indexOf('/')
              if (slash === -1) {
                names.set(rest, { name: rest, id: `id-${path}` })
              } else {
                const dir = rest.slice(0, slash)
                if (!names.has(dir)) names.set(dir, { name: dir, id: null })
              }
            }
            const all = [...names.values()]
            const offset = opts?.offset ?? 0
            const limit = opts?.limit ?? 100
            return { data: all.slice(offset, offset + limit), error: null }
          },
          async remove(paths: string[]) {
            objects[bucket] = (objects[bucket] ?? []).filter((p) => !paths.includes(p))
            return { data: paths.map((path) => ({ name: path })), error: null }
          },
        }
      },
    },
  } as unknown as SupabaseClient
}

function fakeAdminClient(users: Set<string>, deleteError?: { status?: number; message: string; code?: string }) {
  return {
    auth: {
      admin: {
        async deleteUser(userId: string) {
          if (deleteError) return { data: { user: null }, error: deleteError }
          if (!users.has(userId)) {
            return { data: { user: null }, error: { status: 404, message: 'User not found' } }
          }
          users.delete(userId)
          return { data: { user: null }, error: null }
        },
      },
    },
  } as unknown as SupabaseClient
}

Deno.test('removeFolder / removeUserStorage', async (t) => {
  await t.step('removes every object under the user prefix in both buckets', async () => {
    const objects: Stored = {
      'post-photos': [`${USER_A}/a.jpg`, `${USER_A}/b.png`, `${USER_B}/keep.jpg`],
      'review-photos': [`${USER_A}/r.jpg`, `${USER_B}/other.jpg`],
    }
    const client = fakeStorageClient(objects)
    await removeUserStorage(client, USER_A)
    assertEquals(objects['post-photos'], [`${USER_B}/keep.jpg`])
    assertEquals(objects['review-photos'], [`${USER_B}/other.jpg`])
  })

  await t.step('paginates when a folder has more than one page of files', async () => {
    const many = Array.from({ length: 250 }, (_, i) => `${USER_A}/f${i}.jpg`)
    const objects: Stored = { 'post-photos': [...many] }
    const client = fakeStorageClient(objects)
    await removeFolder(client, 'post-photos', USER_A)
    assertEquals(objects['post-photos'], [])
  })

  await t.step('removes nested folders under the user prefix', async () => {
    const objects: Stored = {
      'post-photos': [`${USER_A}/nested/deep.jpg`, `${USER_A}/top.jpg`],
    }
    await removeUserStorage(fakeStorageClient(objects), USER_A, ['post-photos'])
    assertEquals(objects['post-photos'], [])
  })
})

Deno.test('deleteAuthUser', async (t) => {
  await t.step('removes the auth user', async () => {
    const users = new Set([USER_A, USER_B])
    await deleteAuthUser(fakeAdminClient(users), USER_A)
    assertEquals([...users], [USER_B])
  })

  await t.step('treats an already-deleted user as success', async () => {
    const users = new Set([USER_B])
    await deleteAuthUser(fakeAdminClient(users), USER_A)
    assertEquals([...users], [USER_B])
  })

  await t.step('isUserAlreadyDeleted matches 404 / not-found shapes', () => {
    assertEquals(isUserAlreadyDeleted({ status: 404, message: 'x' }), true)
    assertEquals(isUserAlreadyDeleted({ code: 'user_not_found', message: 'x' }), true)
    assertEquals(isUserAlreadyDeleted({ message: 'User not found' }), true)
    assertEquals(isUserAlreadyDeleted({ message: 'network down' }), false)
  })

  await t.step('surfaces unexpected admin errors', async () => {
    await assertRejects(
      () =>
        deleteAuthUser(
          fakeAdminClient(new Set([USER_A]), { status: 500, message: 'auth down' }),
          USER_A,
        ),
      HttpError,
      'auth down',
    )
  })
})

Deno.test('POST /delete-account', async (t) => {
  function makeHandler(opts: {
    callerId?: string | null
    objects?: Stored
    users?: Set<string>
    removed?: string[]
    deleted?: string[]
  }) {
    const objects = opts.objects ?? {
      'post-photos': [`${USER_A}/a.jpg`, `${USER_B}/b.jpg`],
      'review-photos': [`${USER_A}/r.jpg`],
    }
    const users = opts.users ?? new Set([USER_A, USER_B])
    const removed = opts.removed ?? []
    const deleted = opts.deleted ?? []
    const storage = fakeStorageClient(objects)
    const admin = fakeAdminClient(users)

    const handler = createHandler(() => ({
      getCallerId: async (authorization) => {
        if (opts.callerId !== undefined) return opts.callerId
        return authorization === AUTH_A ? USER_A : null
      },
      removeUserStorage: async (userId) => {
        removed.push(userId)
        await removeUserStorage(storage, userId)
      },
      deleteAuthUser: async (userId) => {
        deleted.push(userId)
        await deleteAuthUser(admin, userId)
      },
    }))

    return { handler, objects, users, removed, deleted }
  }

  function request(
    handler: (req: Request) => Promise<Response>,
    init: { method?: string; authorization?: string | null; body?: unknown } = {},
  ) {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    if (init.authorization !== null) {
      headers.set('Authorization', init.authorization ?? AUTH_A)
    }
    return handler(
      new Request('http://supabase.test/functions/v1/delete-account', {
        method: init.method ?? 'POST',
        headers,
        body: init.body === undefined
          ? undefined
          : typeof init.body === 'string'
          ? init.body
          : JSON.stringify(init.body),
      }),
    )
  }

  await t.step('answers CORS preflight', async () => {
    const { handler } = makeHandler({})
    const res = await request(handler, { method: 'OPTIONS' })
    assertEquals(res.status, 200)
    assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
    await res.body?.cancel()
  })

  await t.step('rejects non-POST methods', async () => {
    const { handler } = makeHandler({})
    const res = await request(handler, { method: 'GET' })
    assertEquals(res.status, 405)
    await res.body?.cancel()
  })

  await t.step('deletes the caller’s storage and auth user; leaves others alone', async () => {
    const { handler, objects, users, removed, deleted } = makeHandler({})
    const res = await request(handler)
    assertEquals(res.status, 200)
    assertEquals(await res.json(), { ok: true })
    assertEquals(removed, [USER_A])
    assertEquals(deleted, [USER_A])
    assertEquals(users.has(USER_A), false)
    assertEquals(users.has(USER_B), true)
    assertEquals(objects['post-photos'], [`${USER_B}/b.jpg`])
    assertEquals(objects['review-photos'], [])
    assertEquals([...PHOTO_BUCKETS], ['post-photos', 'review-photos'])
  })

  await t.step('leaves no storage objects for the deleted user', async () => {
    const objects: Stored = {
      'post-photos': [`${USER_A}/1.jpg`, `${USER_A}/2.jpg`],
      'review-photos': [`${USER_A}/3.jpg`],
    }
    const { handler } = makeHandler({ objects })
    assertEquals((await request(handler)).status, 200)
    assertEquals(
      [...objects['post-photos'], ...objects['review-photos']].filter((p) => p.startsWith(`${USER_A}/`)),
      [],
    )
  })

  await t.step('cannot delete anyone else: missing/invalid JWT → 401', async () => {
    const { handler, users, objects } = makeHandler({})
    for (const authorization of [null, 'Bearer bad', '']) {
      const res = await request(handler, { authorization: authorization || null })
      assertEquals(res.status, 401, String(authorization))
      await res.body?.cancel()
    }
    assertEquals(users.has(USER_A), true)
    assertEquals(objects['post-photos']?.includes(`${USER_A}/a.jpg`), true)
  })

  await t.step('ignores a foreign userId in the body', async () => {
    const { handler, users, removed, deleted } = makeHandler({})
    const res = await request(handler, { body: { userId: USER_B } })
    assertEquals(res.status, 200)
    assertEquals(removed, [USER_A])
    assertEquals(deleted, [USER_A])
    assertEquals(users.has(USER_B), true)
    assertEquals(users.has(USER_A), false)
  })

  await t.step('succeeds when the auth user was already deleted', async () => {
    const { handler } = makeHandler({ users: new Set([USER_B]) })
    const res = await request(handler)
    assertEquals(res.status, 200)
    assertEquals(await res.json(), { ok: true })
  })
})
