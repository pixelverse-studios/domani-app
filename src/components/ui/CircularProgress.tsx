import React from 'react'
import { View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'

import { Text } from './Text'
import { useTheme } from '~/hooks/useTheme'

interface CircularProgressProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  showPercentage?: boolean
}

export function CircularProgress({
  progress,
  size = 100,
  strokeWidth = 8,
  showPercentage = true,
}: CircularProgressProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedProgress = Math.min(100, Math.max(0, progress))
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference

  // Theme-aware colors for SVG (can't use Tailwind classes)
  const backgroundStroke = isDark ? '#374151' : '#e2e8f0' // gray-700 / slate-200

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#a855f7" />
            <Stop offset="100%" stopColor="#7c3aed" />
          </LinearGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundStroke}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.3}
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {showPercentage && (
        <View className="absolute items-center justify-center">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            {Math.round(clampedProgress)}%
          </Text>
        </View>
      )}
    </View>
  )
}
