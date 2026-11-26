// Removes photo files that no longer belong to any post or review (B-26).
//
//   POST /cleanup-orphaned-photos   Authorization: Bearer <CRON_SECRET>
//   Body: {"dryRun": true}  lists what would be removed (also the default for an empty body)
//         {"dryRun": false} removes the files
//
// Called by a daily cron job (see supabase/README.md). Only files older than 24 hours with no
// post_photo / review_photo row are touched. The service role key stays in Edge Function secrets.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { createHandler, findOrphans, HttpError, removeFiles } from './handler.ts'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new HttpError(500, `${name} is not configured`)
  return value
}

function serviceClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

Deno.serve(
  createHandler(() => ({
    cronSecret: Deno.env.get('CRON_SECRET'),
    findOrphans: () => findOrphans(serviceClient()),
    removeFiles: (bucket, paths) => removeFiles(serviceClient(), bucket, paths),
  })),
)
