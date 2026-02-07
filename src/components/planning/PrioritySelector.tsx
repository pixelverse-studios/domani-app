import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, TouchableOpacity, LayoutChangeEvent } from 'react-native'
import { Crown, Triangle, AlertTriangle } from 'lucide-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated'

import { Text } from '~/components/ui'
import { useTutorialTarget } from '~/components/tutorial'
import { useAppTheme } from '~/hooks/useAppTheme'

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

export function PrioritySelector({
  selectedPriority,
  onSelectPriority,
  existingTopPriorityTask,
  editingTaskId,
  disabled = false,
}: PrioritySelectorProps) {
  // Register as target for both priority_selector and top_priority tutorial steps
  const { targetRef: prioritySelectorRef, measureTarget: measurePrioritySelector } =
    useTutorialTarget('priority_selector')
  const { targetRef: topPriorityRef, measureTarget: measureTopPriority } =
    useTutorialTarget('top_priority')

  // Store refs in a stable container to avoid recreating combinedRef on every render
  // (useTutorialTarget returns new ref objects each render)
  const refsContainer = useRef({ prioritySelectorRef, topPriorityRef })
  useEffect(() => {
    refsContainer.current = { prioritySelectorRef, topPriorityRef }
  }, [prioritySelectorRef, topPriorityRef])

  // Callback ref that assigns to both tutorial target refs (now stable with no dependencies)
  const combinedRef = useCallback((node: View | null) => {
    const { prioritySelectorRef, topPriorityRef } = refsContainer.current
    if (prioritySelectorRef) {
      ;(prioritySelectorRef as React.MutableRefObject<View | null>).current = node
    }
    if (topPriorityRef) {
      ;(topPriorityRef as React.MutableRefObject<View | null>).current = node
    }
  }, [])

  // Combined layout handler that measures for both tutorial steps
  const handleLayout = useCallback(() => {
    measurePrioritySelector()
    measureTopPriority()
  }, [measurePrioritySelector, measureTopPriority])

  const theme = useAppTheme()

  const priorityColors = {
    top: theme.priority.top.color,
    high: theme.priority.high.color,
    medium: theme.priority.medium.color,
    low: theme.priority.low.color,
  }

  // MIT message logic
  const isEditingCurrentTopTask = editingTaskId && existingTopPriorityTask?.id === editingTaskId
  const showMitReplaceWarning =
    selectedPriority === 'top' && existingTopPriorityTask && !isEditingCurrentTopTask
  const showMitFirstTimeMessage =
    selectedPriority === 'top' && !existingTopPriorityTask && !isEditingCurrentTopTask

  const amberColor = '#f59e0b'

  // Track positions of each option for pill animation
  const [optionPositions, setOptionPositions] = useState<
    Record<Priority, { x: number; width: number }>
  >({
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
    setOptionPositions((prev) => ({
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
      const colorIndex = PRIORITIES.findIndex((p) => p.key === selectedPriority)
      colorProgress.value = withTiming(colorIndex, { duration: 200 })
    }
  }, [selectedPriority, optionPositions, pillX, pillWidth, colorProgress])

  // Animated pill style
  const animatedPillStyle = useAnimatedStyle(() => {
    // Interpolate between colors based on selection
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1, 2, 3],
      [priorityColors.top, priorityColors.high, priorityColors.medium, priorityColors.low],
    )

    return {
      transform: [{ translateX: pillX.value }],
      width: pillWidth.value,
      backgroundColor,
    }
  })

  return (
    <View className="mt-5" ref={combinedRef} onLayout={handleLayout}>
      {/* Priority Label */}
      <View className="flex-row items-center mb-3">
        <Triangle size={16} color={theme.colors.text.tertiary} />
        <Text className="font-sans-medium text-content-primary ml-2">Priority</Text>
      </View>

      {/* Priority Selector Container */}
      <View
        className="rounded-full overflow-hidden"
        style={{
          backgroundColor: theme.colors.card,
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
            const textColor = isSelected ? '#ffffff' : theme.colors.text.secondary
            const iconColor =
              key === 'top' ? (isSelected ? '#ffffff' : priorityColors.top) : textColor

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
                {key === 'top' && <Crown size={14} color={iconColor} style={{ marginRight: 4 }} />}
                <Text className="font-sans-semibold text-sm" style={{ color: textColor }}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* MIT Message - First Time TOP */}
      {showMitFirstTimeMessage && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="flex-row items-center mt-3 px-3 py-2.5 rounded-lg"
          style={{
            borderWidth: 1,
            borderColor: `${priorityColors.top}66`,
            backgroundColor: `${priorityColors.top}0D`,
          }}
        >
          <Crown size={14} color={priorityColors.top} />
          <Text className="font-sans text-sm ml-2" style={{ color: priorityColors.top }}>
            This will be your top priority task
          </Text>
        </Animated.View>
      )}

      {/* MIT Message - Replace Warning */}
      {showMitReplaceWarning && existingTopPriorityTask && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="flex-row items-center mt-3 px-3 py-2.5 rounded-lg"
          style={{
            borderWidth: 1,
            borderColor: `${amberColor}66`,
            backgroundColor: `${amberColor}0D`,
          }}
        >
          <AlertTriangle size={14} color={amberColor} />
          <Text className="flex-1 ml-2" style={{ color: amberColor }}>
            <Text className="font-sans text-sm">This will replace </Text>
            <Text className="font-sans-bold text-sm">{existingTopPriorityTask.title}</Text>
            <Text className="font-sans text-sm"> as your top priority</Text>
          </Text>
        </Animated.View>
      )}
    </View>
  )
}
