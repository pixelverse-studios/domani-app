import React, { useState, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated'
import { Bell, ChevronDown } from 'lucide-react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format, setHours, setMinutes } from 'date-fns'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { getTheme } from '~/theme/themes'
import { useTutorialTarget } from '~/components/tutorial'
import { useProfile, useUpdateProfile } from '~/hooks/useProfile'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export interface ReminderShortcut {
  id: string
  hour: number
  minute: number
}

// Default shortcuts (matches current hardcoded values)
export const DEFAULT_SHORTCUTS: ReminderShortcut[] = [
  { id: 'morning', hour: 9, minute: 0 },
  { id: 'afternoon', hour: 13, minute: 0 },
  { id: 'evening', hour: 18, minute: 0 },
]

// Labels based on index position (not time-based)
const SHORTCUT_LABELS: Record<number, string> = {
  0: 'Shortcut 1',
  1: 'Shortcut 2',
  2: 'Shortcut 3',
}

// Zone colors based on actual time of day
function getZoneColors() {
  const t = getTheme()
  return {
    morning: {
      color: t.priority.medium.color,
      bg: `${t.priority.medium.color}26`, // 15% opacity
    },
    afternoon: {
      color: t.colors.brand.primary,
      bg: `${t.colors.brand.primary}26`,
    },
    evening: {
      color: t.colors.brand.dark,
      bg: `${t.colors.brand.dark}26`,
    },
  }
}

/**
 * Determines the color zone based on the actual hour value.
 * - Morning: 5 AM - 11:59 AM (amber)
 * - Afternoon: 12 PM - 4:59 PM (violet)
 * - Evening: 5 PM - 4:59 AM (indigo)
 */
function getTimeZoneColor(
  hour: number,
  zoneColors: ReturnType<typeof getZoneColors>,
): {
  color: string
  bg: string
} {
  if (hour >= 5 && hour < 12) {
    return zoneColors.morning
  }
  if (hour >= 12 && hour < 17) {
    return zoneColors.afternoon
  }
  return zoneColors.evening
}

export function ReminderShortcutsSection() {
  const theme = useAppTheme()
  const zoneColors = getZoneColors()
  const brandColor = theme.colors.brand.primary
  const { profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const { targetRef, measureTarget } = useTutorialTarget('settings_reminders')

  const [isExpanded, setIsExpanded] = useState(false)
  const [editingShortcut, setEditingShortcut] = useState<{
    shortcut: ReminderShortcut
    index: number
  } | null>(null)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [selectedTime, setSelectedTime] = useState(new Date())

  // Animation value for chevron
  const rotation = useSharedValue(0)

  // Get current shortcuts from profile or use defaults
  const shortcuts: ReminderShortcut[] =
    (profile?.reminder_shortcuts as ReminderShortcut[] | null) || DEFAULT_SHORTCUTS

  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded((prev) => !prev)
    rotation.value = withTiming(isExpanded ? 0 : 1, {
      duration: 200,
      easing: Easing.ease,
    })
  }, [isExpanded, rotation])

  const handleEditShortcut = useCallback((shortcut: ReminderShortcut, index: number) => {
    setEditingShortcut({ shortcut, index })
    const date = setMinutes(setHours(new Date(), shortcut.hour), shortcut.minute)
    setSelectedTime(date)
    setShowTimePicker(true)
  }, [])

  const handleTimeChange = useCallback(
    async (date: Date) => {
      if (!editingShortcut) return

      const newHour = date.getHours()
      const newMinute = date.getMinutes()

      // Update the shortcuts array
      const newShortcuts = shortcuts.map((s) =>
        s.id === editingShortcut.shortcut.id ? { ...s, hour: newHour, minute: newMinute } : s,
      )

      // Save to database (cast to JSON for Supabase compatibility)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateProfile.mutateAsync({ reminder_shortcuts: newShortcuts as any })

      // Close picker on Android after selection
      if (Platform.OS === 'android') {
        setShowTimePicker(false)
        setEditingShortcut(null)
      }
    },
    [editingShortcut, shortcuts, updateProfile],
  )

  const handleCloseModal = useCallback(() => {
    setShowTimePicker(false)
    setEditingShortcut(null)
  }, [])

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` }],
  }))

  // Colors
  const iconColor = theme.colors.text.tertiary
  const textMuted = theme.colors.text.muted
  const dividerColor = theme.colors.border.divider
  const borderColor = theme.colors.border.primary

  // Format time for display (compact format without minutes if on the hour)
  const formatTimeCompact = (hour: number, minute: number) => {
    const date = setMinutes(setHours(new Date(), hour), minute)
    if (minute === 0) {
      return format(date, 'h a') // "9 AM"
    }
    return format(date, 'h:mm a') // "9:30 AM"
  }

  // Format time for display (full format)
  const formatTime = (hour: number, minute: number) => {
    const date = setMinutes(setHours(new Date(), hour), minute)
    return format(date, 'h:mm a')
  }

  return (
    <View
      ref={targetRef}
      onLayout={measureTarget}
      style={[styles.container, { backgroundColor: theme.colors.card }]}
    >
      {/* Header Section - Always Visible */}
      <TouchableOpacity
        onPress={handleToggleExpand}
        activeOpacity={0.7}
        style={styles.headerSection}
      >
        {/* Top Row: Title and Chevron */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Bell size={18} color={brandColor} />
            <Text
              className="text-base font-sans-medium text-content-primary"
              style={{ marginLeft: 12 }}
            >
              Reminder Shortcuts
            </Text>
          </View>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={18} color={iconColor} />
          </Animated.View>
        </View>

        {/* Second Row: Time Pills */}
        <View style={styles.pillsRow}>
          {shortcuts.map((shortcut) => {
            const colors = getTimeZoneColor(shortcut.hour, zoneColors)

            return (
              <View key={shortcut.id} style={[styles.timePill, { backgroundColor: colors.bg }]}>
                <Text style={[styles.pillTime, { color: colors.color }]} allowFontScaling={false}>
                  {formatTimeCompact(shortcut.hour, shortcut.minute)}
                </Text>
              </View>
            )
          })}
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Text className="text-sm font-sans-semibold text-content-primary">
              Customize Shortcuts
            </Text>
            <Text style={{ color: textMuted, fontSize: 13, marginTop: 4 }}>
              Tap to change the preset times shown when adding reminders
            </Text>
          </View>

          {/* Shortcut Rows */}
          <View style={styles.shortcutList}>
            {shortcuts.map((shortcut, index) => {
              const isLast = index === shortcuts.length - 1
              const colors = getTimeZoneColor(shortcut.hour, zoneColors)

              return (
                <TouchableOpacity
                  key={shortcut.id}
                  onPress={() => handleEditShortcut(shortcut, index)}
                  activeOpacity={0.7}
                  style={[
                    styles.shortcutRow,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor },
                  ]}
                >
                  <View style={styles.shortcutLabelRow}>
                    <View style={[styles.shortcutDot, { backgroundColor: colors.color }]} />
                    <Text className="text-base text-content-primary">
                      {SHORTCUT_LABELS[index] || `Shortcut ${index + 1}`}
                    </Text>
                  </View>
                  <Text style={{ color: colors.color, fontSize: 16, fontWeight: '600' }}>
                    {formatTime(shortcut.hour, shortcut.minute)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      {/* Time Picker - Android */}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display="default"
          onChange={(_, date) => {
            if (date) {
              setSelectedTime(date)
              handleTimeChange(date)
            } else {
              handleCloseModal()
            }
          }}
          themeVariant="light"
        />
      )}

      {/* Time Picker Modal - iOS */}
      {showTimePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade" visible={showTimePicker}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleCloseModal}
            className="flex-1 justify-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}} // Prevent closing when tapping the picker
              className="rounded-t-2xl pb-8"
              style={{ backgroundColor: theme.colors.card }}
            >
              <View
                className="flex-row justify-between items-center px-4 py-3 border-b"
                style={{ borderColor: borderColor }}
              >
                <TouchableOpacity onPress={handleCloseModal}>
                  <Text className="text-base" style={{ color: iconColor }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text className="text-base font-sans-semibold text-content-primary">
                  {editingShortcut
                    ? `${SHORTCUT_LABELS[editingShortcut.index] || `Shortcut ${editingShortcut.index + 1}`} Time`
                    : 'Select Time'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    handleTimeChange(selectedTime)
                    handleCloseModal()
                  }}
                >
                  <Text className="text-base font-sans-semibold" style={{ color: brandColor }}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={(_, date) => {
                  if (date) {
                    setSelectedTime(date)
                  }
                }}
                themeVariant="light"
                style={{ height: 200 }}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginLeft: 30, // Align with text (icon width + marginLeft)
  },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pillTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  shortcutList: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  shortcutLabelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  shortcutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
})
