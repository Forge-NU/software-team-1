import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, typography } from '../theme'

/**
 * A text button for the native stack header, e.g.
 * `<Stack.Screen options={{ headerRight: () => <HeaderTextButton label="Cancel" onPress={…} /> }} />`.
 * Plain text: on iOS 26 the system draws the glass bubble around it.
 */
export default function HeaderTextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button">
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  label: { ...typography.bodyStrong, color: colors.primaryDark },
})
