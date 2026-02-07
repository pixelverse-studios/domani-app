import React from 'react'
import { View } from 'react-native'
import { Globe } from 'lucide-react-native'

import { SectionHeader } from './SectionHeader'
import { SettingsRow } from './SettingsRow'
import { PreferencesSkeleton } from './SettingsSkeletons'

// Common timezones grouped by region
const TIMEZONES = [
  { label: 'Pacific Time (PT)', value: 'America/Los_Angeles', offset: 'GMT-8' },
  { label: 'Mountain Time (MT)', value: 'America/Denver', offset: 'GMT-7' },
  { label: 'Central Time (CT)', value: 'America/Chicago', offset: 'GMT-6' },
  { label: 'Eastern Time (ET)', value: 'America/New_York', offset: 'GMT-5' },
  { label: 'Atlantic Time (AT)', value: 'America/Halifax', offset: 'GMT-4' },
  { label: 'London (GMT)', value: 'Europe/London', offset: 'GMT+0' },
  { label: 'Paris (CET)', value: 'Europe/Paris', offset: 'GMT+1' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai', offset: 'GMT+4' },
  { label: 'Mumbai (IST)', value: 'Asia/Kolkata', offset: 'GMT+5:30' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore', offset: 'GMT+8' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo', offset: 'GMT+9' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney', offset: 'GMT+10' },
]

interface PreferencesSectionProps {
  isLoading: boolean
  timezone: string | null
  onEditTimezone: () => void
}

/**
 * Preferences section with timezone setting
 */
export function PreferencesSection({
  isLoading,
  timezone,
  onEditTimezone,
}: PreferencesSectionProps) {
  // Get timezone display label
  const getTimezoneLabel = (value: string | null) => {
    if (!value) return 'Not set'
    const tz = TIMEZONES.find((t) => t.value === value)
    return tz ? tz.label : value
  }

  return (
    <>
      <SectionHeader title="Preferences" />
      {isLoading ? (
        <PreferencesSkeleton />
      ) : (
        <View className="mb-6">
          <SettingsRow
            label="Timezone"
            value={getTimezoneLabel(timezone)}
            onPress={onEditTimezone}
            icon={Globe}
          />
        </View>
      )}
    </>
  )
}

// Export TIMEZONES for use in timezone modal
export { TIMEZONES }
