import { en } from './catalogs/en'
import { es } from './catalogs/es'

export const catalogs = {
  en,
  es,
} as const

export type CatalogLocale = keyof typeof catalogs

export const translatedCatalogLocales = Object.keys(catalogs) as CatalogLocale[]

export const supportedLocales = [
  'en-US',
  'en-GB',
  'en-CA',
  'en-AU',
  'en-SG',
  'en-PH',
  'es-ES',
  'es-MX',
  'es-AR',
  'es-CO',
  'pt-BR',
  'pt-PT',
  'fr-FR',
  'fr-CA',
  'de-DE',
  'it-IT',
  'nl-NL',
  'sv-SE',
  'pl-PL',
  'ja-JP',
  'ko-KR',
  'zh-CN',
  'zh-TW',
  'hi-IN',
  'id-ID',
] as const

export type AppLocale = (typeof supportedLocales)[number]

export const defaultLocale: AppLocale = 'en-US'
export const defaultCatalogLocale: CatalogLocale = 'en'

const normalizedSupportedLocaleMap = new Map(
  supportedLocales.map((locale) => [locale.toLowerCase(), locale] as const),
)

const languageFallbackLocales = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  nl: 'nl-NL',
  sv: 'sv-SE',
  pl: 'pl-PL',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  hi: 'hi-IN',
  id: 'id-ID',
} as const satisfies Record<string, AppLocale>

type SupportedLanguageCode = keyof typeof languageFallbackLocales

export function normalizeLocaleTag(locale: string) {
  const [language, region, ...rest] = locale.replace('_', '-').split('-')
  const normalizedLanguage = language?.toLowerCase() ?? ''
  const normalizedRegion = region ? region.toUpperCase() : undefined

  return [normalizedLanguage, normalizedRegion, ...rest].filter(Boolean).join('-')
}

export function getLanguageCode(locale: string) {
  return normalizeLocaleTag(locale).split('-')[0] ?? defaultCatalogLocale
}

export function getCatalogLocale(locale: string): CatalogLocale {
  const languageCode = getLanguageCode(locale)

  if (languageCode in catalogs) {
    return languageCode as CatalogLocale
  }

  return defaultCatalogLocale
}

export function isSupportedLocale(locale: string): locale is AppLocale {
  return normalizedSupportedLocaleMap.has(normalizeLocaleTag(locale).toLowerCase())
}

export function resolveSupportedLocale(candidateLocales: Array<string | null | undefined>): AppLocale {
  for (const candidate of candidateLocales) {
    if (!candidate) continue

    const exactMatch = normalizedSupportedLocaleMap.get(normalizeLocaleTag(candidate).toLowerCase())
    if (exactMatch) {
      return exactMatch
    }
  }

  for (const candidate of candidateLocales) {
    if (!candidate) continue

    const languageCode = getLanguageCode(candidate)
    const fallbackLocale =
      languageFallbackLocales[languageCode as SupportedLanguageCode]
    if (fallbackLocale) {
      return fallbackLocale
    }
  }

  return defaultLocale
}
