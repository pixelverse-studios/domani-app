import React from 'react'
import { View } from 'react-native'
import { Globe, LayoutGrid } from 'lucide-react-native'

import { useTranslation } from '~/hooks/useTranslation'
import { getMainScreenCopy } from '~/i18n/mainScreenCopy'
import { getTimezoneOptionLabel, TIMEZONES } from './timezones'
import { SectionHeader } from './SectionHeader'
import { SettingsRow } from './SettingsRow'
import { PreferencesSkeleton } from './SettingsSkeletons'
import { useLayoutStore, TASK_LAYOUTS } from '~/stores/layoutStore'

interface PreferencesSectionProps {
  isLoading: boolean
  timezone: string | null
  onEditTimezone: () => void
  onEditLayout: () => void
  disabled?: boolean
}

/**
 * Preferences section with timezone setting
 */
export function PreferencesSection({
  isLoading,
  timezone,
  onEditTimezone,
  onEditLayout,
  disabled = false,
}: PreferencesSectionProps) {
  const { locale } = useTranslation()
  const copy = getMainScreenCopy(locale)
  const taskLayout = useLayoutStore((s) => s.taskLayout)
  const layoutLabel =
    copy.settings.layoutOptions[taskLayout]?.label ??
    TASK_LAYOUTS.find((l) => l.id === taskLayout)?.label ??
    copy.settings.layoutOptions.default.label

  const getTimezoneLabel = (value: string | null) => {
    if (!value) return copy.settings.notSet
    return getTimezoneOptionLabel(value, locale)
  }

  return (
    <>
      <SectionHeader title={copy.settings.preferencesSection} />
      {isLoading ? (
        <PreferencesSkeleton />
      ) : (
        <View className="mb-6">
          <SettingsRow
            label={copy.settings.timezone}
            value={getTimezoneLabel(timezone)}
            onPress={onEditTimezone}
            icon={Globe}
            disabled={disabled}
          />
          <SettingsRow
            label={copy.settings.taskLayout}
            value={layoutLabel}
            onPress={onEditLayout}
            icon={LayoutGrid}
            disabled={disabled}
          />
        </View>
      )}
    </>
  )
}
