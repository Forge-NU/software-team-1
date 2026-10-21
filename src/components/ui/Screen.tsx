import type { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenProps extends PropsWithChildren {
  /** Wrap content in a ScrollView (long pages, forms) */
  scroll?: boolean;
  /** Pad the bottom safe area. Leave off inside tabs; the tab bar already handles it. */
  padBottom?: boolean;
  className?: string;
}

/** Standard page wrapper: canvas background, safe-area top padding, gutter on both sides. */
export function Screen({ children, scroll = false, padBottom = false, className = '' }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const safeArea = { paddingTop: insets.top, paddingBottom: padBottom ? insets.bottom : 0 };

  if (scroll) {
    return (
      <ScrollView
        className="flex-1 bg-surface-canvas"
        contentContainerClassName={`grow px-gutter ${className}`}
        contentContainerStyle={safeArea}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View className={`flex-1 bg-surface-canvas px-gutter ${className}`} style={safeArea}>
      {children}
    </View>
  );
}
