import { Pressable, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import MapViewComponent from '@/components/MapView';
import TopBar from '@/components/TopBar';
import { Screen, Text } from '@/components/ui';
import { isLocationGranted, useLocationPermission } from '@/hooks/useLocationPermission';
import { mockLocations } from '@/mocks';

/** Height of the map on the Explore screen, from the Figma */
const MAP_HEIGHT = 220;

export default function ExploreRoute() {
  const router = useRouter();
  const { permission } = useLocationPermission();

  // TODO: Filters button in the header, and the search bar above the map
  return (
    <Screen header={<TopBar title="Explore" />} scroll contentClassName="py-lg">
      <Text variant="bodyStrong">Where to study right now?</Text>

      <View className="mt-sm gap-xs">
        <MapViewComponent
          height={MAP_HEIGHT}
          locations={mockLocations}
          onLocationPress={(spot) =>
            router.push({ pathname: '/spot/[id]', params: { id: String(spot.location_id) } })
          }
        />
        <Text variant="caption" color="textSecondary">
          {isLocationGranted(permission) ? 'Centered on you' : 'Northeastern campus'}
        </Text>
      </View>

      {/* Stand-in list until the ranked "Best options" cards are built (F-3) */}
      <Text variant="heading" className="mb-sm mt-xl">
        Best options right now
      </Text>
      <View className="gap-sm">
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
      </View>
    </Screen>
  );
}
