import type { ReactNode } from 'react';
import { View } from 'react-native';

import TopBar from '@/components/TopBar';
import { Screen, Text } from '@/components/ui';

interface PlaceholderScreenProps {
  title: string;
  /** The ticket that replaces this screen, e.g. "F-10" */
  ticket: string;
  onBack?: () => void;
  /** Anything handy for testing until the real screen exists */
  children?: ReactNode;
}

/** Stand-in for screens owned by later tickets. Replace the route file's contents when you build yours. */
export function PlaceholderScreen({ title, ticket, onBack, children }: PlaceholderScreenProps) {
  return (
    <Screen header={<TopBar title={title} onBack={onBack} />} scroll contentClassName="gap-md py-xl">
      <View className="rounded-xl bg-primaryLight p-md">
        <Text color="textSecondary">Placeholder. This screen is built in {ticket}.</Text>
      </View>
      {children}
    </Screen>
  );
}
