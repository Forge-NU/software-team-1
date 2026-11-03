import { View } from 'react-native';

import { Text } from '@/components/ui';

interface FormMessageProps {
  message: string | null;
  /** error: something went wrong; info: next steps, e.g. "check your email" */
  tone: 'error' | 'info';
}

/** A message above a form's buttons. Screen readers announce it when it appears. */
export function FormMessage({ message, tone }: FormMessageProps) {
  if (!message) return null;
  return (
    <View
      className={`rounded-lg p-sm ${tone === 'error' ? 'border border-danger bg-surface' : 'bg-primaryLight'}`}
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
    >
      <Text variant="bodySmall" color={tone === 'error' ? 'danger' : 'textOnPrimaryLight'} className="text-center">
        {message}
      </Text>
    </View>
  );
}
