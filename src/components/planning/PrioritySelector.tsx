import React, { useEffect, useState, useCallback } from 'react'
import { View, TouchableOpacity, LayoutChangeEvent } from 'react-native'
import { Crown } from 'lucide-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'

export type Priority = 'top' | 'high' | 'medium' | 'low'

interface PrioritySelectorProps {
  selectedPriority: Priority | null
  onSelectPriority: (priority: Priority) => void
  /** Existing TOP priority task in this plan (for MIT warning) */
  existingTopPriorityTask?: { id: string; title: string } | null
  /** ID of the task being edited (to exclude self from TOP check) */
  editingTaskId?: string
  disabled?: boolean
}

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'top', label: 'Top' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Med' },
  { key: 'low', label: 'Low' },
]

const PILL_SPRING = {
  damping: 18,
  stiffness: 180,
  mass: 0.8,
}

const PRIORITY_COLORS: Record<Priority, string> = {
  top: '#8b5cf6', // Purple
  high: '#ef4444', // Red
  medium: '#f97316', // Orange
  low: '#22c55e', // Green
}

export function PrioritySelector({
  selectedPriority,
  onSelectPriority,
  existingTopPriorityTask,
  editingTaskId,
  disabled = false,
}: PrioritySelectorProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  // MIT message logic
  const isEditingCurrentTopTask = editingTaskId && existingTopPriorityTask?.id === editingTaskId
  const showMitFirstTimeMessage =
    selectedPriority === 'top' && !existingTopPriorityTask && !isEditingCurrentTopTask

  // Track positions of each option for pill animation
  const [optionPositions, setOptionPositions] = useState<Record<Priority, { x: number; width: number }>>({
    top: { x: 0, width: 0 },
    high: { x: 0, width: 0 },
    medium: { x: 0, width: 0 },
    low: { x: 0, width: 0 },
  })

  // Animated values for pill position and color
  const pillX = useSharedValue(0)
  const pillWidth = useSharedValue(0)
  const colorProgress = useSharedValue(0) // 0=top, 1=high, 2=med, 3=low

  // Handle layout measurement for each option
  const handleOptionLayout = useCallback((priority: Priority, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout
    setOptionPositions(prev => ({
      ...prev,
      [priority]: { x, width },
    }))
  }, [])

  // Update pill position when selection changes
  useEffect(() => {
    if (!selectedPriority) return

    const position = optionPositions[selectedPriority]
    if (position.width > 0) {
      pillX.value = withSpring(position.x, PILL_SPRING)
      pillWidth.value = withSpring(position.width, PILL_SPRING)

      // Map priority to color index
      const colorIndex = PRIORITIES.findIndex(p => p.key === selectedPriority)
      colorProgress.value = withTiming(colorIndex, { duration: 200 })
    }
  }, [selectedPriority, optionPositions, pillX, pillWidth, colorProgress])

  // Animated pill style
  const animatedPillStyle = useAnimatedStyle(() => {
    // Interpolate between colors based on selection
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1, 2, 3],
      [PRIORITY_COLORS.top, PRIORITY_COLORS.high, PRIORITY_COLORS.medium, PRIORITY_COLORS.low],
    )

    return {
      transform: [{ translateX: pillX.value }],
      width: pillWidth.value,
      backgroundColor,
    }
  })

  const containerBg = isDark ? '#1e293b' : '#f1f5f9'
  const unselectedTextColor = isDark ? '#94a3b8' : '#64748b'

  return (
    <View>
      {/* Priority Selector Container */}
      <View
        className="rounded-full overflow-hidden"
        style={{
          backgroundColor: containerBg,
          padding: 4,
        }}
      >
        <View className="flex-row relative">
          {/* Animated Pill Background */}
          {selectedPriority && (
            <Animated.View
              className="absolute rounded-full"
              style={[
                {
                  top: 0,
                  left: 0,
                  height: '100%',
                },
                animatedPillStyle,
              ]}
            />
          )}

          {/* Priority Options */}
          {PRIORITIES.map(({ key, label }) => {
            const isSelected = selectedPriority === key
            const textColor = isSelected ? '#ffffff' : unselectedTextColor
            const iconColor = key === 'top'
              ? (isSelected ? '#ffffff' : PRIORITY_COLORS.top)
              : textColor

            return (
              <TouchableOpacity
                key={key}
                onLayout={(e) => handleOptionLayout(key, e)}
                onPress={() => onSelectPriority(key)}
                disabled={disabled}
                className="flex-1 py-2.5 px-3 items-center justify-center flex-row"
                style={{ opacity: disabled ? 0.5 : 1 }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${label} priority`}
              >
                {key === 'top' && (
                  <Crown
                    size={14}
                    color={iconColor}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  className="font-sans-semibold text-sm"
                  style={{ color: textColor }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* MIT Message - First Time TOP */}
      {showMitFirstTimeMessage && (
        <View
          className="flex-row items-center mt-2.5 px-1"
        >
          <Crown size={14} color={PRIORITY_COLORS.top} />
          <Text
            className="font-sans text-sm ml-1.5"
            style={{ color: PRIORITY_COLORS.top }}
          >
            This will be your top priority task
          </Text>
        </View>
      )}
    </View>
  )
}
