import { useLocalization } from '~/providers/LocalizationProvider'

export function useTranslation() {
  const {
    catalog,
    t,
    locale,
    catalogLocale,
    defaultLocale,
    defaultCatalogLocale,
    supportedLocales,
    translatedCatalogLocales,
    setLocaleOverride,
    clearLocaleOverride,
  } =
    useLocalization()

  return {
    catalog,
    t,
    locale,
    catalogLocale,
    defaultLocale,
    defaultCatalogLocale,
    supportedLocales,
    translatedCatalogLocales,
    setLocaleOverride,
    clearLocaleOverride,
  }
}
