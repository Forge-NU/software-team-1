import { Text } from 'react-native';

/** "Spotted" wordmark from the top-left of the Figma frames. Swap for an SVG logo later if design makes one. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <Text accessibilityRole="header" className={`font-sans-medium text-heading text-primary-muted ${className}`}>
      Spotted
    </Text>
  );
}
