export const typography = {
  fonts: {
    display: 'System',
    body: 'System'
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32
  },
  lineHeights: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  }
} as const;

export type TypographyScale = keyof typeof typography.sizes;
