import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Check, ArrowRight, ChevronRight, CalendarDays } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { type PlanningTarget } from './DayToggle'

export type MoveToDayVariant = 'checkbox' | 'card' | 'prompt' | 'blend' | 'stack'

interface MoveToDayToggleProps {
  variant: MoveToDayVariant
  moving: boolean
  onToggle: () => void
  currentDay: PlanningTarget
  disabled?: boolean
}

export function MoveToDayToggle(props: MoveToDayToggleProps) {
  if (props.variant === 'card') return <DirectionalCard {...props} />
  if (props.variant === 'prompt') return <SamiPrompt {...props} />
  if (props.variant === 'blend') return <InvitationCard {...props} />
  if (props.variant === 'stack') return <StackCard {...props} />
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

function DirectionalCard({ moving, onToggle, currentDay, disabled }: MoveToDayToggleProps) {
  const theme = useAppTheme()
  const target = otherDay(currentDay)
  const brand = theme.colors.brand.primary

  const borderColor = moving ? brand : theme.colors.border.primary
  const bgColor = moving ? `${brand}14` : 'transparent'
  const textColor = moving ? brand : theme.colors.text.secondary
  const iconColor = moving ? brand : theme.colors.text.tertiary
  const badgeBg = moving ? `${brand}22` : theme.colors.interactive.hover

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.card,
        { borderColor, backgroundColor: bgColor },
      ]}
    >
      <View style={[styles.cardBadge, { backgroundColor: badgeBg }]}>
        <CalendarDays size={15} color={iconColor} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          className="font-sans text-xs"
          style={{ color: theme.colors.text.tertiary, marginBottom: 1 }}
        >
          {moving ? 'Will move to' : 'Tap to reschedule'}
        </Text>
        <Text className="font-sans-medium text-sm" style={{ color: textColor }}>
          {capitalize(target)}
        </Text>
      </View>
      {moving ? (
        <Check size={18} color={brand} strokeWidth={2.5} />
      ) : (
        <ChevronRight size={18} color={theme.colors.text.tertiary} strokeWidth={2} />
      )}
    </TouchableOpacity>
  )
}

function SamiPrompt({ moving, onToggle, currentDay, disabled }: MoveToDayToggleProps) {
  const theme = useAppTheme()
  const target = otherDay(currentDay)
  const brand = theme.colors.brand.primary

  const helper =
    currentDay === 'today'
      ? 'Not finishing this today?'
      : 'Want to tackle this today instead?'

  if (moving) {
    return (
      <View className="items-center mt-6" style={{ gap: 4 }}>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Check size={14} color={brand} strokeWidth={2.5} />
          <Text className="font-sans text-xs" style={{ color: brand }}>
            Will move to {target}
          </Text>
        </View>
        <TouchableOpacity onPress={onToggle} disabled={disabled} activeOpacity={0.6}>
          <Text
            className="font-sans-medium text-sm underline"
            style={{ color: theme.colors.text.tertiary }}
          >
            Undo
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View className="items-center mt-6" style={{ gap: 4 }}>
      <Text
        className="font-sans text-xs"
        style={{ color: theme.colors.text.tertiary }}
      >
        {helper}
      </Text>
      <TouchableOpacity
        onPress={onToggle}
        disabled={disabled}
        activeOpacity={0.6}
        className="flex-row items-center"
        style={{ gap: 4 }}
      >
        <Text className="font-sans-semibold text-sm" style={{ color: brand }}>
          Move to {capitalize(target)}
        </Text>
        <ArrowRight size={15} color={brand} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  )
}

function InvitationCard({ moving, onToggle, currentDay, disabled }: MoveToDayToggleProps) {
  const theme = useAppTheme()
  const target = otherDay(currentDay)
  const brand = theme.colors.brand.primary

  const helper =
    currentDay === 'today'
      ? 'Not finishing this today?'
      : 'Want to tackle this today instead?'

  const borderColor = moving ? brand : theme.colors.border.primary
  const bgColor = moving ? `${brand}14` : 'transparent'

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.invitationCard,
        { borderColor, backgroundColor: bgColor },
      ]}
    >
      {moving ? (
        <>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Check size={14} color={brand} strokeWidth={2.5} />
            <Text className="font-sans text-xs" style={{ color: brand }}>
              Will move to {target}
            </Text>
          </View>
          <Text
            className="font-sans-medium text-sm underline mt-1"
            style={{ color: theme.colors.text.tertiary }}
          >
            Tap to undo
          </Text>
        </>
      ) : (
        <>
          <Text
            className="font-sans text-xs"
            style={{ color: theme.colors.text.tertiary }}
          >
            {helper}
          </Text>
          <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
            <Text className="font-sans-semibold text-sm" style={{ color: brand }}>
              Move to {capitalize(target)}
            </Text>
            <ArrowRight size={15} color={brand} strokeWidth={2.5} />
          </View>
        </>
      )}
    </TouchableOpacity>
  )
}

function StackCard({ moving, onToggle, currentDay, disabled }: MoveToDayToggleProps) {
  const theme = useAppTheme()
  const target = otherDay(currentDay)
  const brand = theme.colors.brand.primary

  const helper =
    currentDay === 'today'
      ? 'Not finishing this today?'
      : 'Want to tackle this today instead?'

  const borderColor = moving ? brand : theme.colors.border.primary
  const bgColor = moving ? `${brand}14` : 'transparent'

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.card,
        { borderColor, backgroundColor: bgColor, gap: 0 },
      ]}
    >
      <View style={{ flex: 1 }}>
        {moving ? (
          <>
            <Text className="font-sans text-xs" style={{ color: brand, marginBottom: 1 }}>
              Moving to {target}
            </Text>
            <Text
              className="font-sans-medium text-sm underline"
              style={{ color: theme.colors.text.tertiary }}
            >
              Tap to undo
            </Text>
          </>
        ) : (
          <>
            <Text
              className="font-sans text-xs"
              style={{ color: theme.colors.text.tertiary, marginBottom: 1 }}
            >
              {helper}
            </Text>
            <Text className="font-sans-semibold text-sm" style={{ color: brand }}>
              Move to {capitalize(target)}
            </Text>
          </>
        )}
      </View>
      {moving ? (
        <Check size={18} color={brand} strokeWidth={2.5} />
      ) : (
        <ChevronRight size={18} color={theme.colors.text.tertiary} strokeWidth={2} />
      )}
    </TouchableOpacity>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitationCard: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

interface VariantPickerProps {
  variant: MoveToDayVariant
  onChange: (v: MoveToDayVariant) => void
}

export function MoveToDayVariantPicker({ variant, onChange }: VariantPickerProps) {
  const theme = useAppTheme()
  const options: { value: MoveToDayVariant; label: string }[] = [
    { value: 'checkbox', label: 'Box' },
    { value: 'card', label: 'Card' },
    { value: 'prompt', label: 'Sami' },
    { value: 'blend', label: 'Blend' },
    { value: 'stack', label: 'Stack' },
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
      <View className="flex-row" style={{ gap: 4 }}>
        {options.map((opt) => {
          const selected = opt.value === variant
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.7}
              style={[
                styles.pickerPill,
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
