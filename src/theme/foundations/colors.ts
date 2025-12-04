export const colors = {
  // Brand colors
  primary: '#a855f7', // purple-500 - pink/primary brand color
  primaryLight: '#c084fc', // purple-400 (lighter for hover states)
  primaryDark: '#7c3aed', // violet-600 - darker purple

  // Brand gradient colors (pink to purple)
  brand: {
    pink: '#a855f7', // purple-500 - primary brand color
    purple: '#7c3aed', // violet-600 - darker gradient color
    gradientStart: '#a855f7', // pink - start of gradient
    gradientEnd: '#7c3aed', // purple - end of gradient
    // RGB versions for opacity usage
    gradientStartRgb: '168, 85, 247',
    gradientEndRgb: '124, 58, 237',
  },

  // Semantic colors
  success: 'rgb(34, 197, 94)', // green-500
  warning: 'rgb(251, 146, 60)', // orange-400
  error: 'rgb(239, 68, 68)', // red-500
  info: 'rgb(59, 130, 246)', // blue-500

  // Backgrounds
  background: {
    light: 'rgb(255, 255, 255)', // white
    dark: '#0D0D0F', // true off-black for all dark mode screens
  },

  // Surfaces
  surface: {
    light: 'rgb(248, 250, 252)', // slate-50
    dark: 'rgb(30, 41, 59)', // slate-900
  },

  // Borders
  border: {
    light: 'rgb(226, 232, 240)', // slate-200
    dark: 'rgb(51, 65, 85)', // slate-700
  },

  // Text
  text: {
    primary: {
      light: 'rgb(15, 23, 42)', // slate-950 - highest contrast
      dark: 'rgb(248, 250, 252)', // slate-50 - highest contrast
    },
    secondary: {
      light: 'rgb(71, 85, 105)', // slate-600 - WCAG AA (7:1 contrast)
      dark: 'rgba(255, 255, 255, 0.5)', // 50% white for muted text on dark
    },
    tertiary: {
      light: 'rgb(100, 116, 139)', // slate-500 - WCAG AA (4.5:1 contrast)
      dark: 'rgba(255, 255, 255, 0.4)', // 40% white for subtle text on dark
    },
  },
}

export type SemanticColor = keyof typeof colors
