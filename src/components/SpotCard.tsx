import { Pressable, View } from 'react-native';

import { CrowdBadge, NoiseTag, NoRecentUpdatesBadge } from '@/components/SpotStatus';
import { Text } from '@/components/ui';
import type { ExploreSpot } from '@/lib/exploreRanking';
import { crowdLabel, formatDistance, formatTimeAgo, isRecent } from '@/lib/spotFormat';

/** The fields a card needs. Any ExploreSpot works; other screens can build this shape too. */
export type SpotCardData = Pick<
  ExploreSpot,
  | 'location_id'
  | 'name'
  | 'distance_meters'
  | 'is_current'
  | 'crowd_level_id'
  | 'crowd_level'
  | 'noise_level_id'
  | 'noise_level'
  | 'last_updated_at'
>;

export interface SpotCardProps {
  spot: SpotCardData;
  /** Position in a ranked list. Leave off where order doesn't mean "best", e.g. Saved. */
  rank?: number;
  /** Gets the spot's location_id. Open spot detail from here, e.g. router.push('/spot/[id]'). */
  onPress?: (locationId: number) => void;
  /** Pass useNow() from a parent so "updated X min ago" keeps counting and crowd/noise expire after RECENT_MINUTES. Defaults to render time. */
  now?: number;
  /** Layout only (margins) */
  className?: string;
}

/**
 * is_current is decided when the list is fetched. Re-checking it against `now` means a card left
 * on screen switches to "No recent updates" once its post passes the window, without a refetch.
 */
function isCurrent(spot: SpotCardData, now: number) {
  return spot.is_current && isRecent(spot.last_updated_at, now);
}

function updatedText(spot: SpotCardData, now: number, long = false) {
  if (!spot.last_updated_at) return 'No updates yet';
  const ago = formatTimeAgo(spot.last_updated_at, now, long);
  return isCurrent(spot, now) ? `Updated ${ago}` : `Last update ${ago}`;
}

function accessibilityLabel(spot: SpotCardData, rank: number | undefined, now: number) {
  const parts = [
    `${rank != null ? `${rank}. ` : ''}${spot.name}, ${formatDistance(spot.distance_meters, true)} away`,
    isCurrent(spot, now)
      ? [
          spot.crowd_level_id != null && `${crowdLabel(spot.crowd_level_id)} crowd`,
          spot.noise_level && `${spot.noise_level} noise`,
        ]
          .filter(Boolean)
          .join(', ')
      : 'No recent updates',
    updatedText(spot, now, true),
  ];
  return parts.filter(Boolean).join('. ');
}

/** A spot in a list: rank, name, distance, crowdedness and noise, and how fresh that is. */
export function SpotCard({ spot, rank, onPress, now = Date.now(), className = '' }: SpotCardProps) {
  const showStatus = isCurrent(spot, now) && spot.crowd_level_id != null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel(spot, rank, now)}
      accessibilityHint={onPress ? 'Opens spot details' : undefined}
      disabled={!onPress}
      onPress={onPress ? () => onPress(spot.location_id) : undefined}
      className={`flex-row gap-sm rounded-lg border border-border bg-surface p-md active:opacity-80 ${className}`}
    >
      {rank != null && (
        <View className="h-8 w-8 items-center justify-center rounded-pill bg-primaryLight">
          <Text variant="label" color="textOnPrimaryLight">
            {rank}
          </Text>
        </View>
      )}

      <View className="flex-1 gap-xs">
        <View className="flex-row items-center gap-xs">
          <Text variant="bodyStrong" numberOfLines={1} className="flex-1">
            {spot.name}
          </Text>
          <Text variant="caption" color="textSecondary">
            {formatDistance(spot.distance_meters)}
          </Text>
        </View>

        {showStatus ? (
          <View className="flex-row flex-wrap items-center gap-sm">
            <CrowdBadge levelId={spot.crowd_level_id!} />
            {spot.noise_level_id != null && <NoiseTag levelId={spot.noise_level_id} label={spot.noise_level} />}
          </View>
        ) : (
          <NoRecentUpdatesBadge />
        )}

        <Text variant="caption" color="textSecondary">
          {updatedText(spot, now)}
        </Text>
      </View>
    </Pressable>
  );
}
