import { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Wordmark } from '@/components/Wordmark';
import { Button } from '@/components/ui';
import { colors } from '@/theme/tokens';

// TODO(design): only the first slide's text is in Figma. Confirm the other two.
const SLIDES = [
  'Find your next favorite working spot',
  'See how busy and loud it is right now',
  'Share updates to help other students',
];

/** Figma "Spotted" frame: first screen signed-out users see. */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [slideWidth, setSlideWidth] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);

  const onCarouselLayout = (event: LayoutChangeEvent) =>
    setSlideWidth(event.nativeEvent.layout.width);

  const onCarouselScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (slideWidth > 0) {
      setActiveSlide(Math.round(event.nativeEvent.contentOffset.x / slideWidth));
    }
  };

  return (
    <View className="flex-1 bg-surface-canvas">
      <View className="bg-surface px-gutter" style={{ paddingTop: insets.top }}>
        <View className="h-14 justify-center">
          <Wordmark />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-gutter pb-6 pt-6">
        <Text accessibilityRole="header" className="font-sans-semibold text-display text-ink">
          Where can I study right now?
        </Text>
        <Text className="mt-3 font-sans text-body text-ink-muted">
          Find a spot that works for you, with recent updates from other users.
        </Text>

        {/* TODO(design): export the map illustration from Figma to assets/onboarding-map.png
            and replace this block with:
            <Image source={require('../../../assets/onboarding-map.png')} className="w-full rounded-card" style={{ aspectRatio: 0.93 }} /> */}
        <View
          className="mt-6 w-full items-center justify-center rounded-card border border-line bg-primary-soft"
          style={{ aspectRatio: 0.93 }}
        >
          <Ionicons name="map-outline" size={48} color={colors.primary.muted} />
        </View>
        <Text className="mt-4 text-center font-sans text-label text-ink-muted">
          Nearby spots. Current conditions. Less wandering.
        </Text>

        <View className="mt-5 rounded-card bg-primary-soft py-6" onLayout={onCarouselLayout}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onCarouselScrollEnd}
          >
            {SLIDES.map((slide) => (
              <View key={slide} style={{ width: slideWidth }} className="px-8">
                <Text className="text-center font-sans text-lead text-ink">{slide}</Text>
              </View>
            ))}
          </ScrollView>

          <View
            className="mt-4 flex-row justify-center gap-2"
            accessibilityLabel={`Slide ${activeSlide + 1} of ${SLIDES.length}`}
          >
            {SLIDES.map((slide, index) => (
              <View
                key={slide}
                className={`h-2.5 w-2.5 rounded-pill border border-ink ${
                  index === activeSlide ? 'bg-ink' : 'bg-transparent'
                }`}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="px-gutter pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
        <Button title="Get started" shape="pill" onPress={() => router.push('/sign-up')} />
      </View>
    </View>
  );
}
