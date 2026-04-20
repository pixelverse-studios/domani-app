import React from 'react'
import { View } from 'react-native'
import { Calendar } from 'lucide-react-native'
import { addDays } from 'date-fns'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useTranslation } from '~/hooks/useTranslation'
import { formatLocalizedWeekdayMonthDay } from '~/i18n/date'
import { DayToggle, type PlanningTarget } from './DayToggle'

interface PlanningHeaderProps {
  selectedTarget: PlanningTarget
  onTargetChange: (target: PlanningTarget) => void
  dateSuffix?: React.ReactNode
}

export function PlanningHeader({ selectedTarget, onTargetChange, dateSuffix }: PlanningHeaderProps) {
  const theme = useAppTheme()
  const { locale, t } = useTranslation()

  const targetDate = selectedTarget === 'today' ? new Date() : addDays(new Date(), 1)
  const formattedDate = formatLocalizedWeekdayMonthDay(targetDate, locale)

  const brandColor = theme.colors.brand.primary

  return (
    <View className="px-5 pt-4 pb-2">
      {/* Top row: Planning for label + toggle */}
      <View className="flex-row items-center justify-between mb-6">
        {/* Planning for label with calendar icon */}
        <View className="flex-row items-center">
          <Calendar size={18} color={brandColor} />
          <Text className="font-sans-medium ml-2" style={{ fontSize: 16, color: brandColor }}>
            {t('planning.header.planningFor')}
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
          {selectedTarget === 'today' ? t('common.today') : t('common.tomorrow')}
        </Text>
        {/* Full date + optional suffix content */}
        <View className="flex-row items-end justify-between">
          <Text className="font-sans text-content-secondary" style={{ fontSize: 18 }}>
            {formattedDate}
          </Text>
          {dateSuffix}
        </View>
      </View>
    </View>
  )
}
