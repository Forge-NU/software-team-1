const { colors, fontFamily, fontSize, spacing, borderRadius } = require('./src/theme/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Every file that uses className must be matched here
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // `extend` keeps Tailwind's defaults (p-4, gap-2, flex-1, ...) and adds our tokens on top
    extend: { colors, fontFamily, fontSize, spacing, borderRadius },
  },
  plugins: [],
};
