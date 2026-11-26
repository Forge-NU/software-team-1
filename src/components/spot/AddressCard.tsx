import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import type { SpotAddressStatus } from '../../hooks/useSpotAddress';
import { formatAddress } from '../../lib/spot';
import type { Address } from '../../types/location';
import { colors, spacing, typography } from '../../theme';
import { spotStyles } from './styles';

interface AddressCardProps {
  name: string;
  address: Address | null;
  status: SpotAddressStatus;
  onGetDirections: () => void;
}

/**
 * The spot's address in one row: pin, street over city, directions arrow.
 * Tapping anywhere on it opens directions.
 */
export default function AddressCard({ name, address, status, onGetDirections }: AddressCardProps) {
  const formatted = formatAddress(address);

  let title = formatted?.street ?? formatted?.locality ?? 'Address unavailable';
  let subtitle = formatted?.street ? formatted.locality : null;
  if (!formatted && status === 'loading') {
    title = 'Finding address…';
    subtitle = null;
  }

  return (
    <TouchableOpacity
      onPress={onGetDirections}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Get directions to ${name}${formatted ? `, ${formatted.full}` : ''}`}
      style={styles.card}
    >
      {/* The row lives on a plain View so the touchable wrapper can't drop it */}
      <View style={styles.row}>
        <View style={spotStyles.iconTile}>
          <Feather name="map-pin" size={16} color={colors.primaryDark} />
        </View>

        <View style={styles.text}>
          <Text style={[styles.title, !formatted && styles.muted]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <Feather name="navigation" size={18} color={colors.primaryDark} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.label,
    color: colors.textPrimary,
  },
  muted: {
    color: colors.textSecondary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
