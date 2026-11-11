import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { Feather } from '@expo/vector-icons';

import { shouldShowLocationPrompt } from '@/lib/locationPermisson';
import { takePreferencesPending } from '@/lib/onboarding';
import { TABS } from '@/lib/tabs';
import { colors, typography } from '@/theme';

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
