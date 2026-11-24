// Display helpers for spot cards, map callouts and spot detail. Pure, no React.

import { RECENT_MINUTES } from './exploreRanking'

const METERS_PER_MILE = 1609.344

/** "0.3 mi". With `long`, "0.3 miles" for screen readers. */
export function formatDistance(meters: number, long = false): string {
  const miles = meters / METERS_PER_MILE
  if (miles < 0.1) return long ? 'less than 0.1 miles' : '< 0.1 mi'
  const value = miles < 10 ? miles.toFixed(1) : String(Math.round(miles))
  return long ? `${value} miles` : `${value} mi`
}

/** "just now", "12 min ago", "3 hr ago", "yesterday", "4 days ago". With `long`, units are spelled out. */
export function formatTimeAgo(iso: string, now = Date.now(), long = false): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return long ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago` : `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return long ? `${hours} ${hours === 1 ? 'hour' : 'hours'} ago` : `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

/** True while a post's crowd and noise still count as current (RECENT_MINUTES, same window as rankSpots). */
export function isRecent(iso: string | null, now = Date.now(), recentMinutes = RECENT_MINUTES): boolean {
  if (!iso) return false
  return now - Date.parse(iso) < recentMinutes * 60_000
}

export type CrowdTone = 'low' | 'moderate' | 'high'

/** Crowd wording from the Figma check-in chips. Noise keeps its own labels, so the two never share a word. */
export const CROWD_TONE_LABELS: Record<CrowdTone, string> = {
  low: 'Nearly empty',
  moderate: 'Some seats',
  high: 'Busy',
}

/** Empty/Quiet are low, Moderate is moderate, Busy/Packed are high (same groups as PostReview in posts.ts). */
export function crowdTone(crowdLevelId: number): CrowdTone {
  if (crowdLevelId <= 2) return 'low'
  if (crowdLevelId === 3) return 'moderate'
  return 'high'
}

/** "Nearly empty", "Some seats" or "Busy" for a crowd_level_id. */
export function crowdLabel(crowdLevelId: number): string {
  return CROWD_TONE_LABELS[crowdTone(crowdLevelId)]
}
