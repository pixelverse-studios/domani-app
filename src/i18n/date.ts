import { format, type Locale } from 'date-fns'
import { enUS, es as esLocale } from 'date-fns/locale'

import type { AppLocale } from './index'

const dateLocales = {
  en: enUS,
  es: esLocale,
} as const satisfies Record<AppLocale, Locale>

export function formatLocalizedDate(date: Date, formatString: string, locale: AppLocale) {
  return format(date, formatString, {
    locale: dateLocales[locale] ?? enUS,
  })
}
