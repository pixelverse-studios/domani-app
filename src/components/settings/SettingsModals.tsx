import React from 'react'
import { View, TouchableOpacity, TextInput, ScrollView, Modal, ActivityIndicator } from 'react-native'
import { X, Check, AlertTriangle, Sparkles } from 'lucide-react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { TIMEZONES } from './PreferencesSection'

// ============================================================================
// Name Edit Modal
// ============================================================================

interface NameModalProps {
  visible: boolean
  name: string
  isPending: boolean
  onNameChange: (name: string) => void
  onSave: () => void
  onClose: () => void
}

export function NameModal({
  visible,
  name,
  isPending,
  onNameChange,
  onSave,
  onClose,
}: NameModalProps) {
  const { activeTheme } = useTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center px-6">
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-h-[75%]">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-slate-900 dark:text-white">Edit Name</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>
          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Enter your name"
            placeholderTextColor={activeTheme === 'dark' ? '#94a3b8' : '#64748b'}
            autoFocus
            className="bg-slate-100 dark:bg-slate-700 rounded-xl px-4 text-slate-900 dark:text-white text-base mb-4"
            style={{ paddingTop: 14, paddingBottom: 14, lineHeight: undefined }}
          />
          <TouchableOpacity
            onPress={onSave}
            disabled={isPending}
            activeOpacity={0.8}
            className="bg-purple-500 py-3 rounded-xl items-center"
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ============================================================================
// Timezone Modal
// ============================================================================

interface TimezoneModalProps {
  visible: boolean
  currentTimezone: string | null
  onSelect: (timezone: string) => void
  onClose: () => void
}

export function TimezoneModal({
  visible,
  currentTimezone,
  onSelect,
  onClose,
}: TimezoneModalProps) {
  const { activeTheme } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-slate-800 rounded-t-3xl max-h-[70%]">
          <View className="flex-row items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
            <Text className="text-lg font-semibold text-slate-900 dark:text-white">
              Select Timezone
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>
          <ScrollView className="px-5 py-3">
            {TIMEZONES.map((tz) => {
              const isSelected = currentTimezone === tz.value
              return (
                <TouchableOpacity
                  key={tz.value}
                  onPress={() => onSelect(tz.value)}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700/50"
                >
                  <View>
                    <Text className="text-base text-slate-900 dark:text-white">{tz.label}</Text>
                    <Text className="text-sm text-slate-600 dark:text-slate-400">{tz.offset}</Text>
                  </View>
                  {isSelected && <Check size={20} color="#a855f7" />}
                </TouchableOpacity>
              )
            })}
            <View style={{ height: insets.bottom + 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ============================================================================
// Planning Time Modal
// ============================================================================

interface PlanningTimeModalProps {
  visible: boolean
  selectedTime: Date
  isPending: boolean
  onTimeChange: (date: Date) => void
  onSave: () => void
  onClose: () => void
}

export function PlanningTimeModal({
  visible,
  selectedTime,
  isPending,
  onTimeChange,
  onSave,
  onClose,
}: PlanningTimeModalProps) {
  const { activeTheme } = useTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center px-6">
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-h-[75%]">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-slate-900 dark:text-white">
              Planning Reminder
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>
          <Text className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Get reminded to plan tomorrow&apos;s tasks
          </Text>
          <View className="items-center mb-4">
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="spinner"
              onChange={(_event: unknown, date?: Date) => date && onTimeChange(date)}
              textColor={activeTheme === 'dark' ? '#fff' : '#000'}
            />
          </View>
          <TouchableOpacity
            onPress={onSave}
            disabled={isPending}
            activeOpacity={0.8}
            className="bg-purple-500 py-3 rounded-xl items-center"
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ============================================================================
// Delete Account Modal
// ============================================================================

interface DeleteAccountModalProps {
  visible: boolean
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

export function DeleteAccountModal({
  visible,
  isPending,
  onConfirm,
  onClose,
}: DeleteAccountModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center px-6">
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-[320px] max-h-[75%] items-center">
          {/* Warning Icon */}
          <View className="w-14 h-14 rounded-full bg-red-500/15 items-center justify-center mb-4">
            <AlertTriangle size={28} color="#ef4444" />
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
            Delete Your Account?
          </Text>

          {/* Description */}
          <Text className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
            Your account and all data will be permanently deleted after 30 days. You can sign in
            anytime before then to reactivate your account.
          </Text>

          {/* What will be deleted */}
          <View className="w-full bg-red-500/10 rounded-xl p-3 mb-5">
            <Text className="text-xs font-medium text-red-500 mb-2">
              This will permanently delete:
            </Text>
            <Text className="text-xs text-slate-600 dark:text-slate-400">
              {'\u2022'} All your plans and tasks{'\n'}
              {'\u2022'} Custom categories{'\n'}
              {'\u2022'} Progress history{'\n'}
              {'\u2022'} Account settings
            </Text>
          </View>

          {/* Buttons */}
          <View className="w-full gap-3">
            <TouchableOpacity
              onPress={onConfirm}
              disabled={isPending}
              activeOpacity={0.8}
              className="w-full bg-red-500 py-4 rounded-xl items-center"
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Delete Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              disabled={isPending}
              activeOpacity={0.8}
              className="w-full bg-slate-200 dark:bg-slate-700 py-4 rounded-xl items-center"
            >
              <Text className="text-slate-700 dark:text-slate-200 font-semibold text-base">
                Keep Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ============================================================================
// Smart Categories Modal
// ============================================================================

interface SmartCategoriesModalProps {
  visible: boolean
  isEnabling: boolean
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

export function SmartCategoriesModal({
  visible,
  isEnabling,
  isPending,
  onConfirm,
  onClose,
}: SmartCategoriesModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center px-6">
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-[320px] max-h-[75%] items-center">
          {/* Icon */}
          <View className="w-14 h-14 rounded-full bg-purple-500/15 items-center justify-center mb-4">
            <Sparkles size={28} color="#8b5cf6" />
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
            {isEnabling ? 'Enable Smart Categories?' : 'Disable Smart Categories?'}
          </Text>

          {/* Description */}
          <Text className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6">
            {isEnabling
              ? 'Your quick access categories will automatically adapt based on your usage patterns. This will override your current favorite categories.'
              : 'Your categories will return to manual ordering. You can reorder them by going to Favorite Categories.'}
          </Text>

          {/* Buttons */}
          <View className="w-full gap-3">
            <TouchableOpacity
              onPress={onConfirm}
              disabled={isPending}
              activeOpacity={0.8}
              className="w-full bg-purple-500 py-4 rounded-xl items-center"
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  {isEnabling ? 'Enable' : 'Disable'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              disabled={isPending}
              activeOpacity={0.8}
              className="w-full bg-slate-200 dark:bg-slate-700 py-4 rounded-xl items-center"
            >
              <Text className="text-slate-700 dark:text-slate-200 font-semibold text-base">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
