// Stands in for src/lib/supabase.ts (mapped in deno.json), which reads Expo env vars.
// Tests stub fetch to answer requests sent to this URL.

import { createClient } from 'npm:@supabase/supabase-js@2'

export const SUPABASE_URL = 'http://supabase.test'

export const supabase = createClient(SUPABASE_URL, 'anon-key')
