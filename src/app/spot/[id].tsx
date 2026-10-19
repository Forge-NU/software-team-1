import { Stack, useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { getMockLocation } from '@/mocks';

// Placeholder so Explore can link here: router.push(`/spot/${locationId}`)
// or <Link href={{ pathname: '/spot/[id]', params: { id } }}>. The Detail ticket replaces this file.
export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const spot = getMockLocation(Number(id));

  return (
    <>
      <Stack.Screen options={{ title: spot?.name ?? 'Spot' }} />
      <PlaceholderScreen
        title={spot?.name ?? `Spot ${id}`}
        description={`Detail page placeholder for location_id ${id}.`}
      />
    </>
  );
}
