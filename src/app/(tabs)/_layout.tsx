import type { ComponentProps } from 'react';
import { View, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography } from '@/theme';

type IconName = ComponentProps<typeof Feather>['name'];

// Order, labels and icons from the Figma "bottom-nav" (Hi-Fis > Explore).
// `name` is the route file in this folder. To change a tab, edit this list and that file.
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Explore', icon: 'map' },
  { name: 'feed', title: 'Feed', icon: 'globe' },
  { name: 'saved', title: 'Saved', icon: 'bookmark' },
  { name: 'check-in', title: 'Check in', icon: 'check-circle' },
  { name: 'profile', title: 'Profile', icon: 'user' },
];

const BAR_HEIGHT = 72;

/** Icon inside a round tile: filled when the tab is active, outlined when it isn't. */
function TabIcon({ name, focused, color }: { name: IconName; focused: boolean; color: ColorValue }) {
  return (
    <View
      className={`h-9 w-9 items-center justify-center rounded-pill ${
        focused ? 'bg-primaryLight' : 'border border-border bg-surface'
      }`}
    >
      <Feather name={name} size={20} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const { bottom } = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: typography.tab,
        tabBarStyle: {
          height: BAR_HEIGHT + bottom,
          paddingTop: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.primaryLight,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => <TabIcon name={tab.icon} focused={focused} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
