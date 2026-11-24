import { ActivityIndicator, View } from 'react-native';

import { FormMessage } from '@/components/FormMessage';
import { SpotCard, type SpotCardData } from '@/components/SpotCard';
import { Button, Text } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { colors } from '@/theme';

export interface ExploreSpotListProps {
  /** Already in display order; the card's rank is its position here */
  spots: SpotCardData[];
  loading?: boolean;
  error?: string | null;
  /** Any filter is on: changes the header and the empty state */
  filtered?: boolean;
  onOpenSpot: (locationId: number) => void;
  onRetry?: () => void;
  /** Shows a "Clear filters" button in the filtered empty state */
  onClearFilters?: () => void;
}

function headerText(count: number, filtered: boolean, loading: boolean) {
  if (!filtered) return 'Best options right now';
  if (loading && count === 0) return 'Finding matching spots…';
  if (count === 0) return 'No matching spots nearby';
  return `${count} matching ${count === 1 ? 'spot' : 'spots'} nearby`;
}

/**
 * Bottom half of Explore: ranked spot cards. Not a FlatList, because it sits under the map
 * in the screen's ScrollView and Explore returns at most 20 spots.
 */
export function ExploreSpotList({
  spots,
  loading = false,
  error = null,
  filtered = false,
  onOpenSpot,
  onRetry,
  onClearFilters,
}: ExploreSpotListProps) {
  const now = useNow();

  let body;
  if (loading && spots.length === 0) {
    body = <ActivityIndicator className="py-xl" color={colors.primaryDark} />;
  } else if (error && spots.length === 0) {
    body = (
      <View className="gap-sm">
        <FormMessage message={error} tone="error" />
        {onRetry && <Button label="Try again" variant="secondary" onPress={onRetry} />}
      </View>
    );
  } else if (spots.length === 0) {
    body = (
      <View className="items-center gap-xs rounded-lg border border-border bg-surface p-lg">
        <Text variant="bodyStrong">{filtered ? 'No spots match your filters' : 'No spots nearby yet'}</Text>
        <Text variant="bodySmall" color="textSecondary" className="text-center">
          {filtered
            ? 'Try turning off a filter or two to see more spots.'
            : "We couldn't find any study spots near you. Check back soon."}
        </Text>
        {filtered && onClearFilters && (
          <Button label="Clear filters" variant="secondary" onPress={onClearFilters} className="mt-xs self-stretch" />
        )}
      </View>
    );
  } else {
    body = (
      <View className="gap-sm">
        {spots.map((spot, index) => (
          <SpotCard key={spot.location_id} spot={spot} rank={index + 1} onPress={onOpenSpot} now={now} />
        ))}
      </View>
    );
  }

  return (
    <View className="gap-sm">
      <Text variant="heading" accessibilityRole="header">
        {headerText(spots.length, filtered, loading)}
      </Text>
      {spots.length > 0 && <FormMessage message={error} tone="error" />}
      {body}
    </View>
  );
}
