import { de } from './catalogs/de'
import { en } from './catalogs/en'
import { es } from './catalogs/es'
import { fr } from './catalogs/fr'
import { hi } from './catalogs/hi'
import { id } from './catalogs/id'
import { it } from './catalogs/it'
import { ja } from './catalogs/ja'
import { ko } from './catalogs/ko'
import { nl } from './catalogs/nl'
import { pl } from './catalogs/pl'
import { pt } from './catalogs/pt'
import { sv } from './catalogs/sv'
import { zhHans } from './catalogs/zhHans'
import { zhHant } from './catalogs/zhHant'

export const catalogs = {
  de,
  en,
  es,
  fr,
  hi,
  id,
  it,
  ja,
  ko,
  nl,
  pl,
  pt,
  sv,
  zhHans,
  zhHant,
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

const marketCatalogLocales: Partial<Record<AppLocale, CatalogLocale>> = {
  'pt-BR': 'pt',
  'pt-PT': 'pt',
  'fr-FR': 'fr',
  'fr-CA': 'fr',
  'de-DE': 'de',
  'it-IT': 'it',
  'nl-NL': 'nl',
  'sv-SE': 'sv',
  'pl-PL': 'pl',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'zh-CN': 'zhHans',
  'zh-TW': 'zhHant',
  'hi-IN': 'hi',
  'id-ID': 'id',
}

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
  const normalizedLocale = normalizeLocaleTag(locale)
  const mappedCatalogLocale = marketCatalogLocales[normalizedLocale as AppLocale]

  if (mappedCatalogLocale) {
    return mappedCatalogLocale
  }

  const languageCode = getLanguageCode(normalizedLocale)

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
