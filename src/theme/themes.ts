/**
 * Theme Definitions
 *
 * Single source of truth for all theme values.
 * To add a new theme: add to ThemeName union + add object to themes record.
 */

export type ThemeName = 'sage'

export interface Theme {
  colors: {
    brand: {
      primary: string
      light: string
      dark: string
    }
    background: string
    card: string
    text: {
      primary: string
      secondary: string
      tertiary: string
      muted: string
    }
    border: {
      primary: string
      secondary: string
      divider: string
    }
    interactive: {
      hover: string
      activeShadow: string
    }
  }
  priority: {
    top: { color: string; gradient: [string, string] }
    high: { color: string }
    medium: { color: string }
    low: { color: string }
  }
  gradients: {
    primary: [string, string]
    primaryLight: [string, string]
  }
  spacing: {
    xs: number
    sm: number
    md: number
    lg: number
    xl: number
    '2xl': number
  }
  radius: {
    sm: number
    md: number
    lg: number
    xl: number
    full: number
  }
}

const sage: Theme = {
  colors: {
    brand: {
      primary: '#7D9B8A',
      light: '#A3BFB0',
      dark: '#5A7765',
    },
    background: '#FAF8F5',
    card: '#F5F2ED',
    text: {
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
    interactive: {
      hover: '#EFEEE8',
      activeShadow: 'rgba(125, 155, 138, 0.3)',
    },
  },
  priority: {
    top: {
      color: '#7D9B8A',
      gradient: ['#7D9B8A', '#5A7765'],
    },
    high: { color: '#D77A61' },
    medium: { color: '#E8B86D' },
    low: { color: '#8B9DAF' },
  },
  gradients: {
    primary: ['#7D9B8A', '#5A7765'],
    primaryLight: ['#7D9B8A', '#A3BFB0'],
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
}

export const themes: Record<ThemeName, Theme> = {
  sage,
}

export const defaultTheme: ThemeName = 'sage'
