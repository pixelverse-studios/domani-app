import React, { useEffect } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

export type PlanningTarget = 'today' | 'tomorrow'

const TOGGLE_PADDING = 4
const TODAY_WIDTH = 68
const TOMORROW_WIDTH = 92

const FLUID_SPRING = {
  damping: 15,
  stiffness: 150,
  mass: 1,
}

const WIDTH_SPRING = {
  damping: 18,
  stiffness: 180,
  mass: 1,
}

const UNDERLINE_SPRING = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
}

interface DayToggleProps {
  selectedTarget: PlanningTarget
  onTargetChange: (target: PlanningTarget) => void
  disabled?: boolean
  variant?: 'pill' | 'minimal'
}

export function DayToggle({
  selectedTarget,
  onTargetChange,
  disabled = false,
  variant = 'pill',
}: DayToggleProps) {
  if (variant === 'minimal') {
    return (
      <MinimalDayToggle
        selectedTarget={selectedTarget}
        onTargetChange={onTargetChange}
        disabled={disabled}
      />
    )
  }

  return (
    <PillDayToggle
      selectedTarget={selectedTarget}
      onTargetChange={onTargetChange}
      disabled={disabled}
    />
  )
}

function PillDayToggle({
  selectedTarget,
  onTargetChange,
  disabled,
}: Omit<DayToggleProps, 'variant'>) {
  const indicatorPosition = useSharedValue(selectedTarget === 'today' ? 0 : TODAY_WIDTH)
  const indicatorWidth = useSharedValue(selectedTarget === 'today' ? TODAY_WIDTH : TOMORROW_WIDTH)
  const scaleY = useSharedValue(1)
  const scaleX = useSharedValue(1)

  useEffect(() => {
    const targetPosition = selectedTarget === 'today' ? 0 : TODAY_WIDTH
    const targetWidth = selectedTarget === 'today' ? TODAY_WIDTH : TOMORROW_WIDTH

    scaleY.value = withSequence(withTiming(0.85, { duration: 100 }), withSpring(1, FLUID_SPRING))
    scaleX.value = withSequence(withTiming(1.08, { duration: 100 }), withSpring(1, FLUID_SPRING))

    indicatorPosition.value = withSpring(targetPosition, FLUID_SPRING)
    indicatorWidth.value = withSpring(targetWidth, WIDTH_SPRING)
  }, [selectedTarget, indicatorPosition, indicatorWidth, scaleX, scaleY])

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: indicatorPosition.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
    width: indicatorWidth.value,
  }))

  return (
    <View
      className="flex-row bg-slate-200 dark:bg-slate-800 rounded-full"
      style={{ padding: TOGGLE_PADDING, opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View
        className="absolute bg-purple-600 rounded-full"
        style={[
          {
            top: TOGGLE_PADDING,
            left: TOGGLE_PADDING,
            height: 36,
          },
          animatedIndicatorStyle,
        ]}
      />

      <TouchableOpacity
        onPress={() => onTargetChange('today')}
        disabled={disabled}
        className="items-center justify-center rounded-full"
        style={{ width: TODAY_WIDTH, height: 36 }}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedTarget === 'today' }}
      >
        <Animated.Text
          className={`font-sans-medium ${
            selectedTarget === 'today' ? 'text-white' : 'text-slate-500 dark:text-slate-400'
          }`}
          style={{ fontSize: 14 }}
        >
          Today
        </Animated.Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onTargetChange('tomorrow')}
        disabled={disabled}
        className="items-center justify-center rounded-full"
        style={{ width: TOMORROW_WIDTH, height: 36 }}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedTarget === 'tomorrow' }}
      >
        <Animated.Text
          className={`font-sans-medium ${
            selectedTarget === 'tomorrow' ? 'text-white' : 'text-slate-500 dark:text-slate-400'
          }`}
          style={{ fontSize: 14 }}
        >
          Tomorrow
        </Animated.Text>
      </TouchableOpacity>
    </View>
  )
}

function MinimalDayToggle({
  selectedTarget,
  onTargetChange,
  disabled,
}: Omit<DayToggleProps, 'variant'>) {
  const ITEM_GAP = 24
  const TODAY_TEXT_WIDTH = 54
  const TOMORROW_TEXT_WIDTH = 90
  const UNDERLINE_WIDTH = 40
  const UNDERLINE_HEIGHT = 2

  // Underline position (centered under text)
  const todayUnderlineLeft = (TODAY_TEXT_WIDTH - UNDERLINE_WIDTH) / 2
  const tomorrowUnderlineLeft =
    TODAY_TEXT_WIDTH + ITEM_GAP + (TOMORROW_TEXT_WIDTH - UNDERLINE_WIDTH) / 2

  const underlinePosition = useSharedValue(
    selectedTarget === 'today' ? todayUnderlineLeft : tomorrowUnderlineLeft,
  )

  useEffect(() => {
    const targetPosition = selectedTarget === 'today' ? todayUnderlineLeft : tomorrowUnderlineLeft
    underlinePosition.value = withSpring(targetPosition, UNDERLINE_SPRING)
  }, [selectedTarget, underlinePosition, todayUnderlineLeft, tomorrowUnderlineLeft])

  const animatedUnderlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlinePosition.value }],
  }))

  return (
    <View style={{ opacity: disabled ? 0.5 : 1 }}>
      <View className="flex-row" style={{ gap: ITEM_GAP }}>
        <TouchableOpacity
          onPress={() => onTargetChange('today')}
          disabled={disabled}
          className="items-center"
          style={{ width: TODAY_TEXT_WIDTH }}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedTarget === 'today' }}
        >
          <Animated.Text
            className={`font-sans-medium ${
              selectedTarget === 'today'
                ? 'text-purple-500 dark:text-purple-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
            style={{ fontSize: 16 }}
          >
            Today
          </Animated.Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onTargetChange('tomorrow')}
          disabled={disabled}
          className="items-center"
          style={{ width: TOMORROW_TEXT_WIDTH }}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedTarget === 'tomorrow' }}
        >
          <Animated.Text
            className={`font-sans-medium ${
              selectedTarget === 'tomorrow'
                ? 'text-purple-500 dark:text-purple-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
            style={{ fontSize: 16 }}
          >
            Tomorrow
          </Animated.Text>
        </TouchableOpacity>
      </View>

      {/* Animated underline indicator */}
      <View className="relative" style={{ height: UNDERLINE_HEIGHT + 4, marginTop: 4 }}>
        <Animated.View
          className="absolute bg-purple-500 dark:bg-purple-400 rounded-full"
          style={[
            {
              width: UNDERLINE_WIDTH,
              height: UNDERLINE_HEIGHT,
              top: 0,
            },
            animatedUnderlineStyle,
          ]}
        />
      </View>
    </View>
  )
}
