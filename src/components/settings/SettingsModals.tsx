import React, { useRef, useEffect, useState } from 'react'
import {
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { X, Check, AlertTriangle, Sparkles } from 'lucide-react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
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
  const theme = useAppTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center px-6">
        <View
          className="rounded-2xl p-5 max-h-[75%]"
          style={{ backgroundColor: theme.colors.card }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-content-primary">Edit Name</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>
          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Enter your name"
            placeholderTextColor={theme.colors.text.tertiary}
            autoFocus
            className="rounded-xl px-4 text-base mb-4"
            style={{
              paddingTop: 14,
              paddingBottom: 14,
              lineHeight: undefined,
              backgroundColor: theme.colors.background,
              color: theme.colors.text.primary,
            }}
          />
          <TouchableOpacity
            onPress={onSave}
            disabled={isPending}
            activeOpacity={0.8}
            className="py-3 rounded-xl items-center"
            style={{ backgroundColor: theme.colors.brand.primary }}
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

export function TimezoneModal({ visible, currentTimezone, onSelect, onClose }: TimezoneModalProps) {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="rounded-t-3xl max-h-[70%]" style={{ backgroundColor: theme.colors.card }}>
          <View
            className="flex-row items-center justify-between p-5 border-b"
            style={{ borderColor: theme.colors.border.primary }}
          >
            <Text className="text-lg font-semibold text-content-primary">Select Timezone</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text.tertiary} />
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
                  className="flex-row items-center justify-between py-4 border-b"
                  style={{ borderColor: theme.colors.border.divider }}
                >
                  <View>
                    <Text className="text-base text-content-primary">{tz.label}</Text>
                    <Text className="text-sm text-content-secondary">{tz.offset}</Text>
                  </View>
                  {isSelected && <Check size={20} color={theme.colors.brand.primary} />}
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
// Android Wheel Time Picker
// ============================================================================

const ITEM_HEIGHT = 50
const VISIBLE_ITEMS = 5
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS
const PADDING_VERTICAL = ITEM_HEIGHT * 2 // centers first/last items

interface TimeWheelProps {
  items: string[]
  selectedIndex: number
  onIndexChange: (index: number) => void
  primaryColor: string
  textColor: string
  mutedColor: string
  bgColor: string
  width: number
}

function TimeWheel({
  items,
  selectedIndex,
  onIndexChange,
  primaryColor,
  textColor,
  mutedColor,
  bgColor,
  width,
}: TimeWheelProps) {
  const scrollRef = useRef<ScrollView>(null)

  // Scroll to initial position after layout
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false })
    }, 80)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMomentumScrollEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const rawIndex = e.nativeEvent.contentOffset.y / ITEM_HEIGHT
    const index = Math.max(0, Math.min(Math.round(rawIndex), items.length - 1))
    onIndexChange(index)
  }

  const handleScrollEndDrag = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const rawIndex = e.nativeEvent.contentOffset.y / ITEM_HEIGHT
    const index = Math.max(0, Math.min(Math.round(rawIndex), items.length - 1))
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true })
    onIndexChange(index)
  }

  return (
    <View style={{ width, height: WHEEL_HEIGHT, overflow: 'hidden' }}>
      {/* Selection highlight bar */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: ITEM_HEIGHT * 2,
          left: 4,
          right: 4,
          height: ITEM_HEIGHT,
          backgroundColor: `${primaryColor}18`,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: `${primaryColor}30`,
          zIndex: 1,
        }}
      />
      {/* Top fade */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT * 1.5,
          backgroundColor: bgColor,
          opacity: 0.6,
          zIndex: 2,
        }}
      />
      {/* Bottom fade */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT * 1.5,
          backgroundColor: bgColor,
          opacity: 0.6,
          zIndex: 2,
        }}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex
          return (
            <TouchableOpacity
              key={`${item}-${i}`}
              onPress={() => {
                scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true })
                onIndexChange(i)
              }}
              style={{
                height: ITEM_HEIGHT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                allowFontScaling={false}
                style={{
                  fontSize: isSelected ? 22 : 18,
                  fontWeight: isSelected ? '700' : '400',
                  color: isSelected ? textColor : mutedColor,
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

interface AndroidTimePickerModalProps {
  value: Date
  isPending: boolean
  onConfirm: (date: Date) => void
  onCancel: () => void
}

function AndroidTimePickerModal({
  value,
  isPending,
  onConfirm,
  onCancel,
}: AndroidTimePickerModalProps) {
  const theme = useAppTheme()

  const rawHour = value.getHours()
  const isAm = rawHour < 12
  const hour12 = rawHour % 12 || 12

  // Build item arrays
  const hourItems = Array.from({ length: 12 }, (_, i) => String(i + 1))
  const minuteItems = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))
  const amPmItems = ['AM', 'PM']

  const [hourIndex, setHourIndex] = useState(hour12 - 1)
  const [minuteIndex, setMinuteIndex] = useState(value.getMinutes())
  const [amPmIndex, setAmPmIndex] = useState(isAm ? 0 : 1)

  const handleConfirm = () => {
    const selectedHour12 = hourIndex + 1
    const isPm = amPmIndex === 1
    let hour24 = selectedHour12
    if (isPm && selectedHour12 !== 12) hour24 = selectedHour12 + 12
    if (!isPm && selectedHour12 === 12) hour24 = 0

    const result = new Date(value)
    result.setHours(hour24, minuteIndex, 0, 0)
    onConfirm(result)
  }

  const brandColor = theme.colors.brand.primary
  const textColor = theme.colors.text.primary
  const mutedColor = theme.colors.text.tertiary
  const cardBg = theme.colors.card

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 20,
            padding: 20,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <Text
              allowFontScaling={false}
              style={{ fontSize: 18, fontWeight: '600', color: textColor }}
            >
              Planning Reminder
            </Text>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color={mutedColor} />
            </TouchableOpacity>
          </View>
          <Text
            allowFontScaling={false}
            style={{ fontSize: 13, color: theme.colors.text.secondary, marginBottom: 20 }}
          >
            Get reminded to plan tomorrow&apos;s tasks
          </Text>

          {/* Wheel picker */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <TimeWheel
              items={hourItems}
              selectedIndex={hourIndex}
              onIndexChange={setHourIndex}
              primaryColor={brandColor}
              textColor={textColor}
              mutedColor={mutedColor}
              bgColor={cardBg}
              width={64}
            />

            <Text
              allowFontScaling={false}
              style={{
                fontSize: 28,
                fontWeight: '700',
                color: textColor,
                width: 16,
                textAlign: 'center',
                marginTop: -4,
              }}
            >
              :
            </Text>

            <TimeWheel
              items={minuteItems}
              selectedIndex={minuteIndex}
              onIndexChange={setMinuteIndex}
              primaryColor={brandColor}
              textColor={textColor}
              mutedColor={mutedColor}
              bgColor={cardBg}
              width={64}
            />

            <View style={{ width: 12 }} />

            <TimeWheel
              items={amPmItems}
              selectedIndex={amPmIndex}
              onIndexChange={setAmPmIndex}
              primaryColor={brandColor}
              textColor={textColor}
              mutedColor={mutedColor}
              bgColor={cardBg}
              width={60}
            />
          </View>

          {/* Save button */}
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={isPending}
            activeOpacity={0.8}
            style={{
              backgroundColor: brandColor,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 20,
            }}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text allowFontScaling={false} style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                Save
              </Text>
            )}
          </TouchableOpacity>
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
  onSave: (date?: Date) => void
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
  const theme = useAppTheme()

  // On Android, use our custom themed wheel picker instead of the native dialog.
  // The native DateTimePicker with display="spinner" renders as a system AlertDialog
  // outside React Native's Modal stack, causing stacking issues.
  if (Platform.OS === 'android') {
    if (!visible) return null
    return (
      <AndroidTimePickerModal
        value={selectedTime}
        isPending={isPending}
        onConfirm={(date) => {
          onTimeChange(date)
          onSave(date)
        }}
        onCancel={onClose}
      />
    )
  }

  // iOS: custom modal with native spinner and Save button
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center px-6">
        <View
          className="rounded-2xl p-5 max-h-[75%]"
          style={{ backgroundColor: theme.colors.card }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-content-primary">Planning Reminder</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>
          <Text className="text-sm text-content-secondary mb-4">
            Get reminded to plan tomorrow&apos;s tasks
          </Text>
          <View className="items-center mb-4">
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="spinner"
              onChange={(_event: unknown, date?: Date) => {
                if (date) onTimeChange(date)
              }}
              textColor={theme.colors.text.primary}
            />
          </View>
          <TouchableOpacity
            onPress={() => onSave()}
            disabled={isPending}
            activeOpacity={0.8}
            className="py-3 rounded-xl items-center"
            style={{ backgroundColor: theme.colors.brand.primary }}
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
  const theme = useAppTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center px-6">
        <View
          className="rounded-2xl p-6 w-full max-w-[320px] max-h-[75%] items-center"
          style={{ backgroundColor: theme.colors.card }}
        >
          {/* Warning Icon */}
          <View className="w-14 h-14 rounded-full bg-red-500/15 items-center justify-center mb-4">
            <AlertTriangle size={28} color="#ef4444" />
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-content-primary text-center mb-2">
            Delete Your Account?
          </Text>

          {/* Description */}
          <Text className="text-sm text-content-secondary text-center mb-4">
            Your account and all data will be permanently deleted after 30 days. You can sign in
            anytime before then to reactivate your account.
          </Text>

          {/* What will be deleted */}
          <View className="w-full bg-red-500/10 rounded-xl p-3 mb-5">
            <Text className="text-xs font-medium text-red-500 mb-2">
              This will permanently delete:
            </Text>
            <Text className="text-xs text-content-secondary">
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
              className="w-full py-4 rounded-xl items-center"
              style={{ backgroundColor: theme.colors.interactive.hover }}
            >
              <Text className="font-semibold text-base text-content-primary">Keep Account</Text>
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
  const theme = useAppTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center px-6">
        <View
          className="rounded-2xl p-6 w-full max-w-[320px] max-h-[75%] items-center"
          style={{ backgroundColor: theme.colors.card }}
        >
          {/* Icon */}
          <View
            className="w-14 h-14 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: `${theme.colors.brand.primary}1A` }}
          >
            <Sparkles size={28} color={theme.colors.brand.primary} />
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-content-primary text-center mb-2">
            {isEnabling ? 'Enable Smart Categories?' : 'Disable Smart Categories?'}
          </Text>

          {/* Description */}
          <Text className="text-sm text-content-secondary text-center mb-6">
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
              className="w-full py-4 rounded-xl items-center"
              style={{ backgroundColor: theme.colors.brand.primary }}
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
              className="w-full py-4 rounded-xl items-center"
              style={{ backgroundColor: theme.colors.interactive.hover }}
            >
              <Text className="font-semibold text-base text-content-primary">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
