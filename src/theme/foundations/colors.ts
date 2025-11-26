export const colors = {
  primary: 'rgb(147, 51, 234)', // purple-600
  primaryLight: 'rgb(168, 85, 247)', // purple-500 (brighter for dark mode)
  primaryDark: 'rgb(126, 34, 206)', // purple-700
  success: 'rgb(34, 197, 94)', // green-500
  warning: 'rgb(251, 146, 60)', // orange-400
  error: 'rgb(239, 68, 68)', // red-500
  info: 'rgb(59, 130, 246)', // blue-500
  background: {
    light: 'rgb(255, 255, 255)', // white
    dark: 'rgb(2, 6, 23)', // slate-950 - deeper dark for better contrast
  },
  surface: {
    light: 'rgb(248, 250, 252)', // slate-50
    dark: 'rgb(30, 41, 59)', // slate-900
  },
  border: {
    light: 'rgb(226, 232, 240)', // slate-200
    dark: 'rgb(51, 65, 85)', // slate-700
  },
  text: {
    primary: {
      light: 'rgb(15, 23, 42)', // slate-950 - highest contrast
      dark: 'rgb(248, 250, 252)', // slate-50 - highest contrast
    },
    secondary: {
      light: 'rgb(71, 85, 105)', // slate-600 - WCAG AA (7:1 contrast)
      dark: 'rgb(226, 232, 240)', // slate-200 - improved from slate-400 for better contrast
    },
    tertiary: {
      light: 'rgb(100, 116, 139)', // slate-500 - WCAG AA (4.5:1 contrast)
      dark: 'rgb(203, 213, 225)', // slate-300 - improved from slate-400 for better contrast
    },
  },
}

export type SemanticColor = keyof typeof colors
