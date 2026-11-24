import { useState } from 'react';
import { FlatList, Image, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';

import TopBar from '@/components/TopBar';
import { Button, Screen, Text } from '@/components/ui';
import { markWelcomeSeen } from '@/lib/onboarding';

// Only slide 1 is in Figma. TODO(design): replace slides 2 and 3 once design confirms them.
const SLIDES = [
  'Find your next favorite working spot',
  'See how busy a spot is before you walk over',
  'Share what it’s like to help the next student',
];

/** Figma "Spotted" frame (Hi-Fis). Shown once, on first launch, before sign up. */
export default function WelcomeScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (cardWidth > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / cardWidth));
  };

  const getStarted = async () => {
    await markWelcomeSeen();
    router.replace('/sign-up');
  };

  return (
    // Not scrollable: the map shrinks so everything fits on one screen, as in Figma
    <Screen header={<TopBar title="" />} padBottom contentClassName="gap-md py-xl">
      <View className="gap-xs">
        <Text variant="display" accessibilityRole="header">
          Where can I study right now?
        </Text>
        <Text variant="bodySmall" color="textSecondary">
          Find a spot that works for you, with recent updates from other users.
        </Text>
      </View>

      {/* Cropped from a Figma screenshot. TODO: swap in a full-resolution export from the "Spotted" frame. */}
      <View className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
        <Image
          source={require('../../../assets/onboarding-map.png')}
          accessibilityLabel="Map of study spots around Northeastern"
          resizeMode="cover"
          className="h-full w-full"
        />
      </View>

      <Text variant="caption" color="textSecondary" className="text-center">
        Nearby spots. Current conditions. Less wandering.
      </Text>

      <View
        className="rounded-xxl bg-primaryLight py-lg"
        onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
      >
        <FlatList
          data={SLIDES}
          keyExtractor={(slide) => slide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={{ width: cardWidth }} className="items-center px-xl">
              <Text variant="title" className="text-center">
                {item}
              </Text>
            </View>
          )}
        />
        <View className="mt-md flex-row justify-center gap-xs" accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide}
              className={`h-2.5 w-2.5 rounded-pill border border-textPrimary ${i === index ? 'bg-textPrimary' : ''}`}
            />
          ))}
        </View>
      </View>

      <Button label="Get started" onPress={getStarted} />
    </Screen>
  );
}
