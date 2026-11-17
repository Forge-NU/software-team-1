import React from 'react'
import { Platform, Pressable, StyleSheet } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { colors } from '../theme'

/**
 * Close (X) button for a sheet's native header, styled per platform:
 * - iOS: thin "xmark"-style icon for `headerRight`; iOS 26 draws the glass bubble around it.
 * - Android: Material "close" icon with a round ripple, for `headerLeft` (Material full-screen dialog).
 * Use `sheetCloseOptions(onClose)` to put it on the expected side for each platform.
 */
export default function SheetCloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Close"
      android_ripple={{ color: colors.border, borderless: true, radius: 20 }}
      style={styles.button}
    >
      {Platform.OS === 'ios' ? (
        <Ionicons name="close" size={22} color={colors.textPrimary} />
      ) : (
        <MaterialIcons name="close" size={24} color={colors.textPrimary} />
      )}
    </Pressable>
  )
}

/** Header options that place the close button top-right on iOS and top-left elsewhere. */
export function sheetCloseOptions(onClose: () => void) {
  const button = () => <SheetCloseButton onPress={onClose} />
  return Platform.OS === 'ios' ? { headerRight: button } : { headerLeft: button }
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
})
