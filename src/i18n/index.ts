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

type LocaleParts = {
  language: string
  script?: string
  region?: string
  variants: string[]
}

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
  const sanitizedLocale = locale.replaceAll('_', '-').trim()
  const [language, ...subtags] = sanitizedLocale.split('-').filter(Boolean)

  if (!language) {
    return ''
  }

  const normalizedLanguage = language.toLowerCase()
  let script: string | undefined
  let region: string | undefined
  const variants: string[] = []

  for (const subtag of subtags) {
    if (!script && /^[A-Za-z]{4}$/.test(subtag)) {
      script = `${subtag[0]?.toUpperCase() ?? ''}${subtag.slice(1).toLowerCase()}`
      continue
    }

    if (!region && (/^[A-Za-z]{2}$/.test(subtag) || /^\d{3}$/.test(subtag))) {
      region = subtag.toUpperCase()
      continue
    }

    variants.push(subtag)
  }

  return [normalizedLanguage, script, region, ...variants].filter(Boolean).join('-')
}

function parseLocaleParts(locale: string): LocaleParts {
  const normalizedLocale = normalizeLocaleTag(locale)
  const [language = '', ...subtags] = normalizedLocale.split('-').filter(Boolean)
  let script: string | undefined
  let region: string | undefined
  const variants: string[] = []

  for (const subtag of subtags) {
    if (!script && /^[A-Z][a-z]{3}$/.test(subtag)) {
      script = subtag
      continue
    }

    if (!region && (/^[A-Z]{2}$/.test(subtag) || /^\d{3}$/.test(subtag))) {
      region = subtag
      continue
    }

    variants.push(subtag)
  }

  return {
    language,
    script,
    region,
    variants,
  }
}

function resolveLocaleFallback(candidate: string): AppLocale | null {
  const normalizedCandidate = normalizeLocaleTag(candidate)
  if (!normalizedCandidate) {
    return null
  }

  const exactMatch = normalizedSupportedLocaleMap.get(normalizedCandidate.toLowerCase())
  if (exactMatch) {
    return exactMatch
  }

  const { language, script, region } = parseLocaleParts(normalizedCandidate)

  if (language === 'zh') {
    if (script === 'Hant' || region === 'TW' || region === 'HK' || region === 'MO') {
      return 'zh-TW'
    }

    if (script === 'Hans' || region === 'CN' || region === 'SG') {
      return 'zh-CN'
    }
  }

  const fallbackLocale = languageFallbackLocales[language as SupportedLanguageCode]
  return fallbackLocale ?? null
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
    const resolvedLocale = candidate ? resolveLocaleFallback(candidate) : null
    if (resolvedLocale) {
      return resolvedLocale
    }
  }

  return defaultLocale
}
