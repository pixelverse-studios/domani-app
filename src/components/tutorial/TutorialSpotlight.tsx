import React, { useEffect } from 'react'
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import Svg, { Defs, Rect, Mask, Circle, RadialGradient, Stop } from 'react-native-svg'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import {
  useTutorialStore,
  TutorialStep,
  TutorialTargetMeasurement,
  SpotlightVariant,
} from '~/stores/tutorialStore'

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
  }
> = {
  welcome: { title: '', description: '', position: 'center' },
  add_task_button: {
    title: 'Create Your First Task',
    description: 'Tap here to start planning your day.',
    position: 'above',
    showSkip: true,
    stepNumber: 1,
  },
  title_input: {
    title: 'Name Your Task',
    description: 'Keep it short and actionable.',
    position: 'below',
    showSkip: true,
    stepNumber: 2,
  },
  category_selector: {
    title: 'Pick a Category',
    description: 'Organize tasks by area of life.',
    position: 'below',
    showSkip: true,
    stepNumber: 3,
  },
  create_category: {
    title: 'Create Custom Categories',
    description: 'Tap "+ New" for anything you want to track.',
    position: 'below',
    showSkip: true,
    stepNumber: 3,
  },
  priority_selector: {
    title: 'Set Your Priority',
    description: 'How important is this task?',
    position: 'above',
    showSkip: true,
    stepNumber: 4,
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
  'create_category',
  'priority_selector',
  'top_priority',
  'day_toggle',
]

const TOTAL_STEPS = 5

/**
 * Premium spotlight overlay with two variant styles.
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
    spotlightVariant,
  } = useTutorialStore()

  // Animation values
  const overlayOpacity = useSharedValue(0)
  const tooltipScale = useSharedValue(0.9)
  const tooltipTranslateY = useSharedValue(20)
  const pulseScale = useSharedValue(1)
  const pulseOpacity = useSharedValue(0.6)

  const stepConfig = currentStep ? STEP_CONFIG[currentStep] : null
  const measurement = currentStep ? targetMeasurements[currentStep] : null
  const isSpotlightStep = currentStep && SPOTLIGHT_STEPS.includes(currentStep)
  const isVisible = !isLoading && isActive && isSpotlightStep && measurement !== null

  // Trigger haptic feedback when spotlight appears
  useEffect(() => {
    if (isVisible && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }, [isVisible, currentStep])

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

      // Start pulse animation
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    }
  }, [isVisible, currentStep, overlayOpacity, tooltipScale, tooltipTranslateY, pulseScale, pulseOpacity])

  const handleNext = () => {
    if (!currentStep) return

    const nextStepMap: Partial<Record<TutorialStep, TutorialStep>> = {
      top_priority: 'cleanup',
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

  const handleSkip = () => {
    overlayOpacity.value = withTiming(0, { duration: 150 })
    tooltipScale.value = withTiming(0.9, { duration: 150 })
    setTimeout(() => skipTutorial(), 150)
  }

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const tooltipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: tooltipScale.value },
      { translateY: tooltipTranslateY.value },
    ],
    opacity: interpolate(tooltipScale.value, [0.9, 1], [0, 1]),
  }))

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }))

  if (!isVisible || !stepConfig || !measurement) return null

  const PADDING = 12
  const holeX = measurement.x - PADDING
  const holeY = measurement.y - PADDING
  const holeWidth = measurement.width + PADDING * 2
  const holeHeight = measurement.height + PADDING * 2
  const holeCenterX = holeX + holeWidth / 2
  const holeCenterY = holeY + holeHeight / 2
  const holeRadius = Math.max(holeWidth, holeHeight) / 2

  const tooltipStyle = calculateTooltipPosition(
    stepConfig.position,
    measurement,
    screenWidth,
    screenHeight
  )

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.container, overlayAnimatedStyle]}>
        {spotlightVariant === 'glass' ? (
          <GlassOverlay
            screenWidth={screenWidth}
            screenHeight={screenHeight}
            holeCenterX={holeCenterX}
            holeCenterY={holeCenterY}
            holeRadius={holeRadius}
            holeWidth={holeWidth}
            holeHeight={holeHeight}
            holeX={holeX}
            holeY={holeY}
            isDark={isDark}
          />
        ) : (
          <MinimalOverlay
            screenWidth={screenWidth}
            screenHeight={screenHeight}
            holeX={holeX}
            holeY={holeY}
            holeWidth={holeWidth}
            holeHeight={holeHeight}
            isDark={isDark}
          />
        )}

        {/* Pulse ring around target */}
        <Animated.View
          style={[
            styles.pulseRing,
            pulseAnimatedStyle,
            {
              left: holeX - 4,
              top: holeY - 4,
              width: holeWidth + 8,
              height: holeHeight + 8,
              borderRadius: 16,
              borderColor: '#a855f7',
            },
          ]}
        />

        {/* Tooltip */}
        <Animated.View
          style={[
            spotlightVariant === 'glass' ? styles.tooltipGlass : styles.tooltipMinimal,
            tooltipAnimatedStyle,
            {
              backgroundColor: spotlightVariant === 'glass'
                ? isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'
                : isDark ? '#1e293b' : '#ffffff',
              ...tooltipStyle,
            },
          ]}
        >
          {spotlightVariant === 'glass' && (
            <View style={styles.tooltipAccent} />
          )}

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
                          : isDark ? '#475569' : '#cbd5e1',
                    },
                  ]}
                />
              ))}
              <Text
                className="text-xs ml-2"
                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
              >
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

            {stepConfig.showNext && (
              <TouchableOpacity onPress={handleNext} style={styles.nextButton} activeOpacity={0.8}>
                <Text className="text-white font-sans-semibold text-sm">Got it</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Variant toggle for testing */}
        <VariantToggle />
      </Animated.View>
    </Modal>
  )
}

