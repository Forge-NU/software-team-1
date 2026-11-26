import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { colors, typography } from '../theme'

// Platform.Version is a string like "26.1" on iOS
const isLiquidGlass = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26

/** Matches each platform's own filter icon: glass bubble on iOS 26+, circled before that, Material on Android */
export default function HeaderFilterButton({
  activeCount,
  onPress,
}: {
  activeCount: number
  onPress: () => void
}) {
  const active = activeCount > 0
  const label = active ? `Filters, ${activeCount} active` : 'Filters'

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: colors.border, borderless: true, radius: 20 }}
      style={styles.button}
    >
      {isLiquidGlass ? (
        <Ionicons
          name="filter"
          size={22}
          color={active ? colors.primaryDark : colors.textPrimary}
        />
      ) : Platform.OS === 'ios' ? (
        <Ionicons
          name={active ? 'filter-circle' : 'filter-circle-outline'}
          size={26}
          color={colors.primaryDark}
        />
      ) : (
        <View>
          <MaterialIcons name="filter-list" size={24} color={colors.textPrimary} />
          {active && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeCount}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typography.caption, fontSize: 10, lineHeight: 12, color: colors.textOnPrimary },
})
