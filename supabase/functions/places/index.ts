// Google Places integration for Spotted.
//
//   POST /places/search              { query, latitude?, longitude?, radiusMeters?, pageSize? }
//   POST /places                     { googlePlaceId, locationType?, campus? }  -> import (admin)
//   POST /places/:locationId/sync                                               -> refresh (admin)
//
// Reads, manual edits and deletes of imported locations go straight through
// PostgREST (see src/lib/places.ts); RLS restricts writes to admins.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createHandler, HttpError } from './handler.ts'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new HttpError(500, `${name} is not configured`)
  return value
}

Deno.serve(
  createHandler(() => ({
    apiKey: requireEnv('GOOGLE_PLACES_API_KEY'),
    createSupabase: (authorization) =>
      createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
        global: { headers: { Authorization: authorization } },
        auth: { autoRefreshToken: false, persistSession: false },
      }),
  })),
)
