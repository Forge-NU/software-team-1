import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import type { Feather } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../theme';

export type FeatherName = ComponentProps<typeof Feather>['name'];

// Styles shared by the sections of the spot detail screen.
// Space between sections comes from the screen's `gap`, so sections have no margins.
export const spotStyles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  caption: {
    ...typography.body,
    color: colors.textPrimary,
  },
  /** Light blue square behind an icon, as in the Explore list's rank badges */
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Dark pill laid over a photo or map, e.g. "3 photos" or a poster's name */
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  photoBadgeText: {
    ...typography.captionStrong,
    color: colors.textOnPrimary,
  },
  staleText: {
    color: '#92400E',
  },
});
