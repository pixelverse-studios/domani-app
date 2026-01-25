import React, { useEffect, useState } from 'react'
import {
  View,
  Modal,
  Animated,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { useTutorialStore, TutorialStep, TutorialTargetMeasurement } from '~/stores/tutorialStore'

/**
 * Configuration for each tutorial step
 */
const STEP_CONFIG: Record<
  TutorialStep,
  {
    title: string
    description: string
    position: 'above' | 'below' | 'center'
    showNext?: boolean
    showSkip?: boolean
  }
> = {
  welcome: {
    title: '',
    description: '',
    position: 'center',
  },
  add_task_button: {
    title: 'Create Your First Task',
    description: 'Tap here to add a new task to your plan.',
    position: 'above',
    showSkip: true,
  },
  title_input: {
    title: 'Give It a Name',
    description: 'Type a short, clear title for your task.',
    position: 'below',
    showSkip: true,
  },
  category_selector: {
    title: 'Choose a Category',
    description: 'Categories help you organize and track different areas of your life.',
    position: 'below',
    showSkip: true,
  },
  create_category: {
    title: 'Create Your Own',
    description: 'Tap "+ New" to create a custom category for anything you want to track.',
    position: 'below',
    showSkip: true,
  },
  priority_selector: {
    title: 'Set Priority',
    description: 'Choose how important this task is to you.',
    position: 'above',
    showSkip: true,
  },
  top_priority: {
    title: 'Your Most Important Task',
    description:
      'Setting "Top" priority makes this your MIT (Most Important Task) - the one thing you must complete today.',
    position: 'above',
    showNext: true,
    showSkip: true,
  },
  day_toggle: {
    title: 'Today or Tomorrow?',
    description: 'Plan tasks for today, or prepare for tomorrow during your evening planning.',
    position: 'below',
    showSkip: true,
  },
  task_created: {
    title: 'Task Created!',
    description: 'Great job! Your first task is ready. Now complete it by tapping the checkbox.',
    position: 'center',
    showNext: true,
  },
  today_screen: {
    title: 'Your Today View',
    description: 'This is where you focus on completing your tasks for the day.',
    position: 'center',
    showNext: true,
  },
  cleanup: {
    title: '',
    description: '',
    position: 'center',
  },
  completion: {
    title: '',
    description: '',
    position: 'center',
  },
}

/**
 * Steps that use the spotlight overlay (not the welcome/completion modals)
 */
const SPOTLIGHT_STEPS: TutorialStep[] = [
  'add_task_button',
  'title_input',
  'category_selector',
  'create_category',
  'priority_selector',
  'top_priority',
  'day_toggle',
]

/**
 * Spotlight overlay component that highlights UI elements during the tutorial.
 * Uses a semi-transparent overlay with a "hole" around the target element.
 */
export function TutorialSpotlight() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const { isActive, currentStep, targetMeasurements, nextStep, skipTutorial, isLoading } =
    useTutorialStore()

  // Animation values
  const [opacity] = useState(() => new Animated.Value(0))

  // Get current step config and measurement
  const stepConfig = currentStep ? STEP_CONFIG[currentStep] : null
  const measurement = currentStep ? targetMeasurements[currentStep] : null

  // Determine if we should show the spotlight for this step
  const isSpotlightStep = currentStep && SPOTLIGHT_STEPS.includes(currentStep)
  const isVisible = !isLoading && isActive && isSpotlightStep && measurement !== null

  useEffect(() => {
    if (isVisible) {
      opacity.setValue(0)
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
  }, [isVisible, opacity, currentStep])

  const handleNext = () => {
    if (!currentStep) return

    // Define step progression for "Next" button clicks
    // Most steps advance automatically through user interaction
    // This handles steps that have explicit "Next" buttons
    const nextStepMap: Partial<Record<TutorialStep, TutorialStep>> = {
      top_priority: 'cleanup', // After seeing MIT info, dismiss spotlight
      task_created: 'today_screen',
      today_screen: 'completion',
    }

    const nextStepValue = nextStepMap[currentStep]
    if (nextStepValue) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        nextStep(nextStepValue)
      })
    }
  }

  const handleSkip = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      skipTutorial()
    })
  }

  if (!isVisible || !stepConfig || !measurement) return null

  // Calculate spotlight hole position with padding
  const PADDING = 8
  const holeX = measurement.x - PADDING
  const holeY = measurement.y - PADDING
  const holeWidth = measurement.width + PADDING * 2
  const holeHeight = measurement.height + PADDING * 2

  // Calculate tooltip position
  const tooltipStyle = calculateTooltipPosition(
    stepConfig.position,
    measurement,
    screenWidth,
    screenHeight
  )

  return (
    <Modal visible transparent animationType="none">
      <Animated.View style={[styles.container, { opacity }]}>
        {/* Dark overlay with spotlight hole */}
        <View style={StyleSheet.absoluteFill}>
          {/* Top section */}
          <View style={[styles.overlaySection, { height: holeY }]} />

          {/* Middle section (with hole) */}
          <View style={[styles.middleRow, { height: holeHeight }]}>
            {/* Left of hole */}
            <View style={[styles.overlaySection, { width: holeX }]} />

            {/* The hole (transparent) */}
            <View
              style={[
                styles.spotlightHole,
                {
                  width: holeWidth,
                  height: holeHeight,
                  borderColor: isDark ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.6)',
                },
              ]}
            />

            {/* Right of hole */}
            <View style={[styles.overlaySection, { flex: 1 }]} />
          </View>

          {/* Bottom section */}
          <View style={[styles.overlaySection, { flex: 1 }]} />
        </View>

        {/* Tooltip */}
        <View
          style={[
            styles.tooltip,
            {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              ...tooltipStyle,
            },
          ]}
        >
          {stepConfig.title && (
            <Text className="text-lg font-sans-bold text-slate-900 dark:text-white mb-1">
              {stepConfig.title}
            </Text>
          )}
          <Text className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            {stepConfig.description}
          </Text>

          <View style={styles.buttonRow}>
            {stepConfig.showSkip && (
              <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.6}>
                <Text className="text-slate-500 dark:text-slate-400 text-sm">Skip</Text>
              </TouchableOpacity>
            )}

            {stepConfig.showNext && (
              <TouchableOpacity
                onPress={handleNext}
                style={styles.nextButton}
                activeOpacity={0.8}
              >
                <Text className="text-white font-sans-semibold text-sm">Next</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    </Modal>
  )
}

/**
 * Calculate tooltip position based on target element and preference
 */
function calculateTooltipPosition(
  position: 'above' | 'below' | 'center',
  measurement: TutorialTargetMeasurement,
  screenWidth: number,
  screenHeight: number
): { top?: number; bottom?: number; left: number; right: number } {
  const MARGIN = 16
  const TOOLTIP_OFFSET = 16

  if (position === 'above') {
    return {
      bottom: screenHeight - measurement.y + TOOLTIP_OFFSET,
      left: MARGIN,
      right: MARGIN,
    }
  }

  if (position === 'below') {
    return {
      top: measurement.y + measurement.height + TOOLTIP_OFFSET,
      left: MARGIN,
      right: MARGIN,
    }
  }

  // Center
  return {
    top: screenHeight / 2 - 100,
    left: MARGIN,
    right: MARGIN,
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  middleRow: {
    flexDirection: 'row',
  },
  spotlightHole: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderRadius: 12,
  },
  tooltip: {
    position: 'absolute',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  nextButton: {
    backgroundColor: '#a855f7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
})
