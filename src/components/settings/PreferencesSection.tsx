import React from 'react'
import { View } from 'react-native'
import { Globe, LayoutGrid } from 'lucide-react-native'

import { SectionHeader } from './SectionHeader'
import { SettingsRow } from './SettingsRow'
import { PreferencesSkeleton } from './SettingsSkeletons'
import type { RecapLayout } from '~/stores/uiStore'

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

const RECAP_LAYOUT_LABELS: Record<RecapLayout, string> = {
  inline: 'Inline',
  minimal: 'Minimal',
  card: 'Card',
}

interface PreferencesSectionProps {
  isLoading: boolean
  timezone: string | null
  recapLayout: RecapLayout
  onEditTimezone: () => void
  onEditRecapLayout: () => void
}

/**
 * Preferences section with timezone and recap layout settings
 */
export function PreferencesSection({
  isLoading,
  timezone,
  recapLayout,
  onEditTimezone,
  onEditRecapLayout,
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
          <SettingsRow
            label="Recap Layout"
            value={RECAP_LAYOUT_LABELS[recapLayout]}
            onPress={onEditRecapLayout}
            icon={LayoutGrid}
          />
        </View>
      )}
    </>
  )
}

// Export TIMEZONES for use in timezone modal
export { TIMEZONES }
