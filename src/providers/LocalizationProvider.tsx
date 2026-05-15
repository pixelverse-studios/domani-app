import React from 'react'
import { getLocales } from 'expo-localization'

import {
  catalogs,
  defaultCatalogLocale,
  defaultLocale,
  getCatalogLocale,
  resolveSupportedLocale,
  supportedLocales,
  translatedCatalogLocales,
  type AppLocale,
  type CatalogLocale,
} from '~/i18n'
import type { TranslationCatalog, TranslationKey, TranslationValues } from '~/i18n/types'

type LocalizationContextValue = {
  catalog: TranslationCatalog
  locale: AppLocale
  catalogLocale: CatalogLocale
  defaultLocale: AppLocale
  defaultCatalogLocale: CatalogLocale
  supportedLocales: readonly AppLocale[]
  translatedCatalogLocales: readonly CatalogLocale[]
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
  return resolveSupportedLocale(
    deviceLocales.flatMap((locale) => [locale.languageTag, locale.languageCode]),
  )
}

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [localeOverride, setLocaleOverride] = React.useState<AppLocale | null>(null)

  const locale = React.useMemo(
    () => localeOverride ?? resolveLocaleFromDevice(),
    [localeOverride],
  )

  const catalogLocale = React.useMemo(() => getCatalogLocale(locale), [locale])
  const catalog = React.useMemo(() => catalogs[catalogLocale], [catalogLocale])
  const fallbackCatalog = catalogs[defaultCatalogLocale]

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
      catalogLocale,
      defaultLocale,
      defaultCatalogLocale,
      supportedLocales,
      translatedCatalogLocales,
      setLocaleOverride,
      clearLocaleOverride,
      t,
    }),
    [catalog, catalogLocale, clearLocaleOverride, locale, t],
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
