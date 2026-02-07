import React from 'react'
import { View } from 'react-native'
import { Calendar } from 'lucide-react-native'
import { format, addDays } from 'date-fns'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { DayToggle, type PlanningTarget } from './DayToggle'

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

interface PlanningHeaderProps {
  selectedTarget: PlanningTarget
  onTargetChange: (target: PlanningTarget) => void
}

export function PlanningHeader({ selectedTarget, onTargetChange }: PlanningHeaderProps) {
  const theme = useAppTheme()

  const targetDate = selectedTarget === 'today' ? new Date() : addDays(new Date(), 1)
  const dayOfWeek = format(targetDate, 'EEEE')
  const month = format(targetDate, 'MMMM')
  const day = targetDate.getDate()
  const formattedDate = `${dayOfWeek}, ${month} ${day}${getOrdinalSuffix(day)}`

  const brandColor = theme.colors.brand.primary

  return (
    <View className="px-5 pt-4 pb-2">
      {/* Top row: Planning for label + toggle */}
      <View className="flex-row items-center justify-between mb-6">
        {/* Planning for label with calendar icon */}
        <View className="flex-row items-center">
          <Calendar size={18} color={brandColor} />
          <Text className="font-sans-medium ml-2" style={{ fontSize: 16, color: brandColor }}>
            Planning for
          </Text>
        </View>

        {/* Today/Tomorrow Toggle */}
        <DayToggle selectedTarget={selectedTarget} onTargetChange={onTargetChange} />
      </View>

      {/* Date display */}
      <View>
        {/* Today/Tomorrow - large title */}
        <Text
          className="font-sans-bold text-content-primary mb-1"
          style={{ fontSize: 36, lineHeight: 44 }}
        >
          {selectedTarget === 'today' ? 'Today' : 'Tomorrow'}
        </Text>
        {/* Full date */}
        <Text className="font-sans text-content-secondary" style={{ fontSize: 18 }}>
          {formattedDate}
        </Text>
      </View>
    </View>
  )
}
