import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatTimeLimit, groupHours } from '../../lib/formatTime';
import {
  outletLabels,
  phonePolicyLabels,
  priceLabels,
} from '../../lib/spot';
import type { SpotAmenities } from '../../lib/spot';
import type { Location } from '../../types/location';
import { colors, radius, spacing, typography } from '../../theme';
import { spotStyles } from './styles';

interface AmenitiesCardProps {
  location: Location;
  amenities: SpotAmenities;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/** Price, outlets, policies and opening hours. Rows without data are left out. */
export default function AmenitiesCard({
  location,
  amenities,
}: AmenitiesCardProps) {
  const {
    outletLevel,
    noisePolicy,
    phonePolicyId,
    timeLimitMinutes,
    wheelchairAccessible,
  } = amenities;

  return (
    <View style={spotStyles.section}>
      <Text style={spotStyles.sectionTitle}>Amenities</Text>

      <View style={styles.card}>
        <Row
          label="Price"
          value={
            location.price_range_id !== null
              ? priceLabels[location.price_range_id] ?? 'Unavailable'
              : 'Unavailable'
          }
        />

        <Row
          label="Outlets"
          value={
            outletLevel !== null
              ? outletLabels[outletLevel] ?? 'Unknown'
              : 'Unavailable'
          }
        />

        {noisePolicy && <Row label="Noise policy" value={noisePolicy} />}

        {phonePolicyId !== null && (
          <Row
            label="Phone policy"
            value={phonePolicyLabels[phonePolicyId] ?? 'Unknown'}
          />
        )}

        {timeLimitMinutes && (
          <Row label="Time limit" value={formatTimeLimit(timeLimitMinutes)} />
        )}

        {wheelchairAccessible !== null && (
          <Row
            label="Accessibility"
            value={
              wheelchairAccessible
                ? 'Wheelchair accessible'
                : 'Not wheelchair accessible'
            }
          />
        )}

        {location.day_hours.length > 0 && (
          <>
            <Text style={styles.hoursTitle}>Hours</Text>

            {groupHours(location.day_hours).map((group) => (
              <Row key={group.label} label={group.label} value={group.value} />
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xxs,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  value: {
    ...typography.label,
    color: colors.textPrimary,
  },
  hoursTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xxs,
  },
});
