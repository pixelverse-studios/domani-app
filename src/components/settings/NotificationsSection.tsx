import React from 'react'
import { View, TouchableOpacity, Switch, Platform } from 'react-native'
import { ClipboardClock, BellOff, ChevronRight, Bell } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { SectionHeader } from './SectionHeader'
import { SettingsRow } from './SettingsRow'
import { ReminderShortcutsSection } from './ReminderShortcutsSection'
import { NotificationsSkeleton } from './SettingsSkeletons'

interface NotificationsSectionProps {
  isLoading: boolean
  planningReminderTime: string | null
  planningReminderEnabled: boolean
  permissionStatus: 'granted' | 'denied' | 'undetermined'
  isUpdating: boolean
  onEditPlanningTime: () => void
  onTogglePlanningReminder: (enabled: boolean) => void
  onOpenSettings: () => void
}

/**
 * Notifications & Reminders section
 */
export function NotificationsSection({
  isLoading,
  planningReminderTime,
  planningReminderEnabled,
  permissionStatus,
  isUpdating,
  onEditPlanningTime,
  onTogglePlanningReminder,
  onOpenSettings,
}: NotificationsSectionProps) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  // Format time for display
  const formatTimeDisplay = (timeString: string | null) => {
    if (!timeString) return 'Not set'
    const [hours, minutes] = timeString.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
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
          {/* Planning Reminder Notification Toggle */}
          <View
            className="flex-row items-center justify-between py-3.5 px-4 rounded-xl mb-2"
            style={{ backgroundColor: theme.colors.card }}
          >
            <View className="flex-row items-center flex-1">
              <View className="mr-3">
                <Bell size={20} color={theme.colors.text.tertiary} />
              </View>
              <Text className="text-base text-content-primary">Planning Reminder Notification</Text>
            </View>
            <Switch
              value={planningReminderEnabled}
              onValueChange={onTogglePlanningReminder}
              disabled={isUpdating}
              trackColor={{
                false: theme.colors.border.primary,
                true: brandColor,
              }}
              thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              ios_backgroundColor={theme.colors.border.primary}
            />
          </View>

          {/* Planning Time Row — always visible; label adapts to notification state */}
          {planningReminderEnabled ? (
            // Variant A — notifications ON: standard settings row
            <SettingsRow
              label="Planning Reminder"
              value={formatTimeDisplay(planningReminderTime)}
              onPress={isUpdating ? undefined : onEditPlanningTime}
              icon={ClipboardClock}
            />
          ) : (
            // Variant B — notifications OFF: explains that the time still drives the in-app prompt
            <TouchableOpacity
              onPress={onEditPlanningTime}
              activeOpacity={0.7}
              disabled={isUpdating}
              className="flex-row items-center justify-between py-3.5 px-4 rounded-xl mb-2"
              style={{ backgroundColor: theme.colors.card }}
            >
              <View className="flex-row items-center flex-1">
                <View className="mr-3">
                  <ClipboardClock size={20} color={theme.colors.text.tertiary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base text-content-primary">Evening Planning Time</Text>
                  <Text className="text-xs text-content-tertiary mt-0.5">
                    Notifications are off — this time still triggers the in-app planning prompt
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Text className="text-sm text-content-secondary mr-2">
                  {formatTimeDisplay(planningReminderTime)}
                </Text>
                <ChevronRight size={18} color={theme.colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          )}

          {/* Notification Status Row — shown only when user wants notifications but OS has denied permission */}
          {planningReminderEnabled && permissionStatus !== 'granted' && (
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
                  <Text className="text-base text-content-primary">Notifications Disabled</Text>
                  <Text className="text-xs text-content-secondary">Tap to enable in Settings</Text>
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
