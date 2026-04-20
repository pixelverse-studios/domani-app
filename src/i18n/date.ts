import { getLocales } from 'expo-localization'
import { format, type Locale } from 'date-fns'
import { enUS, es as esLocale } from 'date-fns/locale'

import type { AppLocale } from './index'

const dateLocales = {
  en: enUS,
  es: esLocale,
} as const satisfies Record<AppLocale, Locale>

function resolveIntlLocaleTag(locale: AppLocale) {
  const matchingDeviceLocale = getLocales().find(
    (deviceLocale) => deviceLocale.languageCode?.toLowerCase() === locale,
  )

  return matchingDeviceLocale?.languageTag ?? locale
}

export function formatLocalizedDate(date: Date, formatString: string, locale: AppLocale) {
  return format(date, formatString, {
    locale: dateLocales[locale] ?? enUS,
  })
}

export function formatLocalizedDateWithOptions(
  date: Date,
  locale: AppLocale,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(resolveIntlLocaleTag(locale), options).format(date)
}

export function formatLocalizedTime(
  date: Date,
  locale: AppLocale,
  options?: {
    compact?: boolean
  },
) {
  return new Intl.DateTimeFormat(resolveIntlLocaleTag(locale), {
    hour: 'numeric',
    ...(options?.compact && date.getMinutes() === 0 ? {} : { minute: '2-digit' }),
  }).format(date)
}

export function uses24HourClock(locale: AppLocale) {
  const parts = new Intl.DateTimeFormat(resolveIntlLocaleTag(locale), {
    hour: 'numeric',
  }).formatToParts(new Date())

  return !parts.some((part) => part.type === 'dayPeriod')
}

export function formatLocalizedWeekday(date: Date, locale: AppLocale, format: 'long' | 'short') {
  return formatLocalizedDateWithOptions(date, locale, {
    weekday: format,
  })
}

export function formatLocalizedMonthDay(date: Date, locale: AppLocale) {
  return formatLocalizedDateWithOptions(date, locale, {
    month: 'long',
    day: 'numeric',
  })
}

export function formatLocalizedWeekdayMonthDay(date: Date, locale: AppLocale) {
  return formatLocalizedDateWithOptions(date, locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function formatLocalizedDateTime(date: Date, locale: AppLocale) {
  return new Intl.DateTimeFormat(resolveIntlLocaleTag(locale), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
