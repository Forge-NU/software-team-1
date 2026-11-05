import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import TopBar from '@/components/TopBar';
import { Text } from '@/components/ui';

interface AuthScaffoldProps extends PropsWithChildren {
  /** Title in the header bar, e.g. "Create an account" */
  headerTitle: string;
  title: string;
  subtitle?: string;
  /** Buttons pinned to the bottom of the page */
  actions: ReactNode;
  /** Fine print under the buttons */
  footnote?: string;
}

/** Layout of the Figma "Sign Up/In" frame. Form fields go in `children`. */
export function AuthScaffold({ headerTitle, title, subtitle, actions, footnote, children }: AuthScaffoldProps) {
  const { bottom } = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <TopBar title={headerTitle} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow gap-md p-xl"
          contentContainerStyle={{ paddingBottom: bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center gap-xs">
            <BrandMark />
            <Text variant="hero" accessibilityRole="header" className="text-center">
              {title}
            </Text>
            {subtitle ? (
              <Text color="textSecondary" className="text-center">
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View className="gap-sm">{children}</View>

          {/* Pushes the buttons to the bottom on tall screens; collapses on small ones */}
          <View className="min-h-[16px] flex-1" />

          <View className="gap-sm">{actions}</View>

          {footnote ? (
            <Text variant="small" color="textSecondary" className="text-center">
              {footnote}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
