import { useEffect, type ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { Feather } from '@expo/vector-icons';

import { shouldShowLocationPrompt } from '@/lib/locationPermisson';
import { takePreferencesPending } from '@/lib/onboarding';
import { colors, typography } from '@/theme';

type FeatherName = ComponentProps<typeof Feather>['name'];

// Order, labels and icons from the Figma "bottom-nav" (Hi-Fis > Explore).
// `name` is the tab's folder here; each folder has a _layout.tsx (its own stack, so the tab gets
// the native header) and an index.tsx (the screen). Explore is the `(explore)` group so it stays at "/".
// Check in has no stack: its flow draws its own step headers.
// iOS uses the SF Symbols (outline by default, filled when selected) so the native
// Liquid Glass bar looks right; Android and web fall back to the Feather icon.
const TABS = [
  { name: '(explore)', title: 'Explore', sf: { default: 'map', selected: 'map.fill' }, feather: 'map' },
  { name: 'feed', title: 'Feed', sf: { default: 'globe', selected: 'globe' }, feather: 'globe' },
  {
    name: 'saved',
    title: 'Saved',
    sf: { default: 'bookmark', selected: 'bookmark.fill' },
    feather: 'bookmark',
  },
  {
    name: 'check-in',
    title: 'Check in',
    sf: { default: 'checkmark.circle', selected: 'checkmark.circle.fill' },
    feather: 'check-circle',
  },
  {
    name: 'profile',
    title: 'Profile',
    sf: { default: 'person', selected: 'person.fill' },
    feather: 'user',
  },
] as const satisfies readonly {
  name: string;
  title: string;
  sf: { default: string; selected: string };
  feather: FeatherName;
}[];

// Native tab labels accept only font family/size/style/weight/color (no lineHeight).
const { fontFamily, fontSize } = typography.tab;

export default function TabLayout() {
  const router = useRouter();

  // After sign up, Figma's order is the location prompt, then Study preferences (F-8).
  // Preferences is pushed first so it sits underneath: closing the location screen reveals it.
  useEffect(() => {
    Promise.all([takePreferencesPending(), shouldShowLocationPrompt()]).then(([preferences, location]) => {
      if (preferences) router.push('/preferences');
      if (location) router.push('/location-permission');
    });
  }, [router]);

  return (
    <NativeTabs
      tintColor={colors.primaryDark}
      iconColor={{ default: colors.textSecondary, selected: colors.primaryDark }}
      labelStyle={{
        default: { fontFamily, fontSize, color: colors.textSecondary },
        selected: { fontFamily, fontSize, color: colors.primaryDark },
      }}
      // Pre-iOS 26 and Android only; iOS 26+ draws its own glass background.
      backgroundColor={colors.surface}
      indicatorColor={colors.primaryLight}
      minimizeBehavior="onScrollDown"
    >
      {TABS.map((tab) => (
        <NativeTabs.Trigger
          key={tab.name}
          name={tab.name}
          contentStyle={{ backgroundColor: colors.background }}
        >
          <NativeTabs.Trigger.Label>{tab.title}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={tab.sf}
            src={<NativeTabs.Trigger.VectorIcon family={Feather} name={tab.feather} />}
          />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
