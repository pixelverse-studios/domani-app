import React, { useState, useCallback, useMemo } from 'react'
import { View, TouchableOpacity, Platform, LayoutAnimation, UIManager, Modal } from 'react-native'
import { Bell, Clock } from 'lucide-react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { addDays, setHours, setMinutes, isBefore } from 'date-fns'
import Animated from 'react-native-reanimated'

import { Text } from '~/components/ui'
import { TimePickerModal } from '~/components/ui/TimePickerModal'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useTranslation } from '~/hooks/useTranslation'
import { formatLocalizedDateTime, formatLocalizedTime } from '~/i18n/date'
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
  const theme = useAppTheme()
  const { locale, t } = useTranslation()
  const brandColor = theme.colors.brand.primary
  const { profile } = useProfile()
  const is24Hour = useMemo(
    () => !new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12,
    [],
  )

  // Get user's shortcuts from profile or use defaults
  const timePresets: ReminderShortcut[] = useMemo(() => {
    const shortcuts = profile?.reminder_shortcuts as ReminderShortcut[] | null
    return shortcuts && shortcuts.length > 0 ? shortcuts : DEFAULT_SHORTCUTS
  }, [profile?.reminder_shortcuts])

  // Colors
  const iconColor = theme.colors.text.tertiary
  const borderColor = theme.colors.border.primary
  const chipBg = theme.colors.background
  const chipActiveBg = `${brandColor}1A`

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
          borderColor: isReminderEnabled ? brandColor : borderColor,
        }}
      >
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <Bell size={18} color={isReminderEnabled ? brandColor : iconColor} />
          <View>
            <Text
              className="text-sm font-sans-semibold"
              style={{ color: isReminderEnabled ? brandColor : theme.colors.text.primary }}
            >
              {isReminderEnabled
                ? t('planning.reminder.reminderOn')
                : t('planning.reminder.addReminder')}
            </Text>
            {isReminderEnabled && (
              <Text className="text-xs text-content-secondary mt-0.5">
                {formatLocalizedDateTime(reminderDate, locale)}
              </Text>
            )}
          </View>
        </View>

        {/* Toggle Switch Visual */}
        <View
          className="w-11 h-6 rounded-full justify-center px-0.5"
          style={{
            backgroundColor: isReminderEnabled ? brandColor : theme.colors.border.primary,
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
        <View className="mt-4">
          <View className="flex-row" style={{ gap: 6 }}>
            {timePresets.map((preset) => {
              const isSelected =
                reminderDate.getHours() === preset.hour &&
                reminderDate.getMinutes() === preset.minute
              const textColor = isSelected ? brandColor : iconColor
              return (
                <TouchableOpacity
                  key={preset.id}
                  onPress={() => {
                    const newDate = new Date(reminderDate)
                    newDate.setHours(preset.hour, preset.minute)
                    onReminderDateChange(newDate)
                  }}
                  disabled={disabled}
                  className="flex-1 items-center py-2.5 rounded-xl"
                  style={{
                    backgroundColor: isSelected ? chipActiveBg : chipBg,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? brandColor : borderColor,
                  }}
                >
                  <Text className="text-sm font-sans-semibold" style={{ color: textColor }}>
                    {formatLocalizedTime(
                      setMinutes(setHours(new Date(), preset.hour), preset.minute),
                      locale,
                    )}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Custom Time Chip */}
          {(() => {
            const isCustomTime = !timePresets.some(
              (preset) =>
                reminderDate.getHours() === preset.hour &&
                reminderDate.getMinutes() === preset.minute,
            )

            return (
              <View className="flex-row mt-3">
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  disabled={disabled}
                  className="flex-row items-center py-2.5 px-4 rounded-xl"
                  style={{
                    backgroundColor: isCustomTime ? `${brandColor}0D` : chipBg,
                    borderWidth: 1,
                    borderColor: isCustomTime ? brandColor : borderColor,
                    gap: 6,
                  }}
                >
                  <Clock size={14} color={isCustomTime ? brandColor : iconColor} />
                  <Text
                    className="text-sm font-sans-semibold"
                    style={{ color: isCustomTime ? brandColor : iconColor }}
                  >
                    {t('planning.reminder.custom')}
                  </Text>
                  {isCustomTime && (
                    <>
                      <View style={{ width: 1, height: 16, backgroundColor: brandColor, opacity: 0.35, marginHorizontal: 4 }} />
                      <Text className="text-sm font-sans-semibold" style={{ color: brandColor }}>
                        {formatLocalizedTime(reminderDate, locale)}
                      </Text>
                    </>
                  )}
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
              is24Hour={is24Hour}
              onChange={(_, date) => {
                setShowTimePicker(false)
                if (date) {
                  const newDate = new Date(reminderDate)
                  newDate.setHours(date.getHours(), date.getMinutes())
                  onReminderDateChange(newDate)
                }
              }}
              themeVariant="light"
            />
          )}

          <TimePickerModal
            visible={showTimePicker && Platform.OS === 'ios'}
            value={reminderDate}
            is24Hour={is24Hour}
            onConfirm={(date) => {
              const newDate = new Date(reminderDate)
              newDate.setHours(date.getHours(), date.getMinutes())
              onReminderDateChange(newDate)
              setShowTimePicker(false)
            }}
            onCancel={() => setShowTimePicker(false)}
          />

          {isPastReminder && (
            <Text className="text-xs text-amber-500 mt-3">
              {t('planning.reminder.pastTimeWarning')}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}
