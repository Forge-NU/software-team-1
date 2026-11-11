import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import TopBar from '@/components/TopBar';
import { Button, Screen, Text } from '@/components/ui';
import { colors } from '@/theme';

interface LocationPermissionScreenProps {
  onNext: () => void;
  onSkip: () => void;
  requesting?: boolean;
}

export default function LocationPermissionScreen({ onNext, onSkip, requesting = false }: LocationPermissionScreenProps) {
  return (
    <Screen header={<TopBar title="Nearby study spots" />} padBottom contentClassName="pb-md">
      <View className="items-center gap-md pt-[48px]">
        <View className="h-[72px] w-[72px] items-center justify-center rounded-pill border border-border bg-primaryLight">
          <Feather name="map-pin" size={28} color={colors.primaryDark} />
        </View>
        <Text variant="title" accessibilityRole="header" className="text-center">
          Find a spot close to you.
        </Text>
        <Text variant="bodySmall" className="text-center">
          Your location helps find study spots nearby.
        </Text>
        <Text variant="caption" color="textSecondary" className="text-center">
          Next, your phone will ask for permission. Choose “While using the app.”
        </Text>
      </View>

      <View className="flex-1" />

      <View className="gap-sm">
        <Button label="Next" onPress={onNext} loading={requesting} />
        <Button label="Not now" variant="outline" onPress={onSkip} disabled={requesting} />
        <Text variant="caption" color="textSecondary" className="text-center">
          You can still search by building without location.
        </Text>
      </View>
    </Screen>
  );
}
