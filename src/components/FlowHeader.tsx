import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { colors, layout, radius, spacing, typography } from '../theme'

interface FlowHeaderProps {
  title: string
  onBack?: () => void
  onCancel?: () => void
  /** The details step shows Cancel as a pill, the others as plain text. */
  cancelStyle?: 'text' | 'pill'
}

/** Header for multi-step flows: back arrow + title on the left, Cancel on the right. */
export default function FlowHeader({ title, onBack, onCancel, cancelStyle = 'text' }: FlowHeaderProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Feather name="arrow-left" size={26} color={colors.textPrimary} />
          </Pressable>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      {onCancel && (
        <Pressable
          onPress={onCancel}
          hitSlop={10}
          accessibilityRole="button"
          style={cancelStyle === 'pill' ? styles.cancelPill : undefined}
        >
          <Text style={cancelStyle === 'pill' ? styles.cancelPillText : styles.cancelText}>Cancel</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: layout.headerHeight,
    paddingHorizontal: layout.screenPaddingHorizontal,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.heading, color: colors.textPrimary },
  cancelText: { ...typography.caption, color: colors.textSecondary },
  cancelPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  cancelPillText: { ...typography.bodySmall, color: colors.textPrimary },
})
