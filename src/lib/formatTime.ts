import { getCalendars } from 'expo-localization';

import type { DayHours } from '../types/location';

const WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * Time now follows the device's 12-hour or 24-hour setting
 * And if the device doesn't say, it falls back to the language and region
 */
export function formatClock(time: string): string {
  const [hourText, minuteText] = time.split(':');
  const date = new Date(2000, 0, 1, Number(hourText) % 24, Number(minuteText));
  const uses24Hour = getCalendars()[0]?.uses24hourClock;

  return date
    .toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      ...(typeof uses24Hour === 'boolean' && {
        hourCycle: uses24Hour ? 'h23' : 'h12',
      }),
    })
    .replace(/\s*([AP]M)$/i, (_, suffix: string) => suffix.toLowerCase());
}

export function formatHoursRange(hours: DayHours): string {
  if (
    hours.open_time.startsWith('00:00') &&
    (hours.close_time.startsWith('24:00') ||
      hours.close_time.startsWith('23:59'))
  ) {
    return 'Open 24 hours';
  }

  return `${formatClock(hours.open_time)} - ${formatClock(hours.close_time)}`;
}

// Combines consecutive days with the same hours
export function groupHours(
  dayHours: DayHours[]
): { label: string; value: string }[] {
  const sorted = dayHours
    .filter((hours) => WEEK.includes(hours.day))
    .sort((a, b) => WEEK.indexOf(a.day) - WEEK.indexOf(b.day));

  const groups: { first: string; last: string; value: string }[] = [];

  for (const hours of sorted) {
    const value = formatHoursRange(hours);
    const previous = groups[groups.length - 1];

    if (
      previous &&
      previous.value === value &&
      WEEK.indexOf(hours.day) === WEEK.indexOf(previous.last) + 1
    ) {
      previous.last = hours.day;
    } else {
      groups.push({ first: hours.day, last: hours.day, value });
    }
  }

  return groups.map((group) => ({
    label:
      group.first === group.last
        ? group.first
        : `${group.first} - ${group.last}`,
    value: group.value,
  }));
}

// Formats it into how long ago something was
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const difference = Date.now() - date.getTime();

  if (Number.isNaN(date.getTime())) return 'Unknown time';
  if (difference < 0) return 'Just now';

  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function formatTimeLimit(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${minutes} min`;
}
