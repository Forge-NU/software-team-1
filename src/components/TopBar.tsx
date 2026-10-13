import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { colors, fontFamily } from '../screens/theme'

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
            <Feather name="chevron-left" size={26} color={colors.text} />
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
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  side: { width: 90 },
  wordmark: { fontFamily, fontSize: 18, fontWeight: '500', color: colors.brand },
  title: { fontFamily, flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '500', color: colors.text },
  titleLarge: { fontSize: 26, fontWeight: '700' },
})
