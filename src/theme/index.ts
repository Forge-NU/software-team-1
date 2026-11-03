
import { colors } from './colors';
import { layout, radius, spacing } from './spacing';
import { fontFamily, typography } from './typography';

export * from './colors';
export * from './spacing';
export * from './typography';

export const theme = {
    colors,
    fontFamily,
    typography,
    spacing,
    radius,
    layout,
} as const;
