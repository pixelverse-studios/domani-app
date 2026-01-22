import React, { useState, useCallback, useMemo } from 'react'
import { View, TouchableOpacity, Platform, LayoutAnimation, UIManager, Modal } from 'react-native'
import { Bell, Clock, Settings2 } from 'lucide-react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format, addDays, setHours, setMinutes, isBefore } from 'date-fns'
import Animated from 'react-native-reanimated'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { useProfile } from '~/hooks/useProfile'
import { DEFAULT_SHORTCUTS, type ReminderShortcut } from '~/components/settings'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface ReminderSectionProps {
  reminderDate: Date
  onReminderDateChange: (date: Date) => void
  isReminderEnabled: boolean
  onReminderEnabledChange: (enabled: boolean) => void
  disabled?: boolean
  selectedTarget: 'today' | 'tomorrow'
}

export function ReminderSection({
  reminderDate,
  onReminderDateChange,
  isReminderEnabled,
  onReminderEnabledChange,
  disabled = false,
  selectedTarget,
}: ReminderSectionProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const { profile } = useProfile()

  // Get user's shortcuts from profile or use defaults
  const timePresets: ReminderShortcut[] = useMemo(() => {
    const shortcuts = profile?.reminder_shortcuts as ReminderShortcut[] | null
    return shortcuts && shortcuts.length > 0 ? shortcuts : DEFAULT_SHORTCUTS
  }, [profile?.reminder_shortcuts])

  // Colors
  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const iconColor = isDark ? '#94a3b8' : '#64748b'
  const surfaceBg = isDark ? '#0f172a' : '#ffffff'
  const borderColor = isDark ? '#334155' : '#e2e8f0'
  const chipBg = isDark ? '#1e293b' : '#f1f5f9'
  const chipActiveBg = isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)'

  // State for time picker modal visibility (both platforms)
  const [showTimePicker, setShowTimePicker] = useState(false)

  // Get the base date for reminders
  const getBaseDate = useCallback(() => {
    return selectedTarget === 'tomorrow' ? addDays(new Date(), 1) : new Date()
  }, [selectedTarget])

  // Check if reminder is in the past
  const isPastReminder = isReminderEnabled && isBefore(reminderDate, new Date())

  // Handle toggle
  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    if (isReminderEnabled) {
      onReminderEnabledChange(false)
    } else {
      // Set default time to first shortcut when enabling
      const firstPreset = timePresets[0] || DEFAULT_SHORTCUTS[0]
      const defaultDate = setMinutes(setHours(getBaseDate(), firstPreset.hour), firstPreset.minute)
      onReminderDateChange(defaultDate)
      onReminderEnabledChange(true)
    }
  }, [isReminderEnabled, getBaseDate, onReminderDateChange, onReminderEnabledChange, timePresets])

  return (
    <View className="mt-4">
      {/* Toggle Header */}
      <TouchableOpacity
        onPress={handleToggle}
        disabled={disabled}
        activeOpacity={0.7}
        className="flex-row items-center justify-between py-3 px-4 rounded-xl"
        style={{
          backgroundColor: isReminderEnabled ? chipActiveBg : chipBg,
          borderWidth: 1,
          borderColor: isReminderEnabled ? purpleColor : borderColor,
        }}
      >
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <Bell size={18} color={isReminderEnabled ? purpleColor : iconColor} />
          <View>
            <Text
              className="text-sm font-sans-semibold"
              style={{ color: isReminderEnabled ? purpleColor : isDark ? '#e2e8f0' : '#1e293b' }}
            >
              {isReminderEnabled ? 'Reminder On' : 'Add Reminder'}
            </Text>
            {isReminderEnabled && (
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {format(reminderDate, "EEE, MMM d 'at' h:mm a")}
              </Text>
            )}
          </View>
        </View>

        {/* Toggle Switch Visual */}
        <View
          className="w-11 h-6 rounded-full justify-center px-0.5"
          style={{
            backgroundColor: isReminderEnabled ? purpleColor : isDark ? '#475569' : '#cbd5e1',
          }}
        >
          <Animated.View
            className="w-5 h-5 rounded-full bg-white"
            style={{
              transform: [{ translateX: isReminderEnabled ? 20 : 0 }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 2,
            }}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Pickers with Quick Presets */}
      {isReminderEnabled && (
        <View
          className="rounded-xl p-4 mt-2"
          style={{
            backgroundColor: surfaceBg,
            borderWidth: 1,
            borderColor: borderColor,
          }}
        >
          {/* Shortcuts Section - subtle/secondary */}
          <Text className="text-[10px] font-sans text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wide">
            Shortcuts
          </Text>
          <View className="flex-row" style={{ gap: 6 }}>
            {timePresets.map((preset) => {
              const isSelected =
                reminderDate.getHours() === preset.hour &&
                reminderDate.getMinutes() === preset.minute
              const textColor = isSelected ? purpleColor : isDark ? '#64748b' : '#94a3b8'
              return (
                <TouchableOpacity
                  key={preset.id}
                  onPress={() => {
                    const newDate = new Date(reminderDate)
                    newDate.setHours(preset.hour, preset.minute)
                    onReminderDateChange(newDate)
                  }}
                  disabled={disabled}
                  className="flex-1 items-center py-2 rounded-lg"
                  style={{
                    backgroundColor: isSelected ? chipActiveBg : chipBg,
                    borderWidth: isSelected ? 1 : 0,
                    borderColor: purpleColor,
                  }}
                >
                  <Text className="text-sm font-sans-semibold" style={{ color: textColor }}>
                    {format(setMinutes(setHours(new Date(), preset.hour), preset.minute), 'h:mm a')}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Divider */}
          <View className="my-3" style={{ height: 1, backgroundColor: borderColor }} />

          {/* Custom Time Row */}
          {(() => {
            const isCustomTime = !timePresets.some(
              (preset) =>
                reminderDate.getHours() === preset.hour &&
                reminderDate.getMinutes() === preset.minute,
            )

            return (
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  disabled={disabled}
                  className="flex-row items-center py-2 px-3 rounded-lg"
                  style={{
                    backgroundColor: isCustomTime ? chipActiveBg : chipBg,
                    borderWidth: isCustomTime ? 1 : 0,
                    borderColor: purpleColor,
                    gap: 6,
                  }}
                >
                  <Settings2 size={14} color={isCustomTime ? purpleColor : iconColor} />
                  <Text
                    className="text-xs font-sans-medium"
                    style={{ color: isCustomTime ? purpleColor : iconColor }}
                  >
                    Custom
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  disabled={disabled}
                  className="flex-row items-center px-3 py-2 rounded-lg"
                  style={{ backgroundColor: chipBg, gap: 8 }}
                >
                  <Clock size={16} color={iconColor} />
                  <Text className="text-sm font-sans-semibold" style={{ color: purpleColor }}>
                    {format(reminderDate, 'h:mm a')}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          })()}

          {/* Time Picker Modal */}
          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={reminderDate}
              mode="time"
              display="default"
              onChange={(_, date) => {
                setShowTimePicker(false)
                if (date) {
                  const newDate = new Date(reminderDate)
                  newDate.setHours(date.getHours(), date.getMinutes())
                  onReminderDateChange(newDate)
                }
              }}
              themeVariant={isDark ? 'dark' : 'light'}
            />
          )}

          {showTimePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="fade" visible={showTimePicker}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setShowTimePicker(false)}
                className="flex-1 justify-end"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => {}} // Prevent closing when tapping the picker
                  className="rounded-t-2xl pb-8"
                  style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }}
                >
                  <View
                    className="flex-row justify-between items-center px-4 py-3 border-b"
                    style={{ borderColor: borderColor }}
                  >
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text className="text-base" style={{ color: iconColor }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <Text className="text-base font-sans-semibold text-slate-900 dark:text-white">
                      Select Time
                    </Text>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text className="text-base font-sans-semibold" style={{ color: purpleColor }}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={reminderDate}
                    mode="time"
                    display="spinner"
                    onChange={(_, date) => {
                      if (date) {
                        const newDate = new Date(reminderDate)
                        newDate.setHours(date.getHours(), date.getMinutes())
                        onReminderDateChange(newDate)
                      }
                    }}
                    themeVariant={isDark ? 'dark' : 'light'}
                    style={{ height: 200 }}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          )}

          {isPastReminder && (
            <Text className="text-xs text-amber-500 mt-3">
              This time has passed - reminder will be skipped
            </Text>
          )}
        </View>
      )}
    </View>
  )
}
