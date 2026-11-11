import React, { type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, layout, spacing, typography } from '../theme'

interface TopBarProps {
  title: string
  size?: 'regular' | 'large'
  right?: ReactNode
}

/**
 * White header with a centered title, for tab and auth screens (no back button needed there).
 * Pushed screens use the native stack header instead, which adds the back button itself;
 * see src/app/_layout.tsx.
 * Pads the top safe area itself, so put it first on the screen, outside any SafeAreaView.
 */
export default function TopBar({ title, size = 'regular', right }: TopBarProps) {
  const { top } = useSafeAreaInsets()
  return (
    <View style={[styles.bar, { height: layout.headerHeight + top, paddingTop: top }]}>
      {/* Empty left side keeps the title centered against the right slot */}
      <View style={styles.side} />
      <Text accessibilityRole="header" style={[styles.title, size === 'large' && styles.titleLarge]}>
        {title}
      </Text>
      <View style={[styles.side, styles.sideRight]}>{right}</View>
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
  title: { ...typography.heading, flex: 1, textAlign: 'center', color: colors.textPrimary },
  titleLarge: { ...typography.display },
})
