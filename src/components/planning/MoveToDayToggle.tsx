import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Check, ArrowRightLeft, ArrowRight } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { type PlanningTarget } from './DayToggle'

export type MoveToDayVariant = 'checkbox' | 'chip' | 'pair'

interface MoveToDayToggleProps {
  variant: MoveToDayVariant
  moving: boolean
  onToggle: () => void
  currentDay: PlanningTarget
  disabled?: boolean
}

export function MoveToDayToggle(props: MoveToDayToggleProps) {
  if (props.variant === 'chip') return <SwapChip {...props} />
  if (props.variant === 'pair') return <DayPair {...props} />
  return <CheckboxVariant {...props} />
}

function otherDay(day: PlanningTarget): PlanningTarget {
  return day === 'today' ? 'tomorrow' : 'today'
}

function CheckboxVariant({ moving, onToggle, currentDay, disabled }: MoveToDayToggleProps) {
  const theme = useAppTheme()
  const target = otherDay(currentDay)

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.6}
      className="flex-row items-center mt-5 py-2"
      style={{ gap: 8 }}
    >
      <View
        className="w-4 h-4 rounded items-center justify-center"
        style={{
          backgroundColor: moving ? theme.colors.brand.primary : 'transparent',
          borderWidth: moving ? 0 : 1.5,
          borderColor: theme.colors.text.tertiary,
        }}
      >
        {moving && <Check size={11} color="#fff" strokeWidth={3} />}
      </View>
      <Text
        className="text-sm font-sans-medium"
        style={{ color: moving ? theme.colors.brand.primary : theme.colors.text.tertiary }}
      >
        Move to {target}
      </Text>
    </TouchableOpacity>
  )
}

function SwapChip({ moving, onToggle, currentDay, disabled }: MoveToDayToggleProps) {
  const theme = useAppTheme()
  const target = otherDay(currentDay)
  const brand = theme.colors.brand.primary
  const iconColor = moving ? '#fff' : theme.colors.text.tertiary
  const textColor = moving ? '#fff' : theme.colors.text.secondary

  return (
    <View className="flex-row mt-5">
      <TouchableOpacity
        onPress={onToggle}
        disabled={disabled}
        activeOpacity={0.75}
        style={[
          styles.chip,
          {
            backgroundColor: moving ? brand : 'transparent',
            borderColor: moving ? brand : theme.colors.border.primary,
          },
        ]}
      >
        <ArrowRightLeft size={14} color={iconColor} />
        <Text className="font-sans-medium text-sm" style={{ color: textColor, marginLeft: 8 }}>
          {moving ? `Moving to ${target}` : `Move to ${target}`}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

function DayPair({ moving, onToggle, currentDay, disabled }: MoveToDayToggleProps) {
  const theme = useAppTheme()
  const target = otherDay(currentDay)
  const brand = theme.colors.brand.primary

  const currentLabel = capitalize(currentDay)
  const targetLabel = capitalize(target)

  const currentPillStyle = moving
    ? { backgroundColor: 'transparent', borderColor: theme.colors.border.primary }
    : { backgroundColor: theme.colors.interactive.hover, borderColor: 'transparent' }
  const currentTextStyle = moving
    ? { color: theme.colors.text.tertiary, textDecorationLine: 'line-through' as const }
    : { color: theme.colors.text.primary }

  const targetPillStyle = moving
    ? { backgroundColor: brand, borderColor: brand }
    : { backgroundColor: 'transparent', borderColor: theme.colors.border.primary }
  const targetTextStyle = moving
    ? { color: '#fff' }
    : { color: theme.colors.text.secondary }

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.75}
      className="mt-5"
    >
      <Text
        className="font-sans text-xs mb-1.5"
        style={{ color: theme.colors.text.tertiary }}
      >
        Scheduled for
      </Text>
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <View style={[styles.dayPill, currentPillStyle]}>
          <Text className="font-sans-medium text-xs" style={currentTextStyle}>
            {currentLabel}
          </Text>
        </View>
        <ArrowRight
          size={14}
          color={moving ? brand : theme.colors.text.tertiary}
        />
        <View style={[styles.dayPill, targetPillStyle]}>
          <Text className="font-sans-medium text-xs" style={targetTextStyle}>
            {targetLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
})

interface VariantPickerProps {
  variant: MoveToDayVariant
  onChange: (v: MoveToDayVariant) => void
}

export function MoveToDayVariantPicker({ variant, onChange }: VariantPickerProps) {
  const theme = useAppTheme()
  const options: { value: MoveToDayVariant; label: string }[] = [
    { value: 'checkbox', label: 'A · Checkbox' },
    { value: 'chip', label: 'B · Chip' },
    { value: 'pair', label: 'C · Pair' },
  ]

  return (
    <View
      className="mt-5 px-3 py-2.5 rounded-xl"
      style={{ backgroundColor: theme.colors.interactive.hover }}
    >
      <Text
        className="font-sans text-xs mb-2"
        style={{ color: theme.colors.text.tertiary }}
      >
        ⚙︎ Preview variant (dev only)
      </Text>
      <View className="flex-row" style={{ gap: 6 }}>
        {options.map((opt) => {
          const selected = opt.value === variant
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.7}
              style={[
                styles.dayPill,
                {
                  backgroundColor: selected ? theme.colors.brand.primary : 'transparent',
                  borderColor: selected ? theme.colors.brand.primary : theme.colors.border.primary,
                },
              ]}
            >
              <Text
                className="font-sans-medium text-xs"
                style={{ color: selected ? '#fff' : theme.colors.text.secondary }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
