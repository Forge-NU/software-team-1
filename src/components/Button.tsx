import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing, typography } from '../theme'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'outline'
  disabled?: boolean
  loading?: boolean
}

export default function Button({ label, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const isPrimary = variant === 'primary'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {loading && <ActivityIndicator size="small" color={colors.textPrimary} />}
        <Text style={[styles.label, !isPrimary && styles.outlineLabel]}>{label}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary },
  outline: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.textSecondary },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { ...typography.bodyStrong, color: colors.textPrimary },
  outlineLabel: { ...typography.body, color: colors.textSecondary },
})
