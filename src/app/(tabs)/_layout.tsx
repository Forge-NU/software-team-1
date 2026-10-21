import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

// TODO(design): check tab names, order and icons against the Figma Explore frame.
// To add a tab: add a row here and a matching file in this folder (name = file name).
const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'index', title: 'Explore', icon: 'compass-outline', activeIcon: 'compass' },
  { name: 'map', title: 'Map', icon: 'map-outline', activeIcon: 'map' },
  { name: 'post', title: 'Post', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  { name: 'profile', title: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.ink.subtle,
        tabBarStyle: {
          backgroundColor: colors.surface.DEFAULT,
          borderTopColor: colors.line.DEFAULT,
        },
        tabBarLabelStyle: { fontFamily: 'Outfit_500Medium', fontSize: 11 },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.activeIcon : tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
