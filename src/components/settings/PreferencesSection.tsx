import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Sun, Moon, Smartphone, Globe } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { SectionHeader } from './SectionHeader'
import { SettingsRow } from './SettingsRow'
import { PreferencesSkeleton } from './SettingsSkeletons'
import type { ThemeMode } from '~/stores/themeStore'

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

// Theme options
const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'auto', label: 'System', icon: Smartphone },
]

interface PreferencesSectionProps {
  isLoading: boolean
  timezone: string | null
  themeMode: ThemeMode
  onEditTimezone: () => void
  onSetThemeMode: (mode: ThemeMode) => void
}

/**
 * Preferences section with timezone and theme settings
 */
export function PreferencesSection({
  isLoading,
  timezone,
  themeMode,
  onEditTimezone,
  onSetThemeMode,
}: PreferencesSectionProps) {
  const { activeTheme } = useTheme()

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

          {/* Theme Selector */}
          <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
            <Text className="text-sm text-slate-600 dark:text-slate-400 mb-3">Theme</Text>
            <View className="flex-row gap-2">
              {THEME_OPTIONS.map(({ mode: optionMode, label, icon: Icon }) => {
                const isSelected = themeMode === optionMode
                const iconColor = isSelected
                  ? '#a855f7'
                  : activeTheme === 'dark'
                    ? '#94a3b8'
                    : '#64748b'

                return (
                  <TouchableOpacity
                    key={optionMode}
                    onPress={() => onSetThemeMode(optionMode)}
                    activeOpacity={0.7}
                    className={`flex-1 items-center py-3 rounded-lg border ${
                      isSelected
                        ? 'bg-purple-500/10 border-purple-500'
                        : 'bg-transparent border-transparent'
                    }`}
                  >
                    <Icon size={20} color={iconColor} />
                    <Text
                      className={`text-sm mt-1 ${
                        isSelected
                          ? 'text-purple-500 font-medium'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>
      )}
    </>
  )
}

// Export TIMEZONES for use in timezone modal
export { TIMEZONES }
