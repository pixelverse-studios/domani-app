/** @type {import('tailwindcss').Config} */
const nativewind = require('nativewind/preset')

// Colors mirrored from src/theme/themes.ts (sage theme)
// Keep in sync when updating theme values
module.exports = {
  presets: [nativewind],
  content: ['./src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}', './global.css'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#7D9B8A',
          light: '#A3BFB0',
          dark: '#5A7765',
        },
        surface: {
          bg: '#FAF8F5',
          card: '#F5F2ED',
        },
        content: {
          primary: '#3D4A44',
          secondary: '#6B7265',
          tertiary: '#9BA69E',
          muted: '#ADB7B0',
        },
        border: {
          primary: '#E8E4DD',
          secondary: '#DDD9D0',
          divider: '#E8E4DD',
        },
        priority: {
          top: '#7D9B8A',
          high: '#D77A61',
          medium: '#E8B86D',
          low: '#8B9DAF',
        },
        interactive: {
          hover: '#EFEEE8',
        },
        accent: {
          terracotta: '#D77A61',
          brick: '#C17B6F',
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        'sans-bold': ['Inter_700Bold'],
        display: ['Inter_700Bold'],
        body: ['Inter_400Regular'],
      },
    },
  },
  plugins: [],
}
