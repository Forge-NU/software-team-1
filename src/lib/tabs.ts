import type { ComponentProps } from 'react';
import { Feather } from '@expo/vector-icons';

type FeatherName = ComponentProps<typeof Feather>['name'];

// Order, labels and icons from the Figma "bottom-nav" (Hi-Fis > Explore).
// `name` is the tab's folder in app/(tabs); each folder has a _layout.tsx (its own stack, so the tab gets
// the native header) and an index.tsx (the screen). Explore is the `(explore)` group so it stays at "/".
// Check in has no stack: its flow draws its own step headers.
// iOS uses the SF Symbols (outline by default, filled when selected) so the native
// Liquid Glass bar looks right; Android and web fall back to the Feather icon.
export const TABS = [
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

/**
 * Title of the tab with this route name, e.g. "(explore)" → "Explore".
 * The root stack uses it to name the (tabs) screen after the open tab, so a pushed
 * screen's back button menu (long press) says "Profile" instead of "(tabs)".
 */
export function tabTitle(routeName: string | undefined): string {
  return TABS.find((tab) => tab.name === routeName)?.title ?? TABS[0].title;
}
