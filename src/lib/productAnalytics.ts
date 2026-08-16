import { getLocales } from 'expo-localization'
import { addDays, format } from 'date-fns'

import type { AnalyticsBaseProperties } from '~/providers/AnalyticsProvider'
import { getDeviceMetadata } from '~/utils/deviceInfo'

export type ScheduledFor = 'today' | 'tomorrow' | 'other'

export function getAnalyticsBaseProperties(): AnalyticsBaseProperties {
  const device = getDeviceMetadata()
  const country = getLocales().find((locale) => locale.regionCode)?.regionCode ?? null

  return {
    platform: device.platform,
    app_version: device.app_version,
    app_build: device.app_build,
    country,
  }
}

export function getScheduledFor(
  scheduledDate: string | null | undefined,
  now = new Date(),
): ScheduledFor {
  const today = format(now, 'yyyy-MM-dd')
  const tomorrow = format(addDays(now, 1), 'yyyy-MM-dd')

  if (scheduledDate === today) return 'today'
  if (scheduledDate === tomorrow) return 'tomorrow'
  return 'other'
}
