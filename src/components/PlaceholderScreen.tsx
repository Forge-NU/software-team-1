import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

import { Screen } from '@/components/ui';

interface PlaceholderScreenProps extends PropsWithChildren {
  title: string;
  description?: string;
}

/** Stand-in for tabs/pages owned by later tickets. Replace the whole file when you build yours. */
export function PlaceholderScreen({ title, description, children }: PlaceholderScreenProps) {
  return (
    <Screen scroll className="gap-4 pb-6 pt-6">
      <Text className="font-sans-semibold text-display text-ink">{title}</Text>
      <View className="rounded-card bg-primary-soft p-4">
        <Text className="font-sans text-body text-ink-muted">
          {description ?? 'Placeholder — this screen is built in a later ticket.'}
        </Text>
      </View>
      {children}
    </Screen>
  );
}
