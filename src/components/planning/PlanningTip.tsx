import React, { useState, useEffect } from 'react'
import { View } from 'react-native'
import { Lightbulb } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'

const PLANNING_TIPS = [
  'Schedule your most important tasks in the morning when your energy is highest.',
  'Limit yourself to 3 key tasks per day to maintain focus and avoid overwhelm.',
  'Break large tasks into smaller, actionable steps you can complete in one session.',
  'Leave buffer time between tasks for unexpected interruptions.',
  'End each day by planning tomorrow — it helps you start with clarity.',
  'Tackle your hardest task first. The rest of the day feels easier.',
]

export function PlanningTip() {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * PLANNING_TIPS.length))

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % PLANNING_TIPS.length)
    }, 10000) // Rotate every 10 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <View
      className="mx-5 mt-6 p-4 rounded-xl border border-dashed"
      style={{
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border.primary,
      }}
    >
      {/* Header with lightbulb icon */}
      <View className="flex-row items-center mb-2">
        <Lightbulb size={16} color={brandColor} />
        <Text className="font-sans-medium ml-2" style={{ fontSize: 14, color: brandColor }}>
          Planning Tip
        </Text>
      </View>

      {/* Tip text */}
      <Text
        className="font-sans"
        style={{ fontSize: 15, color: theme.colors.text.secondary, lineHeight: 22 }}
      >
        {PLANNING_TIPS[tipIndex]}
      </Text>
    </View>
  )
}
