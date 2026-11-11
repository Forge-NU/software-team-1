import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenProps extends PropsWithChildren {
  /** Usually a <TopBar>. It pads the top safe area itself. */
  header?: ReactNode;
  /** Wrap the content in a ScrollView (long pages, forms) */
  scroll?: boolean;
  /** Pad the bottom safe area. Leave off inside tabs; the tab bar already does it. */
  padBottom?: boolean;
  /** Classes for the content area, e.g. "gap-md pt-xl" */
  contentClassName?: string;
}

/** Page wrapper: background color, optional header, gutter on both sides. */
export function Screen({ header, scroll = false, padBottom = false, contentClassName = '', children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottom = { paddingBottom: padBottom ? insets.bottom : 0 };
  const contentClass = `px-gutter ${contentClassName}`;

  return (
    <View className="flex-1 bg-background">
      {header}
      {scroll ? (
        <ScrollView
          className="flex-1"
          // No `grow`: iOS adds the header and tab bar insets on top of the content height,
          // so stretching it to fill the view would make a short page scrollable
          contentContainerClassName={contentClass}
          contentContainerStyle={bottom}
          keyboardShouldPersistTaps="handled"
          // Under a native header (iOS 26 glass), starts below it but scrolls up under it.
          // Keep vertical bounce on (the default): iOS only applies these insets when the
          // page counts as scrollable, so turning it off leaves short pages under the header
          contentInsetAdjustmentBehavior="automatic"
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${contentClass}`} style={bottom}>
          {children}
        </View>
      )}
    </View>
  );
}
