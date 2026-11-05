import { View } from 'react-native';

import { ExploreSpotList } from '@/components/ExploreSpotList';
import TopBar from '@/components/TopBar';
import { Screen, Text } from '@/components/ui';
import { EXPLORE_SORT } from '@/constants/explore';
import { hasActiveFilters, useExploreSpots } from '@/hooks/useExploreSpots';
import type { ExploreFilters } from '@/lib/exploreRanking';

export interface ExploreScreenProps {
  onOpenSpot: (locationId: number) => void;
  /** From the filter sheet once it exists; leave off for the default list */
  filters?: ExploreFilters;
  onClearFilters?: () => void;
}

export default function ExploreScreen({ onOpenSpot, filters, onClearFilters }: ExploreScreenProps) {
  // One fetch for the whole screen: the map and the list both render these `spots`
  const { spots, loading, error, refresh } = useExploreSpots({ filters, sort: EXPLORE_SORT });

  return (
    <Screen header={<TopBar title="Explore" />} scroll contentClassName="gap-lg py-xl">
      {/* TODO(F-2): replace with the map, passing it the same `spots` and `onOpenSpot` */}
      <View className="h-48 items-center justify-center rounded-xl border border-border bg-primaryLight">
        <Text color="textSecondary">Waiting on Map in F-2</Text>
      </View>

      <ExploreSpotList
        spots={spots}
        loading={loading}
        error={error}
        filtered={hasActiveFilters(filters)}
        onOpenSpot={onOpenSpot}
        onRetry={refresh}
        onClearFilters={onClearFilters}
      />
    </Screen>
  );
}
