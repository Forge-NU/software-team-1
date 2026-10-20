
const palette = {
    blue50: '#F7FBFF',
    blue100: '#E3F1FB',
    blue200: '#D9E7F5',
    blue400: '#99C3E4',
    blue700: '#176FD3',
    gray500: '#6B7280',
    gray900: '#111827',
    red600: '#DC2626',
    white: '#FFFFFF',
    black: '#000000',
} as const;

export const colors = {
    primary: palette.blue400,
    primaryLight: palette.blue100,
    primaryDark: palette.blue700,
    background: palette.blue50,
    surface: palette.white,
    border: palette.blue200,
    textPrimary: palette.gray900,
    textSecondary: palette.gray500,
    textOnPrimaryLight: palette.blue700,
    danger: palette.red600,
    shadow: palette.black,
} as const;
