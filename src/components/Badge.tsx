import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing, typography } from '../theme'

interface BadgeProps {
  label: string
  tone?: 'highlight' | 'neutral'
}

/** Small rounded label, e.g. "Busy", "Live", "Posted just now". */
export default function Badge({ label, tone = 'highlight' }: BadgeProps) {
  return (
    <View style={[styles.badge, tone === 'neutral' && styles.neutral]}>
      <Text style={[styles.text, tone === 'neutral' && styles.neutralText]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    alignSelf: 'flex-start',
  },
  neutral: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  text: { ...typography.tag, color: colors.textOnPrimaryLight },
  neutralText: { color: colors.textSecondary },
})
