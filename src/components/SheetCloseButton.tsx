import React from 'react'
import { Platform, Pressable, StyleSheet } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { colors } from '../theme'

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

/** Puts the close button where each platform expects it: top-right on iOS, top-left on Android */
export function sheetCloseOptions(onClose: () => void) {
  const button = () => <SheetCloseButton onPress={onClose} />
  return Platform.OS === 'ios' ? { headerRight: button } : { headerLeft: button }
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
})
