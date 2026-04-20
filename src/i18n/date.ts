import { format, type Locale } from 'date-fns'
import { enUS, es as esLocale } from 'date-fns/locale'

import type { AppLocale } from './index'

const dateLocales = {
  en: enUS,
  es: esLocale,
} as const satisfies Record<AppLocale, Locale>

const intlLocaleTags = {
  en: 'en-US',
  es: 'es-ES',
} as const satisfies Record<AppLocale, string>

export function formatLocalizedDate(date: Date, formatString: string, locale: AppLocale) {
  return format(date, formatString, {
    locale: dateLocales[locale] ?? enUS,
  })
}

export function formatLocalizedTime(date: Date, locale: AppLocale) {
  return new Intl.DateTimeFormat(intlLocaleTags[locale] ?? intlLocaleTags.en, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
