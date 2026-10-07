import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { getPlace, GooglePlacesError, searchText, toUpsertPayload } from './google.ts'

export interface Deps {
  apiKey: string
  /** Returns a client that acts as the caller, so RLS applies. */
  createSupabase: (authorization: string) => SupabaseClient
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new HttpError(400, `${field} must be a number`)
  }
  return value
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${field} must be a non-empty string`)
  }
  return value.trim()
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json()
    if (body && typeof body === 'object' && !Array.isArray(body)) return body
  } catch {
    // fall through
  }
  throw new HttpError(400, 'Request body must be a JSON object')
}

async function upsertPlace(
  supabase: SupabaseClient,
  payload: ReturnType<typeof toUpsertPayload>,
): Promise<number> {
  const { data, error } = await supabase.rpc('upsert_google_place', { place: payload })
  if (error) {
    if (error.code === '42501') throw new HttpError(403, 'Only admins can import places')
    if (error.code === '23503') throw new HttpError(400, `Unknown location type or campus: ${error.details}`)
    throw new HttpError(500, error.message)
  }
  return data as number
}

async function handleSearch(req: Request, supabase: SupabaseClient, apiKey: string) {
  const body = await readBody(req)
  const query = optionalString(body.query, 'query')
  if (!query) throw new HttpError(400, 'query is required')

  const places = await searchText(apiKey, {
    query,
    latitude: optionalNumber(body.latitude, 'latitude'),
    longitude: optionalNumber(body.longitude, 'longitude'),
    radiusMeters: optionalNumber(body.radiusMeters, 'radiusMeters'),
    pageSize: optionalNumber(body.pageSize, 'pageSize'),
  })

  const ids = places.map((p) => p.id)
  const { data: existing, error } = ids.length
    ? await supabase.from('location').select('location_id, google_place_id').in('google_place_id', ids)
    : { data: [], error: null }
  if (error) throw new HttpError(500, error.message)
  const locationIdByPlace = new Map(
    (existing as { location_id: number; google_place_id: string }[]).map((l) => [
      l.google_place_id,
      l.location_id,
    ]),
  )

  return json({
    results: places.map((p) => ({
      googlePlaceId: p.id,
      name: p.displayName?.text ?? null,
      formattedAddress: p.formattedAddress ?? null,
      latitude: p.location?.latitude ?? null,
      longitude: p.location?.longitude ?? null,
      primaryType: p.primaryType ?? null,
      locationId: locationIdByPlace.get(p.id) ?? null,
    })),
  })
}

async function handleImport(req: Request, supabase: SupabaseClient, apiKey: string) {
  const body = await readBody(req)
  const googlePlaceId = optionalString(body.googlePlaceId, 'googlePlaceId')
  if (!googlePlaceId) throw new HttpError(400, 'googlePlaceId is required')

  const place = await getPlace(apiKey, googlePlaceId)
  const locationId = await upsertPlace(
    supabase,
    toUpsertPayload(place, {
      locationType: optionalString(body.locationType, 'locationType'),
      campus: optionalString(body.campus, 'campus'),
    }),
  )
  return json({ locationId }, 201)
}

async function handleSync(locationId: number, supabase: SupabaseClient, apiKey: string) {
  const { data: location, error } = await supabase
    .from('location')
    .select('google_place_id')
    .eq('location_id', locationId)
    .maybeSingle()
  if (error) throw new HttpError(500, error.message)
  if (!location) throw new HttpError(404, `Location ${locationId} not found`)
  if (!location.google_place_id) {
    throw new HttpError(409, `Location ${locationId} was not imported from Google Places`)
  }

  const place = await getPlace(apiKey, location.google_place_id)
  await upsertPlace(supabase, toUpsertPayload(place))
  return json({ locationId })
}

export function createHandler(getDeps: () => Deps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')

      const { apiKey, createSupabase } = getDeps()
      const supabase = createSupabase(req.headers.get('Authorization') ?? '')

      const segments = new URL(req.url).pathname.split('/').filter(Boolean)
      const route = segments.slice(segments.indexOf('places') + 1)

      if (route.length === 0) return await handleImport(req, supabase, apiKey)
      if (route.length === 1 && route[0] === 'search') return await handleSearch(req, supabase, apiKey)
      if (route.length === 2 && route[1] === 'sync') {
        const locationId = Number(route[0])
        if (!Number.isInteger(locationId)) throw new HttpError(400, 'Invalid location id')
        return await handleSync(locationId, supabase, apiKey)
      }
      throw new HttpError(404, 'Not found')
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status)
      if (err instanceof GooglePlacesError) {
        const status = err.status === 404 ? 404 : err.status === 422 ? 422 : 502
        return json({ error: `Google Places request failed: ${err.message}` }, status)
      }
      console.error(err)
      return json({ error: 'Internal server error' }, 500)
    }
  }
}
