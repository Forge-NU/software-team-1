import type { Location } from '@/lib/places';

// Starter spots shaped exactly like listLocations() / getLocation() results,
// so swapping mocks for real data later is a one-line change. Add more freely.
// Coordinates and hours are approximate — fine for mocks, don't treat as real data.

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function hours(open: string, close: string, days = weekdays) {
  return days.map((day) => ({ day, open_time: open, close_time: close }));
}

export const mockLocations: Location[] = [
  {
    location_id: 1,
    google_place_id: null,
    name: 'Snell Library',
    latitude: 42.3381,
    longitude: -71.0882,
    location_type: 'library',
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
    day_hours: hours('00:00', '24:00', [...weekdays, 'Saturday', 'Sunday']),
  },
  {
    location_id: 2,
    google_place_id: null,
    name: 'Mugar Memorial Library',
    latitude: 42.3511,
    longitude: -71.108,
    location_type: 'library',
    campus: 'Boston University',
    price_range_id: 0,
    address: {
      street_one: '771 Commonwealth Ave',
      street_two: null,
      city: 'Boston',
      region: 'MA',
      postal_code: '02215',
      country_code: 'US',
    },
    day_hours: hours('08:00', '02:00'),
  },
  {
    location_id: 3,
    google_place_id: null,
    name: 'Boston Public Library – Central',
    latitude: 42.3493,
    longitude: -71.0782,
    location_type: 'library',
    campus: null,
    price_range_id: 0,
    address: {
      street_one: '700 Boylston St',
      street_two: null,
      city: 'Boston',
      region: 'MA',
      postal_code: '02116',
      country_code: 'US',
    },
    day_hours: hours('09:00', '20:00'),
  },
  {
    location_id: 4,
    google_place_id: null,
    name: 'Corner Café',
    latitude: 42.3467,
    longitude: -71.089,
    location_type: 'cafe',
    campus: null,
    price_range_id: 1,
    address: {
      street_one: '100 Mock St',
      street_two: null,
      city: 'Boston',
      region: 'MA',
      postal_code: '02115',
      country_code: 'US',
    },
    day_hours: hours('07:00', '19:00', [...weekdays, 'Saturday']),
  },
  {
    location_id: 5,
    google_place_id: null,
    name: 'Hayden Library',
    latitude: 42.3592,
    longitude: -71.0889,
    location_type: 'library',
    campus: 'MIT',
    price_range_id: 0,
    address: {
      street_one: '160 Memorial Dr',
      street_two: null,
      city: 'Cambridge',
      region: 'MA',
      postal_code: '02142',
      country_code: 'US',
    },
    day_hours: hours('08:00', '24:00'),
  },
];
