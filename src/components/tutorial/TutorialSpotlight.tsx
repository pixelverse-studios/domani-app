import React, { useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import Svg, { Defs, Rect, Mask } from 'react-native-svg'

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
    stepNumber?: number
    requiresInteraction?: boolean
    /** When "Next" is tapped, advance to this step instead of just hiding overlay */
    nextStepOnNext?: TutorialStep
  }
> = {
  welcome: { title: '', description: '', position: 'center' },
  add_task_button: {
    title: 'Create Your First Task',
    description: 'Tap here to start planning your day.',
    position: 'above',
    showSkip: true,
    stepNumber: 1,
    requiresInteraction: true,
  },
  title_input: {
    title: 'Name Your Task',
    description: 'Keep it short and actionable.',
    position: 'below',
    showSkip: true,
    stepNumber: 2,
    requiresInteraction: true,
  },
  category_selector: {
    title: 'Create a Custom Category',
    description: 'Tap "+ New" to create your first custom category.',
    position: 'above',
    showSkip: true,
    stepNumber: 3,
    requiresInteraction: true,
  },
  create_category: {
    title: 'Create Your Own',
    description: 'Tap "+ New" to add a custom category.',
    position: 'above',
    showSkip: true,
    stepNumber: 3,
    requiresInteraction: true,
  },
  more_categories_button: {
    title: 'See All Categories',
    description: 'Tap here to view and manage all your categories.',
    position: 'above',
    showSkip: true,
    stepNumber: 3,
    requiresInteraction: true,
  },
  priority_selector: {
    title: 'Set Your Priority',
    description: 'How important is this task?',
    position: 'above',
    showSkip: true,
    stepNumber: 4,
    requiresInteraction: true,
  },
  top_priority: {
    title: 'Your #1 Priority',
    description: 'This becomes your Most Important Task — the one thing you must complete today.',
    position: 'above',
    showNext: true,
    showSkip: true,
    stepNumber: 4,
  },
  day_toggle: {
    title: 'Plan Ahead',
    description: 'Schedule for today or prep tomorrow tonight.',
    position: 'below',
    showSkip: true,
    stepNumber: 5,
    requiresInteraction: true,
  },
  complete_form: {
    title: 'Finish Up',
    description: 'Notes and reminders are optional. Tap "Add Task" to create your first task!',
    position: 'above',
    showNext: true,
    showSkip: true,
    stepNumber: 5,
  },
  task_created: {
    title: 'Task Created!',
    description: 'Tap the checkbox to complete it.',
    position: 'center',
    showNext: true,
  },
  today_screen: {
    title: 'Your Focus View',
    description: 'This is where you execute your plan.',
    position: 'center',
    showNext: true,
  },
  cleanup: { title: '', description: '', position: 'center' },
  completion: { title: '', description: '', position: 'center' },
}

const SPOTLIGHT_STEPS: TutorialStep[] = [
  'add_task_button',
  'title_input',
  'category_selector',
  'more_categories_button',
  'priority_selector',
  'top_priority',
  'day_toggle',
  'complete_form',
]

const TOTAL_STEPS = 5

/**
 * Premium spotlight overlay for tutorial guidance.
 * Uses absolute positioning instead of Modal to allow touch pass-through.
 */
