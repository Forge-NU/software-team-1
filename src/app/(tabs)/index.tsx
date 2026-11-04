import { Pressable } from 'react-native';
import { Link } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Text } from '@/components/ui';
import { mockLocations } from '@/mocks';

export default function ExploreRoute() {
  return (
    <PlaceholderScreen title="Explore" ticket="F-2 / F-3">
      {mockLocations.map((spot) => (
        <Link key={spot.location_id} href={{ pathname: '/spot/[id]', params: { id: String(spot.location_id) } }} asChild>
          <Pressable
            accessibilityRole="link"
            className="gap-xxs rounded-xl border border-border bg-surface p-md active:opacity-80"
          >
            <Text variant="bodyStrong">{spot.name}</Text>
            <Text variant="caption" color="textSecondary">
              {spot.campus ?? spot.location_type}
            </Text>
          </Pressable>
        </Link>
      ))}
    </PlaceholderScreen>
  );
}
