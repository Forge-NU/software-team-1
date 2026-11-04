import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography, type ColorName, type TypographyVariant } from '@/theme';

export interface TextProps extends RNTextProps {
  /** A style from the type scale in src/theme/typography.ts. Sets font, size and line height. */
  variant?: TypographyVariant;
  /** A semantic color from src/theme/colors.ts */
  color?: ColorName;
  className?: string;
}

/**
 * Use this instead of React Native's <Text> so every label uses the Figma type scale.
 * `className` / `style` still work for layout (margins, alignment) and override the defaults.
 *
 *   <Text variant="heading">Best options right now</Text>
 *   <Text variant="caption" color="textSecondary">Reported 12 min ago</Text>
 */
export function Text({ variant = 'body', color = 'textPrimary', style, ...rest }: TextProps) {
  return <RNText style={[typography[variant], { color: colors[color] }, style]} {...rest} />;
}