export function TutorialSpotlight() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const {
    isActive,
    currentStep,
    targetMeasurements,
    nextStep,
    skipTutorial,
    isLoading,
    isOverlayHidden,
    hideOverlay,
  } = useTutorialStore()

  // Animation values
  const overlayOpacity = useSharedValue(0)
  const tooltipScale = useSharedValue(0.9)
  const tooltipTranslateY = useSharedValue(20)

  const stepConfig = currentStep ? STEP_CONFIG[currentStep] : null
  const measurement = currentStep ? targetMeasurements[currentStep] : null
  const isSpotlightStep = currentStep && SPOTLIGHT_STEPS.includes(currentStep)
  const isVisible =
    !isLoading && isActive && isSpotlightStep && measurement !== null && !isOverlayHidden

  // Trigger haptic feedback when spotlight appears
  useEffect(() => {
    if (isVisible && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }, [isVisible, currentStep])

  // Auto-skip steps that have no visible target (e.g., "+N more" button when ≤4 categories)
  useEffect(() => {
    if (!isLoading && isActive && isSpotlightStep && measurement === null && !isOverlayHidden) {
      // Give enough time for elements to render and measure (must be longer than
      // the 400ms delay in advanceFromCreateCategory to avoid race conditions)
      const timer = setTimeout(() => {
        // Check again in case measurement arrived
        const currentMeasurement = targetMeasurements[currentStep!]
        if (currentMeasurement === null) {
          // Skip to the fallback step based on current step
          const skipMap: Partial<Record<TutorialStep, TutorialStep>> = {
            more_categories_button: 'priority_selector',
          }
          const fallbackStep = skipMap[currentStep!]
          if (fallbackStep) {
            nextStep(fallbackStep)
          }
        }
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [isLoading, isActive, isSpotlightStep, measurement, isOverlayHidden, currentStep, targetMeasurements, nextStep])

  // Animate in when visible
  useEffect(() => {
    if (isVisible) {
      // Reset values
      overlayOpacity.value = 0
      tooltipScale.value = 0.9
      tooltipTranslateY.value = 20

      // Animate overlay
      overlayOpacity.value = withTiming(1, { duration: 300 })

      // Animate tooltip with spring
      tooltipScale.value = withSpring(1, { damping: 15, stiffness: 150 })
      tooltipTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 })
    }
  }, [isVisible, currentStep, overlayOpacity, tooltipScale, tooltipTranslateY])

  const handleGotIt = () => {
    if (!currentStep) return

    const nextStepMap: Partial<Record<TutorialStep, TutorialStep>> = {
      top_priority: 'complete_form',
      complete_form: 'cleanup',
      task_created: 'today_screen',
      today_screen: 'completion',
    }

    const nextStepValue = nextStepMap[currentStep]
    if (nextStepValue) {
      overlayOpacity.value = withTiming(0, { duration: 150 })
      tooltipScale.value = withTiming(0.9, { duration: 150 })
      setTimeout(() => nextStep(nextStepValue), 150)
    }
  }

  const handleNextInteraction = () => {
    overlayOpacity.value = withTiming(0, { duration: 150 })
    tooltipScale.value = withTiming(0.9, { duration: 150 })

    // If this step has a specific next step, advance to it instead of just hiding
    if (stepConfig?.nextStepOnNext) {
      setTimeout(() => nextStep(stepConfig.nextStepOnNext!), 150)
    } else {
      setTimeout(() => hideOverlay(), 150)
    }
  }

  const handleSkip = () => {
    overlayOpacity.value = withTiming(0, { duration: 150 })
    tooltipScale.value = withTiming(0.9, { duration: 150 })
    setTimeout(() => skipTutorial(), 150)
  }

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const tooltipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tooltipScale.value }, { translateY: tooltipTranslateY.value }],
    opacity: interpolate(tooltipScale.value, [0.9, 1], [0, 1]),
  }))

  if (!isVisible || !stepConfig || !measurement) return null

  // Tighter padding around the highlighted element
  const PADDING = 6
  const holeX = measurement.x - PADDING
  const holeY = measurement.y - PADDING
  const holeWidth = measurement.width + PADDING * 2
  const holeHeight = measurement.height + PADDING * 2

  const tooltipStyle = calculateTooltipPosition(
    stepConfig.position,
    measurement,
    screenWidth,
    screenHeight
  )

  return (
    <Animated.View style={[styles.fullScreenOverlay, overlayAnimatedStyle]} pointerEvents="box-none">
      {/* Dark overlay with spotlight cutout - doesn't block touches */}
      <Svg
        width={screenWidth}
        height={screenHeight}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <Mask id="spotlight-mask">
            <Rect width={screenWidth} height={screenHeight} fill="white" />
            <Rect
              x={holeX}
              y={holeY}
              width={holeWidth}
              height={holeHeight}
              rx={14}
              ry={14}
              fill="black"
            />
          </Mask>
        </Defs>
        <Rect
          width={screenWidth}
          height={screenHeight}
          fill={isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.6)'}
          mask="url(#spotlight-mask)"
        />
      </Svg>

      {/* Soft glow around target - doesn't block touches */}
      <View
        pointerEvents="none"
        style={[
          styles.spotlightGlow,
          {
            left: holeX - 4,
            top: holeY - 4,
            width: holeWidth + 8,
            height: holeHeight + 8,
          },
        ]}
      />

      {/* Tooltip */}
      <Animated.View
        style={[
          styles.tooltip,
          tooltipAnimatedStyle,
          {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            ...tooltipStyle,
          },
        ]}
      >
        {/* Progress indicator */}
        {stepConfig.stepNumber && (
          <View style={styles.progressContainer}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      i + 1 <= (stepConfig.stepNumber || 0)
                        ? '#a855f7'
                        : isDark
                          ? '#475569'
                          : '#cbd5e1',
                  },
                ]}
              />
            ))}
            <Text className="text-xs ml-2" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              {stepConfig.stepNumber} of {TOTAL_STEPS}
            </Text>
          </View>
        )}

        {stepConfig.title && (
          <Text
            className="text-lg font-sans-bold text-slate-900 dark:text-white"
            style={{ marginTop: stepConfig.stepNumber ? 12 : 0 }}
          >
            {stepConfig.title}
          </Text>
        )}
        <Text
          className="text-sm text-slate-600 dark:text-slate-300"
          style={{ marginTop: 4, lineHeight: 20 }}
        >
          {stepConfig.description}
        </Text>

        <View style={styles.buttonRow}>
          {stepConfig.showSkip && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.6}>
              <Text className="text-slate-500 dark:text-slate-400 text-sm">Skip tour</Text>
            </TouchableOpacity>
          )}

          {stepConfig.requiresInteraction && (
            <TouchableOpacity
              onPress={handleNextInteraction}
              style={styles.interactionNextButton}
              activeOpacity={0.8}
            >
              <Text className="text-purple-500 font-sans-semibold text-sm">Next</Text>
            </TouchableOpacity>
          )}

          {stepConfig.showNext && (
            <TouchableOpacity onPress={handleGotIt} style={styles.nextButton} activeOpacity={0.8}>
              <Text className="text-white font-sans-semibold text-sm">Got it</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  )
}

function calculateTooltipPosition(
  position: 'above' | 'below' | 'center',
  measurement: TutorialTargetMeasurement,
  screenWidth: number,
  screenHeight: number
): { top?: number; bottom?: number; left: number; right: number } {
  const MARGIN = 20
  const TOOLTIP_OFFSET = 20

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

  return {
    top: screenHeight / 2 - 100,
    left: MARGIN,
    right: MARGIN,
  }
}

const styles = StyleSheet.create({
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  spotlightGlow: {
    position: 'absolute',
    borderRadius: 18,
    backgroundColor: 'transparent',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 0, // Android doesn't support colored shadows well
  },
  tooltip: {
    position: 'absolute',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  nextButton: {
    backgroundColor: '#a855f7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  interactionNextButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#a855f7',
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
})
