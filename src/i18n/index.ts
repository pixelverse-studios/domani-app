import { en } from './catalogs/en'
import { es } from './catalogs/es'

export const catalogs = {
  en,
  es,
} as const

export type AppLocale = keyof typeof catalogs

export const defaultLocale: AppLocale = 'en'

export const supportedLocales = Object.keys(catalogs) as AppLocale[]
