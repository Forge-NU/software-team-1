/**
 * Spotted design tokens: the ONE place colors, fonts, type sizes, spacing and radii are defined.
 *
 * tailwind.config.js reads this file, so every value here becomes a NativeWind class:
 *   colors.primary.DEFAULT  -> bg-primary, text-primary, border-primary
 *   colors.surface.canvas   -> bg-surface-canvas
 *   colors.ink.muted        -> text-ink-muted
 *   fontFamily['sans-medium'] -> font-sans-medium
 *   fontSize.title          -> text-title
 *   spacing.gutter          -> px-gutter, left-gutter, gap-gutter
 *   borderRadius.card       -> rounded-card
 *
 * Use classes in components. Import this file directly ONLY when an API needs a raw value
 * (icon colors, placeholderTextColor, navigation options). Never hardcode hex values in screens.
 *
 * Values were sampled from the Figma "Spotted" (welcome) and "Sign Up/In" frames.
 * Sizes are scaled from the Figma frame to a ~390pt-wide phone.
 *
 * Plain CommonJS (not TS) because tailwind.config.js has to require() it.
 * Types live in tokens.d.ts — update both when adding a token.
 */

const colors = {
  primary: {
    DEFAULT: '#3470CF', // buttons, links
    pressed: '#2B5EB3',
    soft: '#E6EFF9', // secondary button fill, icon tiles, carousel card
    muted: '#9DBDE3', // "Spotted" wordmark, decorative icons
    logo: '#B6C6D8', // logo mark (src/components/Logo.tsx)
  },
  ink: {
    DEFAULT: '#1D1B1E', // headings, body text
    muted: '#5C5D63', // subtitles, helper text
    subtle: '#A6ABB3', // placeholders, inactive tab icons
    inverse: '#FFFFFF', // text on primary
  },
  surface: {
    DEFAULT: '#FFFFFF', // header bars, inputs, cards
    canvas: '#F6F9FD', // page background
    muted: '#EEF3F9', // pressed states, placeholder blocks
  },
  // "line" instead of "border" so the class reads border-line, not border-border
  line: { DEFAULT: '#D7E2EE', strong: '#BFD0E2' },
  danger: { DEFAULT: '#D92D20', soft: '#FDECEA' },
  success: { DEFAULT: '#12A150', soft: '#E7F6EE' },
  warning: { DEFAULT: '#DC8A00', soft: '#FFF4E0' },
  // Crowdedness indicators for spot cards / detail
  crowd: { low: '#12A150', medium: '#DC8A00', high: '#D92D20' },
};

// Font: Outfit (loaded in src/app/_layout.tsx). RN can't pick a weight from one family,
// so each weight is its own class. Use these instead of font-medium / font-semibold.
// Every <Text> needs one of these classes, usually font-sans.
const fontFamily = {
  sans: ['Outfit_400Regular'],
  'sans-medium': ['Outfit_500Medium'],
  'sans-semibold': ['Outfit_600SemiBold'],
};

// [fontSize, { lineHeight }]
const fontSize = {
  display: ['26px', { lineHeight: '32px' }], // welcome headline
  title: ['24px', { lineHeight: '30px' }], // auth hero ("Your city, your spots.")
  lead: ['20px', { lineHeight: '28px' }], // carousel card text
  heading: ['17px', { lineHeight: '22px' }], // header bar titles, card titles
  body: ['15px', { lineHeight: '21px' }],
  label: ['13px', { lineHeight: '18px' }], // form labels
  caption: ['12px', { lineHeight: '16px' }], // helper text, fine print
};

// Added on top of Tailwind's default 4px scale (p-1 = 4px, p-4 = 16px, ...)
const spacing = {
  gutter: '20px', // horizontal screen padding
  section: '28px', // gap between page sections
};

const borderRadius = {
  input: '14px',
  button: '14px', // "Create account" style; use rounded-pill for "Get started" style
  card: '20px',
  pill: '999px',
};

module.exports = { colors, fontFamily, fontSize, spacing, borderRadius };