/**
 * Option A: Polished Minimal - Clean with soft edges
 */
function MinimalOverlay({
  screenWidth,
  screenHeight,
  holeX,
  holeY,
  holeWidth,
  holeHeight,
  isDark,
}: {
  screenWidth: number
  screenHeight: number
  holeX: number
  holeY: number
  holeWidth: number
  holeHeight: number
  isDark: boolean
}) {
  return (
    <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFill}>
      <Defs>
        <Mask id="spotlight-mask">
          <Rect width={screenWidth} height={screenHeight} fill="white" />
          <Rect
            x={holeX}
            y={holeY}
            width={holeWidth}
            height={holeHeight}
            rx={16}
            ry={16}
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
  )
}

/**
 * Option B: Glassmorphism - Premium with blur and glow
 */
function GlassOverlay({
  screenWidth,
  screenHeight,
  holeCenterX,
  holeCenterY,
  holeRadius,
  holeWidth,
  holeHeight,
  holeX,
  holeY,
  isDark,
}: {
  screenWidth: number
  screenHeight: number
  holeCenterX: number
  holeCenterY: number
  holeRadius: number
  holeWidth: number
  holeHeight: number
  holeX: number
  holeY: number
  isDark: boolean
}) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Blur background */}
      <Animated.View style={StyleSheet.absoluteFill} entering={FadeIn.duration(300)}>
        <BlurView
          intensity={isDark ? 20 : 15}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* SVG mask with radial gradient for soft edges */}
      <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id="spotlight-gradient"
            cx={holeCenterX}
            cy={holeCenterY}
            rx={holeRadius * 1.5}
            ry={holeRadius * 1.5}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="black" stopOpacity="1" />
            <Stop offset="0.6" stopColor="black" stopOpacity="1" />
            <Stop offset="1" stopColor="black" stopOpacity="0" />
          </RadialGradient>
          <Mask id="glass-mask">
            <Rect width={screenWidth} height={screenHeight} fill="white" />
            <Circle
              cx={holeCenterX}
              cy={holeCenterY}
              r={holeRadius * 1.3}
              fill="url(#spotlight-gradient)"
            />
          </Mask>
        </Defs>
        <Rect
          width={screenWidth}
          height={screenHeight}
          fill={isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(0, 0, 0, 0.5)'}
          mask="url(#glass-mask)"
        />
      </Svg>

      {/* Glow ring around target */}
      <View
        style={[
          styles.glowRing,
          {
            left: holeX - 2,
            top: holeY - 2,
            width: holeWidth + 4,
            height: holeHeight + 4,
          },
        ]}
      />
    </View>
  )
}

/**
 * Floating toggle to switch between variants
 */
function VariantToggle() {
  const { spotlightVariant, setSpotlightVariant } = useTutorialStore()

  return (
    <View style={styles.variantToggle}>
      <TouchableOpacity
        onPress={() => setSpotlightVariant('minimal')}
        style={[
          styles.variantButton,
          spotlightVariant === 'minimal' && styles.variantButtonActive,
        ]}
      >
        <Text
          style={[
            styles.variantButtonText,
            spotlightVariant === 'minimal' && styles.variantButtonTextActive,
          ]}
        >
          A
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setSpotlightVariant('glass')}
        style={[
          styles.variantButton,
          spotlightVariant === 'glass' && styles.variantButtonActive,
        ]}
      >
        <Text
          style={[
            styles.variantButtonText,
            spotlightVariant === 'glass' && styles.variantButtonTextActive,
          ]}
        >
          B
        </Text>
      </TouchableOpacity>
    </View>
  )
}

function calculateTooltipPosition(
  position: 'above' | 'below' | 'center',
  measurement: TutorialTargetMeasurement,
  screenWidth: number,
  screenHeight: number
): { top?: number; bottom?: number; left: number; right: number } {
  const MARGIN = 20
  const TOOLTIP_OFFSET = 24

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
  container: {
    flex: 1,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 0,
  },
  tooltipMinimal: {
    position: 'absolute',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  tooltipGlass: {
    position: 'absolute',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  tooltipAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#a855f7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  variantToggle: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 20,
    padding: 4,
    gap: 4,
  },
  variantButton: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantButtonActive: {
    backgroundColor: '#a855f7',
  },
  variantButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  variantButtonTextActive: {
    color: '#ffffff',
  },
})
