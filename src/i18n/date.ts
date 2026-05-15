import { getLocales } from 'expo-localization'
import { format } from 'date-fns'
import {
  de,
  enAU,
  enCA,
  enGB,
  enUS,
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
  ptBR,
  sv,
  zhCN,
  zhTW,
} from 'date-fns/locale'

import type { Locale } from 'date-fns'

import { getCatalogLocale, getLanguageCode, normalizeLocaleTag, type AppLocale } from './index'

const dateLocalesByMarket: Partial<Record<AppLocale, Locale>> = {
  'en-US': enUS,
  'en-GB': enGB,
  'en-CA': enCA,
  'en-AU': enAU,
  'en-SG': enUS,
  'en-PH': enUS,
  'es-ES': es,
  'es-MX': es,
  'es-AR': es,
  'es-CO': es,
  'pt-BR': ptBR,
  'pt-PT': pt,
  'fr-FR': fr,
  'fr-CA': fr,
  'de-DE': de,
  'it-IT': it,
  'nl-NL': nl,
  'sv-SE': sv,
  'pl-PL': pl,
  'ja-JP': ja,
  'ko-KR': ko,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'hi-IN': hi,
  'id-ID': id,
}

const dateLocalesByLanguage = {
  en: enUS,
  es,
  pt: ptBR,
  fr,
  de,
  it,
  nl,
  sv,
  pl,
  ja,
  ko,
  zh: zhCN,
  hi,
  id,
} as const satisfies Record<string, Locale>

type DateLanguageCode = keyof typeof dateLocalesByLanguage

const dateLocalesByCatalog = {
  en: enUS,
  es,
  pt: ptBR,
  fr,
  de,
  hi,
  id,
  it,
  ja,
  ko,
  nl,
  pl,
  sv,
  zhHans: zhCN,
  zhHant: zhTW,
} as const satisfies Record<string, Locale>

type DateCatalogLocale = keyof typeof dateLocalesByCatalog

function resolveIntlLocaleTag(locale: AppLocale) {
  const normalizedLocale = normalizeLocaleTag(locale)
  const matchingDeviceLocale = getLocales().find(
    (deviceLocale) => normalizeLocaleTag(deviceLocale.languageTag ?? '') === normalizedLocale,
  )

  return matchingDeviceLocale?.languageTag ?? normalizedLocale
}

function getDateFnsLocale(locale: AppLocale) {
  const languageCode = getLanguageCode(locale) as DateLanguageCode
  const catalogLocale = getCatalogLocale(locale) as DateCatalogLocale

  return (
    dateLocalesByMarket[locale] ??
    dateLocalesByLanguage[languageCode] ??
    dateLocalesByCatalog[catalogLocale] ??
    enUS
  )
}

export function formatLocalizedDate(date: Date, formatString: string, locale: AppLocale) {
  return format(date, formatString, {
    locale: getDateFnsLocale(locale),
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

export function getLocalizedDayPeriods(locale: AppLocale) {
  const intlLocale = resolveIntlLocaleTag(locale)
  const amParts = new Intl.DateTimeFormat(intlLocale, { hour: 'numeric' }).formatToParts(
    new Date(Date.UTC(2024, 0, 15, 9, 0, 0)),
  )
  const pmParts = new Intl.DateTimeFormat(intlLocale, { hour: 'numeric' }).formatToParts(
    new Date(Date.UTC(2024, 0, 15, 21, 0, 0)),
  )

  return {
    am: amParts.find((part) => part.type === 'dayPeriod')?.value ?? 'AM',
    pm: pmParts.find((part) => part.type === 'dayPeriod')?.value ?? 'PM',
  }
}

export function formatLocalizedTimeZoneName(
  timeZone: string,
  locale: AppLocale,
  fallbackLabel?: string,
) {
  const timeZoneName = new Intl.DateTimeFormat(resolveIntlLocaleTag(locale), {
    timeZone,
    timeZoneName: 'longGeneric',
  })
    .formatToParts(new Date(Date.UTC(2024, 0, 15, 12, 0, 0)))
    .find((part) => part.type === 'timeZoneName')?.value
    ?.trim()

  return timeZoneName && timeZoneName.length > 0 ? timeZoneName : fallbackLabel ?? timeZone
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
