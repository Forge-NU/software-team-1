import { assertEquals } from 'jsr:@std/assert@1'
import { signUp } from '../../../src/lib/auth.ts'
import { SUPABASE_URL } from './supabase.ts'

// handle_new_user() copies raw_user_meta_data ->> 'name' into public.users.name. Any other
// key (like the old profiles table's display_name) is dropped and the email prefix is used.
Deno.test('signUp sends the display name as the metadata key handle_new_user reads', async () => {
  const original = globalThis.fetch
  const bodies: { data?: Record<string, unknown> }[] = []
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init)
    if (req.url.split('?')[0] !== `${SUPABASE_URL}/auth/v1/signup`) {
      return new Response('unexpected request', { status: 404 })
    }
    bodies.push(await req.json())
    // Email confirmation is on, so sign-up returns the user without a session.
    return Response.json({ id: '00000000-0000-0000-0000-00000000000b', email: 'sam@northeastern.edu' })
  }
  try {
    await signUp('sam@northeastern.edu', 'correct horse battery', 'Sam Student')
  } finally {
    globalThis.fetch = original
  }
  assertEquals(bodies.map((b) => b.data), [{ name: 'Sam Student' }])
})
