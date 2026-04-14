import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Check, ChevronRight } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { type PlanningTarget } from './DayToggle'

interface MoveToDayToggleProps {
  moving: boolean
  onToggle: () => void
  currentDay: PlanningTarget
  disabled?: boolean
}

export function MoveToDayToggle({
  moving,
  onToggle,
  currentDay,
  disabled,
}: MoveToDayToggleProps) {
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
      accessibilityRole="button"
      accessibilityState={{ checked: moving, disabled }}
      accessibilityLabel={
        moving ? `Cancel move to ${target}` : `Move task to ${target}`
      }
      style={[styles.card, { borderColor, backgroundColor: bgColor }]}
    >
      <View style={{ flex: 1 }}>
        {moving ? (
          <>
            <Text
              className="font-sans text-xs underline"
              style={{ color: theme.colors.text.tertiary, marginBottom: 1 }}
            >
              Tap to undo
            </Text>
            <Text className="font-sans-semibold text-sm" style={{ color: brand }}>
              Moving to {capitalize(target)}
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

function otherDay(day: PlanningTarget): PlanningTarget {
  return day === 'today' ? 'tomorrow' : 'today'
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
})
