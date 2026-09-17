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
import { router } from 'expo-router'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useTutorialAnalytics } from '~/hooks/useTutorialAnalytics'
import { useTranslation } from '~/hooks/useTranslation'
import {
  TUTORIAL_STEPS,
  useTutorialStore,
  TutorialStep,
  TutorialTargetMeasurement,
} from '~/stores/tutorialStore'
import { getAccountLifecycleSnapshot } from '~/lib/accountLifecycleCoordinator'

type TutorialStepConfig = {
  title: string
  description: string
  position: 'above' | 'below' | 'center'
  stepNumber?: number
}

const SPOTLIGHT_STEPS: TutorialStep[] = [
  'today_primary_action',
  'planning_form',
  'task_title',
  'task_category',
  'task_priority',
  'task_reminder',
  'task_submit',
  'complete',
]

const TOTAL_STEPS = 8
const TOOLTIP_MARGIN = 20
const TOOLTIP_OFFSET = 20
const TOOLTIP_ESTIMATED_HEIGHT = 220

/**
 * Polished spotlight overlay for tutorial guidance.
 * Uses absolute positioning instead of Modal to allow touch pass-through.
 */
export function TutorialSpotlight() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const theme = useAppTheme()
  const { t } = useTranslation()
  const brandColor = theme.colors.brand.primary
  const stepConfigMap: Record<TutorialStep, TutorialStepConfig> = {
    welcome: { title: '', description: '', position: 'center' },
    today_primary_action: {
      title: t('tutorial.steps.todayPrimaryActionTitle'),
      description: t('tutorial.steps.todayPrimaryActionDescription'),
      position: 'above',
      stepNumber: 1,
    },
    planning_form: {
      title: t('tutorial.steps.planningFormTitle'),
      description: t('tutorial.steps.planningFormDescription'),
      position: 'below',
      stepNumber: 2,
    },
    task_title: {
      title: t('tutorial.steps.taskTitleTitle'),
      description: t('tutorial.steps.taskTitleDescription'),
      position: 'below',
      stepNumber: 3,
    },
    task_category: {
      title: t('tutorial.steps.taskCategoryTitle'),
      description: t('tutorial.steps.taskCategoryDescription'),
      position: 'above',
      stepNumber: 4,
    },
    task_priority: {
      title: t('tutorial.steps.taskPriorityTitle'),
      description: t('tutorial.steps.taskPriorityDescription'),
      position: 'above',
      stepNumber: 5,
    },
    task_reminder: {
      title: t('tutorial.steps.taskReminderTitle'),
      description: t('tutorial.steps.taskReminderDescription'),
      position: 'below',
      stepNumber: 6,
    },
    task_submit: {
      title: t('tutorial.steps.taskSubmitTitle'),
      description: t('tutorial.steps.taskSubmitDescription'),
      position: 'above',
      stepNumber: 7,
    },
    complete: {
      title: t('tutorial.steps.completeTitle'),
      description: t('tutorial.steps.completeDescription'),
      position: 'center',
      stepNumber: 8,
    },
  }

  const {
    isActive,
    currentStep,
    targetMeasurements,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    isLoading,
    isOverlayHidden,
  } = useTutorialStore()
  const { trackStepViewed, trackTutorialSkipped, trackTutorialCompleted } = useTutorialAnalytics()

  // Animation values
  const overlayOpacity = useSharedValue(0)
  const tooltipScale = useSharedValue(0.9)
  const tooltipTranslateY = useSharedValue(20)

  const stepConfig = currentStep ? stepConfigMap[currentStep] : null
  const measurement = currentStep ? targetMeasurements[currentStep] : null
  const isSpotlightStep = currentStep && SPOTLIGHT_STEPS.includes(currentStep)
  const hasRequiredMeasurement = !!stepConfig && (stepConfig.position === 'center' || !!measurement)
  const isVisible =
    !isLoading && isActive && isSpotlightStep && !isOverlayHidden && hasRequiredMeasurement
  const currentStepIndex = currentStep ? TUTORIAL_STEPS.indexOf(currentStep) : -1
  const isFinalStep = currentStep === 'complete'
  const canGoBack = currentStepIndex > 0

  // Trigger haptic feedback and track step view when spotlight appears
  useEffect(() => {
    if (isVisible && currentStep) {
      // Track step view
      trackStepViewed(currentStep)

      // Haptic feedback on iOS
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
    }
  }, [isVisible, currentStep, trackStepViewed])

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

  const handleBack = () => {
    if (!currentStep) return

    overlayOpacity.value = withTiming(0, { duration: 150 })
    tooltipScale.value = withTiming(0.9, { duration: 150 })

    if (currentStep === 'planning_form') {
      try {
        router.replace('/(tabs)/')
      } catch (error) {
        console.error('Failed to navigate to Today tab:', error)
      }
    }

    if (currentStep === 'complete') {
      try {
        router.push('/(tabs)/planning?defaultPlanningFor=today&openForm=true')
      } catch (error) {
        console.error('Failed to navigate to Planning tab:', error)
      }
    }

    setTimeout(() => previousStep(), 150)
  }

  const handleNext = () => {
    if (!currentStep) return

    overlayOpacity.value = withTiming(0, { duration: 150 })
    tooltipScale.value = withTiming(0.9, { duration: 150 })

    if (currentStep === 'complete') {
      trackTutorialCompleted()
      const expectedUserId = getAccountLifecycleSnapshot().activeUserId ?? undefined
      setTimeout(() => completeTutorial(expectedUserId), 150)
      return
    }

    if (currentStep === 'today_primary_action') {
      try {
        router.push('/(tabs)/planning?defaultPlanningFor=today&openForm=true')
      } catch (error) {
        console.error('Failed to navigate to Planning tab:', error)
      }
    }

    if (currentStep === 'task_submit') {
      try {
        router.replace('/(tabs)/')
      } catch (error) {
        console.error('Failed to navigate to Today tab:', error)
      }
    }

    setTimeout(() => nextStep(), 150)
  }

  const handleSkip = () => {
    // Track skip with current step
    if (currentStep) {
      trackTutorialSkipped(currentStep)
    }

    overlayOpacity.value = withTiming(0, { duration: 150 })
    tooltipScale.value = withTiming(0.9, { duration: 150 })
    const expectedUserId = getAccountLifecycleSnapshot().activeUserId ?? undefined
    setTimeout(() => skipTutorial(expectedUserId), 150)
  }

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const tooltipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tooltipScale.value }, { translateY: tooltipTranslateY.value }],
    opacity: interpolate(tooltipScale.value, [0.9, 1], [0, 1]),
  }))

  if (!isVisible || !stepConfig) return null

  // Tighter padding around the highlighted element
  const PADDING = 6
  const holeX = measurement ? measurement.x - PADDING : 0
  const holeY = measurement ? measurement.y - PADDING : 0
  const holeWidth = measurement ? measurement.width + PADDING * 2 : 0
  const holeHeight = measurement ? measurement.height + PADDING * 2 : 0

  const tooltipStyle = calculateTooltipPosition(
    stepConfig.position,
    measurement,
    screenWidth,
    screenHeight,
  )

  return (
    <Animated.View
      style={[styles.fullScreenOverlay, overlayAnimatedStyle]}
      pointerEvents="box-none"
    >
      {measurement ? (
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
            fill="rgba(0, 0, 0, 0.6)"
            mask="url(#spotlight-mask)"
          />
        </Svg>
      ) : (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
        />
      )}

      {/* Soft glow around target - doesn't block touches */}
      {measurement && (
        <View
          pointerEvents="none"
          style={[
            styles.spotlightGlow,
            {
              left: holeX - 4,
              top: holeY - 4,
              width: holeWidth + 8,
              height: holeHeight + 8,
              shadowColor: brandColor,
            },
          ]}
        />
      )}

      {/* Tooltip */}
      <Animated.View
        style={[
          styles.tooltip,
          tooltipAnimatedStyle,
          {
            backgroundColor: theme.colors.card,
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
                        ? brandColor
                        : theme.colors.border.primary,
                  },
                ]}
              />
            ))}
            <Text className="text-xs ml-2" style={{ color: theme.colors.text.secondary }}>
              {t('tutorial.progress', {
                current: stepConfig.stepNumber,
                total: TOTAL_STEPS,
              })}
            </Text>
          </View>
        )}

        {stepConfig.title && (
          <Text
            className="text-lg font-sans-bold text-content-primary"
            style={{ marginTop: stepConfig.stepNumber ? 12 : 0 }}
          >
            {stepConfig.title}
          </Text>
        )}
        <Text className="text-sm text-content-secondary" style={{ marginTop: 4, lineHeight: 20 }}>
          {stepConfig.description}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.6}>
            <Text className="text-content-tertiary text-sm">{t('common.actions.skipTour')}</Text>
          </TouchableOpacity>

          <View style={styles.navigationButtons}>
            <TouchableOpacity
              onPress={handleBack}
              disabled={!canGoBack}
              style={[
                styles.backButton,
                {
                  borderColor: theme.colors.border.primary,
                  opacity: canGoBack ? 1 : 0.45,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                className="font-sans-semibold text-sm"
                style={{ color: theme.colors.text.secondary }}
              >
                {t('common.actions.back')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              style={[styles.nextButton, { backgroundColor: brandColor }]}
              activeOpacity={0.8}
            >
              <Text className="text-white font-sans-semibold text-sm">
                {isFinalStep ? t('common.actions.done') : t('common.actions.next')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

function calculateTooltipPosition(
  position: 'above' | 'below' | 'center',
  measurement: TutorialTargetMeasurement | null,
  screenWidth: number,
  screenHeight: number,
): { top?: number; bottom?: number; left: number; right: number } {
  const left = TOOLTIP_MARGIN
  const right = TOOLTIP_MARGIN

  const clampTop = (top: number) =>
    Math.max(
      TOOLTIP_MARGIN,
      Math.min(top, screenHeight - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_MARGIN),
    )

  if (!measurement) {
    return {
      top: clampTop(screenHeight / 2 - TOOLTIP_ESTIMATED_HEIGHT / 2),
      left,
      right,
    }
  }

  if (position === 'above') {
    return {
      top: clampTop(measurement.y - TOOLTIP_OFFSET - TOOLTIP_ESTIMATED_HEIGHT),
      left,
      right,
    }
  }

  if (position === 'below') {
    return {
      top: clampTop(measurement.y + measurement.height + TOOLTIP_OFFSET),
      left,
      right,
    }
  }

  return {
    top: clampTop(screenHeight / 2 - TOOLTIP_ESTIMATED_HEIGHT / 2),
    left,
    right,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
})
