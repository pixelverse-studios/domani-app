import React from 'react'
import { getLocales } from 'expo-localization'

import { catalogs, defaultLocale, supportedLocales, type AppLocale } from '~/i18n'
import type { TranslationCatalog, TranslationKey, TranslationValues } from '~/i18n/types'

type LocalizationContextValue = {
  catalog: TranslationCatalog
  locale: AppLocale
  defaultLocale: AppLocale
  supportedLocales: AppLocale[]
  setLocaleOverride: (locale: AppLocale) => void
  clearLocaleOverride: () => void
  t: (key: TranslationKey, values?: TranslationValues) => string
}

const LocalizationContext = React.createContext<LocalizationContextValue | null>(null)

const TOKEN_PATTERN = /{{\s*(\w+)\s*}}/g

function resolveCatalogValue(catalog: TranslationCatalog, key: TranslationKey): string | null {
  const segments = key.split('.')
  let current: unknown = catalog

  for (const segment of segments) {
    if (current === null || typeof current !== 'object' || !(segment in current)) {
      return null
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return typeof current === 'string' ? current : null
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template

  return template.replace(TOKEN_PATTERN, (_, token: string) => {
    const value = values[token]
    return value === undefined ? `{{${token}}}` : String(value)
  })
}

function resolveLocaleFromDevice(): AppLocale {
  const deviceLocales = getLocales()

  for (const locale of deviceLocales) {
    const languageTag = locale.languageTag?.toLowerCase()
    if (languageTag && languageTag in catalogs) {
      return languageTag as AppLocale
    }

    const languageCode = locale.languageCode?.toLowerCase()
    if (languageCode && languageCode in catalogs) {
      return languageCode as AppLocale
    }
  }

  return defaultLocale
}

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [localeOverride, setLocaleOverride] = React.useState<AppLocale | null>(null)

  const locale = React.useMemo(
    () => localeOverride ?? resolveLocaleFromDevice(),
    [localeOverride],
  )

  const catalog = React.useMemo(() => catalogs[locale], [locale])
  const fallbackCatalog = catalogs[defaultLocale]

  const t = React.useCallback(
    (key: TranslationKey, values?: TranslationValues) => {
      const template =
        resolveCatalogValue(catalog, key) ??
        resolveCatalogValue(fallbackCatalog, key) ??
        key

      return interpolate(template, values)
    },
    [catalog, fallbackCatalog],
  )

  const clearLocaleOverride = React.useCallback(() => {
    setLocaleOverride(null)
  }, [])

  const value = React.useMemo(
    () => ({
      catalog,
      locale,
      defaultLocale,
      supportedLocales,
      setLocaleOverride,
      clearLocaleOverride,
      t,
    }),
    [catalog, clearLocaleOverride, locale, t],
  )

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>
}

export function useLocalization() {
  const context = React.useContext(LocalizationContext)

  if (!context) {
    throw new Error('useLocalization must be used within LocalizationProvider')
  }

  return context
}
