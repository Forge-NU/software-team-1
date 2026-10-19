// Types for tokens.js so `import { colors } from '@/theme/tokens'` autocompletes.
// Keep in sync with tokens.js.

type FontSizeToken = [string, { lineHeight: string }];

export declare const colors: {
  primary: { DEFAULT: string; pressed: string; soft: string; muted: string; logo: string };
  ink: { DEFAULT: string; muted: string; subtle: string; inverse: string };
  surface: { DEFAULT: string; canvas: string; muted: string };
  line: { DEFAULT: string; strong: string };
  danger: { DEFAULT: string; soft: string };
  success: { DEFAULT: string; soft: string };
  warning: { DEFAULT: string; soft: string };
  crowd: { low: string; medium: string; high: string };
};

export declare const fontFamily: {
  sans: string[];
  'sans-medium': string[];
  'sans-semibold': string[];
};

export declare const fontSize: {
  display: FontSizeToken;
  title: FontSizeToken;
  lead: FontSizeToken;
  heading: FontSizeToken;
  body: FontSizeToken;
  label: FontSizeToken;
  caption: FontSizeToken;
};

export declare const spacing: { gutter: string; section: string };

export declare const borderRadius: { input: string; button: string; card: string; pill: string };
