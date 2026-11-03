// Imports study spots in the Boston area from OpenStreetMap into the location table.
//
//   npm run import:osm -- --dry-run --out=places.json   # fetch and summarize only
//   npm run import:osm                                  # fetch and save
//
// Saving needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Dashboard → Project Settings → API,
// or `npx supabase status` locally). Re-running refreshes existing rows instead of duplicating them.

import { parseArgs } from 'jsr:@std/cli@1/parse-args'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { collectPlaces, DEFAULT_TYPES, type ImportType, type OsmPlacePayload, TYPE_FILTERS } from './osm/overpass.ts'

const BATCH_SIZE = 100

const args = parseArgs(Deno.args, {
  boolean: ['dry-run', 'help'],
  string: ['types', 'out'],
})

if (args.help) {
  console.log(`Usage: import_osm.ts [--dry-run] [--out=file.json] [--types=${Object.keys(TYPE_FILTERS).join(',')}]
  Default types: ${DEFAULT_TYPES.join(',')}`)
  Deno.exit(0)
}

const types = (args.types?.split(',').map((t) => t.trim()) ?? DEFAULT_TYPES) as ImportType[]
const unknown = types.filter((t) => !(t in TYPE_FILTERS))
if (unknown.length) {
  console.error(`Unknown types: ${unknown.join(', ')}. Choose from ${Object.keys(TYPE_FILTERS).join(', ')}.`)
  Deno.exit(1)
}

const url = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!args['dry-run'] && (!url || !serviceKey)) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --dry-run.')
  Deno.exit(1)
}

console.log(`Fetching ${types.join(', ')} from OpenStreetMap...`)
const places = await collectPlaces({ types, onProgress: (m) => console.log(`  ${m}`) })
summarize(places)

if (args.out) {
  await Deno.writeTextFile(args.out, JSON.stringify(places, null, 2))
  console.log(`Wrote ${args.out}`)
}

if (args['dry-run']) Deno.exit(0)

const supabase = createClient(url!, serviceKey!, { auth: { persistSession: false } })
let saved = 0
for (let i = 0; i < places.length; i += BATCH_SIZE) {
  const batch = places.slice(i, i + BATCH_SIZE)
  const { error } = await supabase.rpc('upsert_osm_places', { places: batch })
  if (error) {
    console.error(`Batch starting at ${i} failed: ${error.message}`)
    Deno.exit(1)
  }
  saved += batch.length
  console.log(`  saved ${saved}/${places.length}`)
}
console.log('Done. Remember the app must credit "© OpenStreetMap contributors" where it shows these.')

function summarize(places: OsmPlacePayload[]) {
  const count = (by: (p: OsmPlacePayload) => string) =>
    Object.entries(Object.groupBy(places, by)).map(([k, v]) => `${k} ${v!.length}`).join(', ')
  const pct = (n: number) => `${Math.round((100 * n) / Math.max(places.length, 1))}%`
  console.log(`\n${places.length} places`)
  console.log(`  by type: ${count((p) => p.default_location_type)}`)
  console.log(`  by campus: ${count((p) => p.campus ?? 'none')}`)
  console.log(`  with hours: ${pct(places.filter((p) => p.hours).length)}`)
  console.log(`  with address: ${pct(places.filter((p) => p.address).length)}\n`)
}
