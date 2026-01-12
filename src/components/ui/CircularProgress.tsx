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

  // Theme-aware colors - darker, more subtle background ring
  const backgroundStroke = isDark ? '#2D2D3A' : '#e2e8f0'

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#c084fc" />
            <Stop offset="50%" stopColor="#a855f7" />
            <Stop offset="100%" stopColor="#7c3aed" />
          </LinearGradient>
        </Defs>
        {/* Background circle - subtle dark ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundStroke}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle with gradient */}
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
        <View className="absolute items-center justify-center flex-row">
          <Text
            className="font-bold text-slate-900 dark:text-white"
            style={{ fontSize: size * 0.26, lineHeight: size * 0.32 }}
          >
            {Math.round(clampedProgress)}
          </Text>
          <Text
            className="font-medium text-slate-600 dark:text-slate-300"
            style={{ fontSize: size * 0.14, marginTop: size * 0.02, marginLeft: 1 }}
          >
            %
          </Text>
        </View>
      )}
    </View>
  )
}
