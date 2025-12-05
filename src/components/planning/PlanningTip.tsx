import React, { useState, useEffect } from 'react'
import { View } from 'react-native'
import { Lightbulb } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'

const PLANNING_TIPS = [
  'Schedule your most important tasks in the morning when your energy is highest.',
  'Limit yourself to 3 key tasks per day to maintain focus and avoid overwhelm.',
  'Break large tasks into smaller, actionable steps you can complete in one session.',
  'Leave buffer time between tasks for unexpected interruptions.',
  'End each day by planning tomorrow — it helps you start with clarity.',
  'Tackle your hardest task first. The rest of the day feels easier.',
]

export function PlanningTip() {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * PLANNING_TIPS.length))

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % PLANNING_TIPS.length)
    }, 10000) // Rotate every 10 seconds

    return () => clearInterval(interval)
  }, [])

  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const tipTextColor = isDark ? '#94a3b8' : '#64748b' // slate-400 / slate-500

  return (
    <View
      className="mx-5 mt-6 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"
      style={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc' }}
    >
      {/* Header with lightbulb icon */}
      <View className="flex-row items-center mb-2">
        <Lightbulb size={16} color={purpleColor} />
        <Text className="font-sans-medium ml-2" style={{ fontSize: 14, color: purpleColor }}>
          Planning Tip
        </Text>
      </View>

      {/* Tip text */}
      <Text className="font-sans" style={{ fontSize: 15, color: tipTextColor, lineHeight: 22 }}>
        {PLANNING_TIPS[tipIndex]}
      </Text>
    </View>
  )
}
