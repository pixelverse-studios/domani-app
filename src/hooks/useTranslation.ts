import { useLocalization } from '~/providers/LocalizationProvider'

export function useTranslation() {
  const {
    catalog,
    t,
    locale,
    defaultLocale,
    supportedLocales,
    setLocaleOverride,
    clearLocaleOverride,
  } =
    useLocalization()

  return {
    catalog,
    t,
    locale,
    defaultLocale,
    supportedLocales,
    setLocaleOverride,
    clearLocaleOverride,
  }
}
