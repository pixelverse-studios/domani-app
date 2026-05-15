import type { AppLocale } from '~/i18n'
import { formatLocalizedTimeZoneName } from '~/i18n/date'

export const TIMEZONES = [
  { value: 'America/Los_Angeles', offset: 'GMT-8', fallbackLabel: 'Los Angeles' },
  { value: 'America/Denver', offset: 'GMT-7', fallbackLabel: 'Denver' },
  { value: 'America/Chicago', offset: 'GMT-6', fallbackLabel: 'Chicago' },
  { value: 'America/New_York', offset: 'GMT-5', fallbackLabel: 'New York' },
  { value: 'America/Halifax', offset: 'GMT-4', fallbackLabel: 'Halifax' },
  { value: 'Europe/London', offset: 'GMT+0', fallbackLabel: 'London' },
  { value: 'Europe/Paris', offset: 'GMT+1', fallbackLabel: 'Paris' },
  { value: 'Asia/Dubai', offset: 'GMT+4', fallbackLabel: 'Dubai' },
  { value: 'Asia/Kolkata', offset: 'GMT+5:30', fallbackLabel: 'Mumbai' },
  { value: 'Asia/Singapore', offset: 'GMT+8', fallbackLabel: 'Singapore' },
  { value: 'Asia/Tokyo', offset: 'GMT+9', fallbackLabel: 'Tokyo' },
  { value: 'Australia/Sydney', offset: 'GMT+10', fallbackLabel: 'Sydney' },
] as const

export function getTimezoneOptionLabel(timeZone: string, locale: AppLocale) {
  const timezone = TIMEZONES.find((entry) => entry.value === timeZone)
  if (!timezone) return timeZone

  return formatLocalizedTimeZoneName(timezone.value, locale, timezone.fallbackLabel)
}
