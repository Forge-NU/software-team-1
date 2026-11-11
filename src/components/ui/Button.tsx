import { ActivityIndicator, Pressable } from 'react-native';

import { colors } from '@/theme';

import { Text } from './Text';

const variants = {
  // Figma "BtnBlock" ("Create account")
  primary: { container: 'bg-primaryDark', label: 'textOnPrimary' },
  // Figma "BtnPrimary" ("Sign in with Northeastern")
  secondary: { container: 'bg-primaryLight', label: 'textOnPrimaryLight' },
  outline: { container: 'bg-surface', label: 'primaryDark' },
} as const;

type Variant = keyof typeof variants;

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  /** Shows a spinner and blocks presses, e.g. while a form submits */
  loading?: boolean;
  disabled?: boolean;
  /** Layout only (margins, width). Colors come from `variant`. */
  className?: string;
  accessibilityHint?: string;
}

/** Full-width button from the Figma Components page. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  accessibilityHint,
}: ButtonProps) {
  const inactive = disabled || loading;
  const style = variants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      className={`min-h-[52px] items-center justify-center rounded-lg border border-border px-xl active:opacity-80 ${
        style.container
      } ${inactive ? 'opacity-60' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={colors[style.label]} />
      ) : (
        <Text variant="bodyStrong" color={style.label}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
