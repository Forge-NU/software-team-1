import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Wordmark } from '@/components/Wordmark';
import { useAuth } from '@/providers/auth-context';

interface AuthScaffoldProps extends PropsWithChildren {
  /** Centered in the white header bar, e.g. "Create an account" */
  headerTitle: string;
  title: string;
  subtitle?: string;
  /** Buttons pinned to the bottom of the page */
  actions: ReactNode;
  /** Fine print under the buttons */
  footnote?: string;
}

/** Layout from the Figma "Sign Up/In" frame. Form fields go in `children`. */
export function AuthScaffold({
  headerTitle,
  title,
  subtitle,
  actions,
  footnote,
  children,
}: AuthScaffoldProps) {
  const insets = useSafeAreaInsets();
  const { isFakeAuth } = useAuth();

  return (
    <View className="flex-1 bg-surface-canvas">
      <View className="bg-surface" style={{ paddingTop: insets.top }}>
        <View className="h-14 justify-center px-gutter">
          <Wordmark className="absolute left-gutter" />
          <Text accessibilityRole="header" className="text-center font-sans-medium text-heading text-ink">
            {headerTitle}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow px-gutter pt-8"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center gap-3">
            <View className="mb-3 h-[72px] w-[72px] items-center justify-center rounded-card bg-primary-soft">
              <Logo size={42} />
            </View>
            <Text className="text-center font-sans text-title text-ink">{title}</Text>
            {subtitle ? (
              <Text className="text-center font-sans text-body text-ink-muted">{subtitle}</Text>
            ) : null}
          </View>

          <View className="mt-section gap-4">{children}</View>

          {/* Pushes the buttons to the bottom on tall screens; collapses on small ones */}
          <View className="min-h-8 flex-1" />

          <View className="gap-3">{actions}</View>

          {footnote ? (
            <Text className="mt-4 text-center font-sans text-caption text-ink-muted">{footnote}</Text>
          ) : null}
          {isFakeAuth ? (
            <Text className="mt-2 text-center font-sans text-caption text-ink-subtle">
              Dev mode: fake auth. Any valid email/password signs you in.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
