import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Screen, Text } from '@/components/ui';

interface PlaceholderScreenProps {
  /** The ticket that replaces this screen, e.g. "F-10" */
  ticket: string;
  /** Anything handy for testing until the real screen exists */
  children?: ReactNode;
}

/**
 * Stand-in for screens owned by later tickets. Replace the route file's contents when you build yours.
 * The title shows in the native header; set it in the stack's layout.
 */
export function PlaceholderScreen({ ticket, children }: PlaceholderScreenProps) {
  return (
    <Screen scroll contentClassName="gap-md py-xl">
      <View className="rounded-xl bg-primaryLight p-md">
        <Text color="textSecondary">Placeholder. This screen is built in {ticket}.</Text>
      </View>
      {children}
    </Screen>
  );
}
