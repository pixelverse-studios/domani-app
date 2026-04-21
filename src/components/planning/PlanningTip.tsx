import React, { useState, useEffect } from 'react'
import { View } from 'react-native'
import { Lightbulb } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useTranslation } from '~/hooks/useTranslation'
import { getMainScreenCopy } from '~/i18n/mainScreenCopy'

export function PlanningTip() {
  const theme = useAppTheme()
  const { locale } = useTranslation()
  const copy = getMainScreenCopy(locale)
  const brandColor = theme.colors.brand.primary

  const tips = copy.planning.tips
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * tips.length))

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length)
    }, 10000) // Rotate every 10 seconds

    return () => clearInterval(interval)
  }, [tips.length])

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
          {copy.planning.tipTitle}
        </Text>
      </View>

      {/* Tip text */}
      <Text
        className="font-sans"
        style={{ fontSize: 15, color: theme.colors.text.secondary, lineHeight: 22 }}
      >
        {tips[tipIndex]}
      </Text>
    </View>
  )
}
