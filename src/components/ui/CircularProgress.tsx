import React, { useEffect, useState, useRef } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated'

import { Text } from './Text'
import { useTheme } from '~/hooks/useTheme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// Animation timing
const ANIMATION_DURATION = 800
const ANIMATION_DELAY = 200

interface CircularProgressProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  showPercentage?: boolean
  animationKey?: number
}

export function CircularProgress({
  progress,
  size = 100,
  strokeWidth = 8,
  showPercentage = true,
  animationKey = 0,
}: CircularProgressProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedProgress = Math.min(100, Math.max(0, progress))

  // Animated value for progress
  const animatedProgress = useSharedValue(0)

  // Track previous animationKey to detect when to reset from 0
  const prevAnimationKeyRef = useRef(animationKey)

  // State for displayed percentage (updated from animation)
  const [displayedProgress, setDisplayedProgress] = useState(0)

  // Update displayed progress when animated value changes
  useAnimatedReaction(
    () => Math.round(animatedProgress.value),
    (currentValue) => {
      runOnJS(setDisplayedProgress)(currentValue)
    },
    [animatedProgress],
  )

  useEffect(() => {
    const animationKeyChanged = prevAnimationKeyRef.current !== animationKey
    prevAnimationKeyRef.current = animationKey

    // Only reset to 0 when animationKey changes (e.g., Analytics screen focus)
    // When just progress changes (e.g., task completion), animate from current value
    if (animationKeyChanged) {
      animatedProgress.value = 0
      setDisplayedProgress(0)
      animatedProgress.value = withDelay(
        ANIMATION_DELAY,
        withTiming(clampedProgress, {
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
        }),
      )
    } else {
      // Animate from current value to new value (incremental update)
      animatedProgress.value = withTiming(clampedProgress, {
        duration: ANIMATION_DURATION / 2, // Faster for incremental updates
        easing: Easing.out(Easing.cubic),
      })
    }
  }, [clampedProgress, animationKey, animatedProgress])

  // Animated stroke dash offset
  const animatedProps = useAnimatedProps(() => {
    const currentOffset = circumference - (animatedProgress.value / 100) * circumference
    return {
      strokeDashoffset: currentOffset,
    }
  })

  // Theme-aware colors
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
        {/* Progress circle with gradient - animated */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {showPercentage && (
        <View className="absolute items-center justify-center flex-row">
          <Text
            className="font-bold text-slate-900 dark:text-white"
            style={{ fontSize: size * 0.26, lineHeight: size * 0.32 }}
          >
            {displayedProgress}
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
