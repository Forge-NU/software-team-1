import { Platform } from 'react-native'
import { useHeaderHeight } from 'expo-router/react-navigation'

/**
 * How far the native stack header covers the top of the screen.
 *
 * On iOS 26+ the header is transparent Liquid Glass drawn over the screen, so content
 * that doesn't scroll (a pinned search field, a camera view) needs this as top padding.
 * Elsewhere the screen already starts below the header, so it's 0.
 * Scrolling content should use `contentInsetAdjustmentBehavior="automatic"` instead.
 */
export function useHeaderOverlap(): number {
  const headerHeight = useHeaderHeight()
  const glassHeader = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26
  return glassHeader ? headerHeight : 0
}
