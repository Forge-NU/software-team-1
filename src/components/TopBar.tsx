import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { colors, layout, spacing, typography } from '../theme'

interface TopBarProps {
  title: string
  size?: 'regular' | 'large'
  onBack?: () => void
}

/** White header with the "Spotted" wordmark on the left and a centered title. */
export default function TopBar({ title, size = 'regular', onBack }: TopBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Feather name="chevron-left" size={26} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <Text style={styles.wordmark}>Spotted</Text>
        )}
      </View>
      <Text style={[styles.title, size === 'large' && styles.titleLarge]}>{title}</Text>
      <View style={styles.side} />
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.headerHeight,
    paddingHorizontal: layout.screenPaddingHorizontal,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  side: { width: 90 },
  wordmark: { ...typography.heading, color: colors.primary },
  title: { ...typography.heading, flex: 1, textAlign: 'center', color: colors.textPrimary },
  titleLarge: { ...typography.display },
})
