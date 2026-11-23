import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { formatTimeLimit, groupHours } from '../../lib/formatTime';
import type { SpotAmenities } from '../../lib/spot';
import type { Location } from '../../types/location';
import { colors, radius, spacing, typography } from '../../theme';
import { spotStyles, type FeatherName } from './styles';

interface AmenitiesCardProps {
  location: Location;
  amenities: SpotAmenities;
}

interface ChipData {
  icon: FeatherName;
  label: string;
}

// Short enough to fit on a chip; the lookup labels ("No Phone Calls Allowed") are too long.
const PHONE_CHIPS: Record<number, string> = {
  0: 'No phone calls',
  1: 'Quiet calls only',
  2: 'Calls allowed',
};

/**
 * Amenities as icon chips (policies and access), then opening hours. Price and Wi-Fi are
 * in the line under the spot's name. Anything without data is left out, and so is a
 * section with nothing in it.
 */
export default function AmenitiesCard({ location, amenities }: AmenitiesCardProps) {
  const { noisePolicy, phonePolicyId, timeLimitMinutes, wheelchairAccessible } = amenities;

  const chips: ChipData[] = [];
  if (noisePolicy) chips.push({ icon: 'volume', label: noisePolicy });
  if (phonePolicyId !== null && PHONE_CHIPS[phonePolicyId]) {
    chips.push({ icon: 'smartphone', label: PHONE_CHIPS[phonePolicyId] });
  }
  if (timeLimitMinutes) {
    chips.push({ icon: 'clock', label: `${formatTimeLimit(timeLimitMinutes)} limit` });
  }
  if (wheelchairAccessible !== null) {
    chips.push({
      icon: 'check-circle',
      label: wheelchairAccessible ? 'Wheelchair access' : 'No wheelchair access',
    });
  }

  const hours = groupHours(location.day_hours);

  return (
    <>
      {chips.length > 0 && (
        <View style={spotStyles.section}>
          <Text style={spotStyles.sectionTitle}>Amenities</Text>
          <View style={styles.chips}>
            {chips.map((chip) => (
              <View key={chip.label} style={styles.chip}>
                <Feather name={chip.icon} size={14} color={colors.primaryDark} />
                <Text style={styles.chipText}>{chip.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {hours.length > 0 && (
        <View style={spotStyles.section}>
          <Text style={spotStyles.sectionTitle}>Hours</Text>
          <View style={styles.card}>
            {hours.map((group, index) => (
              <View key={group.label} style={[styles.row, index > 0 && styles.divider]}>
                <Text style={styles.label}>{group.label}</Text>
                <Text style={styles.value}>{group.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  chipText: {
    ...typography.captionStrong,
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  value: {
    ...typography.label,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
});
