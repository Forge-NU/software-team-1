// NativeWind classes are generated from src/theme, the same tokens StyleSheet code uses,
// so there is one source of truth. jiti lets this CommonJS file load the TypeScript theme.
const jiti = require('jiti')(__filename);
const { colors, fontFamily, typography, spacing, radius, layout } = jiti('./src/theme');

const px = (value) => `${value}px`;
const mapValues = (object, fn) =>
  Object.fromEntries(Object.entries(object).map(([key, value]) => [key, fn(value)]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Every file that uses className must be matched here
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // `extend` keeps Tailwind's defaults (flex-1, p-4, ...) and adds our tokens on top
    extend: {
      // bg-primaryDark, text-textSecondary, border-border, ...
      colors,
      // font-sans, font-sans-medium, ... (prefer <Text variant>; it sets the font for you)
      fontFamily: {
        sans: [fontFamily.regular],
        'sans-medium': [fontFamily.medium],
        'sans-semibold': [fontFamily.semiBold],
        'sans-bold': [fontFamily.bold],
      },
      // text-body, text-caption, ... (size + line height only)
      fontSize: mapValues(typography, (t) => [px(t.fontSize), { lineHeight: px(t.lineHeight) }]),
      // p-md, gap-lg, px-gutter, ...
      spacing: { ...mapValues(spacing, px), gutter: px(layout.screenPaddingHorizontal) },
      // rounded-md, rounded-xxl, rounded-pill, ...
      borderRadius: mapValues(radius, px),
    },
  },
  plugins: [],
};
