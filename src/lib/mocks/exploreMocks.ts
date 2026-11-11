import type { LocationRow, PostRow } from '../exploreRanking'
const CROWD = ['', 'Empty', 'Quiet', 'Moderate', 'Busy', 'Packed']
const NOISE = ['', 'Silent', 'Quiet', 'Moderate', 'Loud', 'Very loud']

function post(minutesAgo: number, crowd: number, noise: number): PostRow {
  return {
    created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    crowd_level_id: crowd,
    noise_level_id: noise,
    crowd_level: { label: CROWD[crowd] },
    noise_level: { label: NOISE[noise] },
    post_photo: [],
  }
}

interface MockSpot {
  id: number
  name: string
  type: string
  price: number | null
  lat: number
  lng: number
  seatType: string
  capacity: number
  outlets: number
  noisePolicy: string | null
  posts: PostRow[]
}

function toRow(s: MockSpot): LocationRow {
  return {
    location_id: s.id,
    name: s.name,
    location_type: s.type,
    campus: 'Northeastern University',
    price_range_id: s.price,
    latitude: s.lat,
    longitude: s.lng,
    address: { street_one: null, city: 'Boston' },
    area: [{ noise_policy: s.noisePolicy }],
    seating_area: [{ seat_type: s.seatType, capacity_id: s.capacity, outlet_level_id: s.outlets }],
    post: s.posts,
  }
}

/**
 * Built fresh on each call so "minutes ago" stays relative to now.
 * "Quiet + Outlets" matches Curry 201, Snell 3rd floor and the Law Library.
 */
export function mockExploreRows(): LocationRow[] {
  const spots: MockSpot[] = [
    {
      id: 1, name: 'Curry Study Room 201', type: 'campus_building', price: 0,
      lat: 42.3393, lng: -71.0874, seatType: 'study_room', capacity: 2, outlets: 3,
      noisePolicy: 'Quiet study', posts: [post(10, 1, 2)],
    },
    {
      id: 2, name: 'Snell Library, 3rd floor', type: 'library', price: 0,
      lat: 42.3381, lng: -71.088, seatType: 'desk', capacity: 1, outlets: 3,
      noisePolicy: 'Quiet floor', posts: [post(25, 2, 1)],
    },
    {
      id: 3, name: 'Snell Library, 1st floor', type: 'library', price: 0,
      lat: 42.3383, lng: -71.0883, seatType: 'table', capacity: 2, outlets: 2,
      noisePolicy: null, posts: [post(15, 4, 4)],
    },
    {
      id: 4, name: 'ISEC Atrium', type: 'campus_building', price: 0,
      lat: 42.3376, lng: -71.087, seatType: 'table', capacity: 2, outlets: 1,
      noisePolicy: null, posts: [post(40, 3, 3)],
    },
    {
      id: 5, name: 'Tatte Bakery', type: 'cafe', price: 2,
      lat: 42.342, lng: -71.085, seatType: 'table', capacity: 1, outlets: 0,
      noisePolicy: null, posts: [post(30, 4, 4)],
    },
    {
      id: 6, name: 'Pavement Coffeehouse', type: 'cafe', price: 1,
      lat: 42.3428, lng: -71.0866, seatType: 'bar_seating', capacity: 1, outlets: 2,
      noisePolicy: null, posts: [],
    },
    {
      id: 7, name: 'Law Library', type: 'library', price: 0,
      lat: 42.338, lng: -71.0905, seatType: 'desk', capacity: 1, outlets: 3,
      noisePolicy: 'Silent study', posts: [post(200, 2, 1)],
    },
  ]
  return spots.map(toRow)
}