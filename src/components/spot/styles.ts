import { StyleSheet } from 'react-native';

import { colors, spacing, typography } from '../../theme';

// Styles shared by the sections of the spot detail screen.
export const spotStyles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingVertical: spacing.xs,
  },
  caption: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  staleText: {
    color: '#92400E',
  },
});
