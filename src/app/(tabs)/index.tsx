import { Pressable, Text } from 'react-native';
import { Link } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { mockLocations } from '@/mocks';

export default function ExploreScreen() {
  return (
    <PlaceholderScreen
      title="Explore"
      description="Placeholder. Tap a mock spot to test the Detail route."
    >
      {mockLocations.map((spot) => (
        <Link
          key={spot.location_id}
          href={{ pathname: '/spot/[id]', params: { id: String(spot.location_id) } }}
          asChild
        >
          <Pressable className="rounded-card border border-line bg-surface p-4 active:bg-surface-muted">
            <Text className="font-sans-medium text-heading text-ink">{spot.name}</Text>
            <Text className="mt-1 font-sans text-caption text-ink-muted">
              {spot.campus ?? spot.location_type}
            </Text>
          </Pressable>
        </Link>
      ))}
    </PlaceholderScreen>
  );
}
