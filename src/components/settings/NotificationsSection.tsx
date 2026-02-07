import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { ClipboardClock, BellOff, ChevronRight } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { SectionHeader } from './SectionHeader'
import { SettingsRow } from './SettingsRow'
import { ReminderShortcutsSection } from './ReminderShortcutsSection'
import { NotificationsSkeleton } from './SettingsSkeletons'

interface NotificationsSectionProps {
  isLoading: boolean
  planningReminderTime: string | null
  permissionStatus: 'granted' | 'denied' | 'undetermined'
  onEditPlanningTime: () => void
  onOpenSettings: () => void
}

/**
 * Notifications & Reminders section
 */
export function NotificationsSection({
  isLoading,
  planningReminderTime,
  permissionStatus,
  onEditPlanningTime,
  onOpenSettings,
}: NotificationsSectionProps) {
  // Format time for display
  const formatTimeDisplay = (timeString: string | null) => {
    if (!timeString) return 'Not set'
    const [hours, minutes] = timeString.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    // Manual formatting to avoid date-fns import in this component
    const h = date.getHours()
    const m = date.getMinutes()
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  return (
    <>
      <SectionHeader title="Notifications & Reminders" />
      {isLoading ? (
        <NotificationsSkeleton />
      ) : (
        <View className="mb-6">
          <SettingsRow
            label="Planning Reminder"
            value={formatTimeDisplay(planningReminderTime)}
            onPress={onEditPlanningTime}
            icon={ClipboardClock}
          />

          {/* Notification Status Row */}
          {permissionStatus !== 'granted' && (
            <TouchableOpacity
              onPress={onOpenSettings}
              activeOpacity={0.7}
              className="flex-row items-center justify-between py-3.5 px-4 bg-amber-50 rounded-xl mb-2 border border-amber-200"
            >
              <View className="flex-row items-center flex-1">
                <View className="mr-3">
                  <BellOff size={20} color="#f59e0b" />
                </View>
                <View className="flex-1">
                  <Text className="text-base text-content-primary">
                    Notifications Disabled
                  </Text>
                  <Text className="text-xs text-content-secondary">
                    Tap to enable in Settings
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#f59e0b" />
            </TouchableOpacity>
          )}

          <View className="mt-2">
            <ReminderShortcutsSection />
          </View>
        </View>
      )}
    </>
  )
}
