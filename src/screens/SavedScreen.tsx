import { ActivityIndicator, View } from 'react-native';

import { FormMessage } from '@/components/FormMessage';
import { SpotCard } from '@/components/SpotCard';
import TopBar from '@/components/TopBar';
import { Button, Screen, Text } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { useSavedSpots } from '@/hooks/useSavedSpots';
import { colors } from '@/theme';

interface SavedScreenProps {
  onOpenSpot: (locationId: number) => void;
  onFindSpots: () => void;
}

export default function SavedScreen({ onOpenSpot, onFindSpots }: SavedScreenProps) {
  const { spots, loading, error, refresh } = useSavedSpots();
  const now = useNow();

  let body;
  if (loading) {
    body = <ActivityIndicator className="py-xl" color={colors.primaryDark} />;
  } else if (error && spots.length === 0) {
    body = (
      <View className="gap-sm">
        <FormMessage message={error} tone="error" />
        <Button label="Try again" variant="secondary" onPress={refresh} />
      </View>
    );
  } else if (spots.length === 0) {
    body = (
      <View className="items-center gap-xs rounded-lg border border-border bg-surface p-lg">
        <Text variant="bodyStrong">No saved spots yet</Text>
        <Text variant="bodySmall" color="textSecondary" className="text-center">
          Tap Save on a spot to keep it here with its latest report.
        </Text>
      </View>
    );
  } else {
    body = (
      <View className="gap-sm">
        {spots.map((spot) => (
          <SpotCard key={spot.location_id} spot={spot} onPress={onOpenSpot} now={now} />
        ))}
      </View>
    );
  }

  return (
    <Screen header={<TopBar title="Saved" />} scroll contentClassName="gap-lg py-xl">
      <View className="gap-xxs">
        <Text variant="title" accessibilityRole="header">
          Your go-to study spots.
        </Text>
        {spots.length > 0 && (
          <Text variant="caption" color="textSecondary">
            {spots.length} saved {spots.length === 1 ? 'spot' : 'spots'}
          </Text>
        )}
      </View>
      {body}
      <Button label="Find more spots" variant="secondary" onPress={onFindSpots} className="mt-auto" />
    </Screen>
  );
}
