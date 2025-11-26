export const radii = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
} as const

export type RadiusToken = keyof typeof radii
