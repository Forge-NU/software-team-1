/**
 * Raw color values from the Figma Style Guide / Hi-Fis. Not exported on purpose:
 * screens use the semantic `colors` below, so a future dark theme only has to
 * remap these roles instead of touching every screen.
 */
const palette = {
    blue50: '#F7FBFF',
    blue100: '#E3F1FB',
    blue200: '#D9E7F5',
    blue400: '#99C3E4',
    blue700: '#176FD3',
    gray300: '#BDBDBD',
    gray500: '#6B7280',
    gray900: '#111827',
    red600: '#DC2626',
    white: '#FFFFFF',
    black: '#000000',
} as const;

/**
 * Semantic colors. Use these names everywhere:
 * - StyleSheet: `colors.primaryDark`
 * - NativeWind: `bg-primaryDark`, `text-textSecondary`, `border-border`
 *
 * Green, amber and red are reserved for crowdedness status (CLAUDE.md), so they
 * are not brand colors. `danger` is only for errors and destructive actions.
 */
export const colors = {
    /** "Spotted" wordmark, map pins, light accents */
    primary: palette.blue400,
    /** Secondary button fill, active tab tile, icon tiles */
    primaryLight: palette.blue100,
    /** Primary buttons, links, active tab label */
    primaryDark: palette.blue700,
    /** Page background */
    background: palette.blue50,
    /** Headers, cards, inputs, tab bar */
    surface: palette.white,
    border: palette.blue200,
    textPrimary: palette.gray900,
    textSecondary: palette.gray500,
    /** Input placeholders */
    textPlaceholder: palette.gray300,
    /** Text on primaryLight surfaces */
    textOnPrimaryLight: palette.blue700,
    /** Text on primaryDark surfaces */
    textOnPrimary: palette.white,
    danger: palette.red600,
    shadow: palette.black,
} as const;

export type ColorName = keyof typeof colors;
