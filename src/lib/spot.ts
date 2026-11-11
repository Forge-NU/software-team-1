// Rules and labels for showing a spot: staleness, amenities, and lookup labels.
import {
  CROWD_LEVELS,
  NOISE_LEVELS,
  OUTLET_LEVELS,
  PHONE_POLICIES,
  PRICE_RANGES,
} from '../constants/lookups';
import type { SeatingInfo } from './places';

// The shared labels are keyed by literal ids; widen them since posts only carry plain numbers.
export const crowdLabels: Record<number, string> = CROWD_LEVELS;
export const noiseLabels: Record<number, string> = NOISE_LEVELS;
export const outletLabels: Record<number, string> = OUTLET_LEVELS;
export const phonePolicyLabels: Record<number, string> = PHONE_POLICIES;
export const priceLabels: Record<number, string> = PRICE_RANGES;

// Reports older than this are labeled stale.
export const STALE_AFTER_HOURS = 2;
const STALE_AFTER_MS = STALE_AFTER_HOURS * 60 * 60 * 1000;

export function isStale(dateString: string): boolean {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return true;

  return Date.now() - date.getTime() > STALE_AFTER_MS;
}

/** "2" -> "Floor 2"; anything else, like "Ground", is shown as is. */
export function formatFloor(floor: string): string {
  return /^\d+$/.test(floor) ? `Floor ${floor}` : floor;
}

export interface SpotAmenities {
  floor: string | null;
  noisePolicy: string | null;
  phonePolicyId: number | null;
  timeLimitMinutes: number | null;
  /** Null means unknown, so only an explicit true or false should be shown. */
  wheelchairAccessible: boolean | null;
  /** Best outlet level across the spot's seating areas, or null if none are mapped. */
  outletLevel: number | null;
}

/** Takes the first known value across the spot's areas. */
export function getAmenities(seating: SeatingInfo[]): SpotAmenities {
  const areas = seating.flatMap((item) => (item.area ? [item.area] : []));

  return {
    floor: areas.find((area) => area.floor)?.floor ?? null,
    noisePolicy: areas.find((area) => area.noise_policy)?.noise_policy ?? null,
    phonePolicyId:
      areas.find((area) => area.phone_policy_id !== null)?.phone_policy_id ?? null,
    timeLimitMinutes:
      areas.find((area) => area.time_limit_minutes)?.time_limit_minutes ?? null,
    wheelchairAccessible:
      areas.find((area) => area.wheelchair_accessible !== null)
        ?.wheelchair_accessible ?? null,
    outletLevel:
      seating.length > 0
        ? Math.max(...seating.map((item) => item.outlet_level_id))
        : null,
  };
}

/**
 * Outlets for a post come from the seating area it was posted at,
 * falling back to the best outlet level anywhere in the spot.
 */
export function outletLevelForPost(
  seating: SeatingInfo[],
  post: { seating_id: number | null }
): number | null {
  const area = seating.find((item) => item.seating_id === post.seating_id);

  return area?.outlet_level_id ?? getAmenities(seating).outletLevel;
}
