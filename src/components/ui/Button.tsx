import { ActivityIndicator, Pressable, Text } from 'react-native';

import { colors } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost';
type Shape = 'rounded' | 'pill';

const containerClass: Record<Variant, string> = {
  primary: 'bg-primary active:bg-primary-pressed',
  // "Sign in with Northeastern" in Figma
  secondary: 'border border-line bg-primary-soft active:bg-surface-muted',
  ghost: 'bg-transparent active:bg-surface-muted',
};

const labelClass: Record<Variant, string> = {
  primary: 'text-ink-inverse',
  secondary: 'text-primary',
  ghost: 'text-primary',
};

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  /** rounded = "Create account", pill = "Get started" */
  shape?: Shape;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  shape = 'rounded',
  loading = false,
  disabled = false,
  className = '',
}: ButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      className={`h-12 flex-row items-center justify-center px-6 ${
        shape === 'pill' ? 'rounded-pill' : 'rounded-button'
      } ${containerClass[variant]} ${inactive ? 'opacity-60' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.ink.inverse : colors.primary.DEFAULT}
        />
      ) : (
        <Text className={`font-sans-medium text-body ${labelClass[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}
