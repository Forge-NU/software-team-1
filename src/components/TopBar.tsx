import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { colors, layout, radius, spacing, typography } from '../theme'

interface TopBarProps {
  title: string
  size?: 'regular' | 'large'
  onBack?: () => void
  /** A small pill on the right, e.g. Study preferences' "Skip" */
  action?: { label: string; onPress: () => void }
}

/**
 * White header with the "Spotted" wordmark on the left and a centered title.
 * Pads the top safe area itself, so put it first on the screen, outside any SafeAreaView.
 */
export default function TopBar({ title, size = 'regular', onBack, action }: TopBarProps) {
  const { top } = useSafeAreaInsets()
  return (
    <View style={[styles.bar, { height: layout.headerHeight + top, paddingTop: top }]}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Feather name="chevron-left" size={26} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <Text style={styles.wordmark}>Spotted</Text>
        )}
      </View>
      <Text accessibilityRole="header" style={[styles.title, size === 'large' && styles.titleLarge]}>
        {title}
      </Text>
      <View style={[styles.side, styles.sideRight]}>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button" style={styles.action}>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  side: { width: 90 },
  sideRight: { alignItems: 'flex-end' },
  action: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  actionLabel: { ...typography.label, color: colors.textOnPrimaryLight },
  wordmark: { ...typography.heading, color: colors.primary },
  title: { ...typography.heading, flex: 1, textAlign: 'center', color: colors.textPrimary },
  titleLarge: { ...typography.display },
})
