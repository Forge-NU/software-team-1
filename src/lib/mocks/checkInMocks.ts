import type { SpotSummary } from '../checkIn'

// Mock search results for the check-in flow, used while USE_MOCK_DATA is true.
// Delete once B-5 provides each spot's latest status.

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

export const mockSpots: SpotSummary[] = [
  {
    seatingId: 101,
    locationId: 1,
    locationName: 'Curry Student Center',
    name: 'Curry Study Room 201',
    status: 'Busy',
    statusTone: 'highlight',
    reportedAt: minutesAgo(6),
    noiseLabel: 'Quiet',
    outlets: true,
    walkMinutes: 5,
  },
  {
    seatingId: 102,
    locationId: 1,
    locationName: 'Curry Student Center',
    name: 'Curry 2nd Floor Lobby Seating',
    status: 'Some seats',
    statusTone: 'neutral',
    reportedAt: minutesAgo(30),
    noiseLabel: 'Social',
    outlets: true,
    walkMinutes: 5,
  },
  {
    seatingId: 201,
    locationId: 2,
    locationName: 'Snell Library',
    name: 'Snell 3rd floor',
    status: 'Some seats',
    statusTone: 'neutral',
    reportedAt: minutesAgo(45),
    noiseLabel: 'Quiet',
    outlets: true,
    walkMinutes: 4,
  },
  {
    seatingId: 301,
    locationId: 3,
    locationName: 'Law Library',
    name: 'Law Library',
    status: 'Busy',
    statusTone: 'highlight',
    reportedAt: minutesAgo(90),
    noiseLabel: 'Moderate',
    outlets: true,
    walkMinutes: 7,
  },
]
