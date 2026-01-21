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
import { useTheme } from '~/hooks/useTheme'
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

const SHORTCUT_LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
}

export function ReminderShortcutsSection() {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const { profile } = useProfile()
  const updateProfile = useUpdateProfile()

  const [isExpanded, setIsExpanded] = useState(false)
  const [editingShortcut, setEditingShortcut] = useState<ReminderShortcut | null>(null)
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

  const handleEditShortcut = useCallback((shortcut: ReminderShortcut) => {
    setEditingShortcut(shortcut)
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
        s.id === editingShortcut.id ? { ...s, hour: newHour, minute: newMinute } : s,
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
  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const iconColor = isDark ? '#64748b' : '#94a3b8'
  const textMuted = isDark ? '#64748b' : '#94a3b8'
  const dividerColor = isDark ? '#334155' : '#e2e8f0'
  const borderColor = isDark ? '#334155' : '#e2e8f0'

  // Format time for display
  const formatTime = (hour: number, minute: number) => {
    const date = setMinutes(setHours(new Date(), hour), minute)
    return format(date, 'h:mm a')
  }

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc' }]}
    >
      {/* Header Row - Always Visible */}
      <TouchableOpacity onPress={handleToggleExpand} activeOpacity={0.7} style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Bell size={18} color={purpleColor} />
          <Text
            className={`text-base font-sans-medium ${isDark ? 'text-white' : 'text-slate-900'}`}
            style={{ marginLeft: 12 }}
          >
            Reminder Shortcuts
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={{ color: textMuted, fontSize: 14, marginRight: 4 }}>
            {shortcuts.map((s) => formatTime(s.hour, s.minute)).join(', ')}
          </Text>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={18} color={iconColor} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Text
              className={`text-sm font-sans-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
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

              return (
                <TouchableOpacity
                  key={shortcut.id}
                  onPress={() => handleEditShortcut(shortcut)}
                  activeOpacity={0.7}
                  style={[
                    styles.shortcutRow,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor },
                  ]}
                >
                  <Text className={`text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {SHORTCUT_LABELS[shortcut.id] || shortcut.id}
                  </Text>
                  <Text style={{ color: purpleColor, fontSize: 16, fontWeight: '600' }}>
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
          themeVariant={isDark ? 'dark' : 'light'}
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
              style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }}
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
                <Text className="text-base font-sans-semibold text-slate-900 dark:text-white">
                  {editingShortcut
                    ? `${SHORTCUT_LABELS[editingShortcut.id] || editingShortcut.id} Time`
                    : 'Select Time'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    handleTimeChange(selectedTime)
                    handleCloseModal()
                  }}
                >
                  <Text className="text-base font-sans-semibold" style={{ color: purpleColor }}>
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
                themeVariant={isDark ? 'dark' : 'light'}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
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
})
