// Deletes the caller's account and their photo storage.
//
//   POST /delete-account   Authorization: Bearer <user jwt>
//
// Storage under {userId}/ in post-photos and review-photos is removed first,
// then auth.admin.deleteUser cascades public.users and related rows.
// The service role key stays in Edge Function secrets — never in the app.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  createHandler,
  deleteAuthUser as deleteAuthUserWithClient,
  HttpError,
  removeUserStorage as removeUserStorageWithClient,
} from './handler.ts'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new HttpError(500, `${name} is not configured`)
  return value
}

function userClient(authorization: string): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function serviceClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

Deno.serve(
  createHandler(() => ({
    getCallerId: async (authorization) => {
      if (!authorization) return null
      const { data, error } = await userClient(authorization).auth.getUser()
      if (error || !data.user) return null
      return data.user.id
    },
    removeUserStorage: (userId) => removeUserStorageWithClient(serviceClient(), userId),
    deleteAuthUser: (userId) => deleteAuthUserWithClient(serviceClient(), userId),
  })),
)
