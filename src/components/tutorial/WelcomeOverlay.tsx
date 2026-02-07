import React, { useEffect, useState } from 'react'
import { View, Modal, Animated, StyleSheet, TouchableOpacity } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { router } from 'expo-router'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useTutorialAnalytics } from '~/hooks/useTutorialAnalytics'
import { useTutorialStore } from '~/stores/tutorialStore'

/**
 * Welcome overlay that appears as the first tutorial step.
 * Introduces users to the tutorial and offers a skip option.
 */
export function WelcomeOverlay() {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary
  const { isActive, currentStep, nextStep, skipTutorial, isLoading, abandonCount } =
    useTutorialStore()
  const { trackTutorialStarted, trackTutorialSkipped } = useTutorialAnalytics()

  // Show different messaging after multiple abandons
  const hasAbandonedMultipleTimes = abandonCount >= 3

  // Animation values
  const [opacity] = useState(() => new Animated.Value(0))
  const [scale] = useState(() => new Animated.Value(0.8))

  // Don't show while loading from database
  const isVisible = !isLoading && isActive && currentStep === 'welcome'

  useEffect(() => {
    if (isVisible) {
      // Reset values when becoming visible
      opacity.setValue(0)
      scale.setValue(0.8)

      // Animate in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [isVisible, opacity, scale])

  const handleLetsGo = () => {
    // Track tutorial start - intentionally here (not in initializeTutorialState) to capture
    // explicit user engagement rather than passive welcome screen exposure
    trackTutorialStarted('onboarding')

    // Navigate to Today screen first, then advance tutorial
    // This ensures the target elements are mounted before spotlight tries to measure them
    router.replace('/(tabs)/')

    // Animate out and advance step after navigation starts
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      nextStep('plan_today_button')
    })
  }

  const handleSkip = () => {
    // Track skip from welcome
    trackTutorialSkipped('welcome')

    // Animate out then skip
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      skipTutorial()
    })
  }

  if (!isVisible) return null

  return (
    <Modal visible transparent animationType="none">
      <Animated.View style={[styles.container, { opacity }]}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              transform: [{ scale }],
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${brandColor}26` }]}>
            <Sparkles size={40} color={brandColor} />
          </View>

          {/* Title */}
          <Text className="text-2xl font-sans-bold text-content-primary text-center mb-2">
            {hasAbandonedMultipleTimes ? 'Ready to Continue?' : 'Welcome to Domani!'}
          </Text>

          {/* Description */}
          <Text className="text-base text-content-secondary text-center mb-6">
            {hasAbandonedMultipleTimes
              ? "No pressure! You can skip the tour and explore on your own, or we can walk through it together."
              : "Let's walk through how to plan your day. This takes about 2 minutes."}
          </Text>

          {/* Primary Button */}
          <TouchableOpacity
            onPress={handleLetsGo}
            style={[styles.primaryButton, { backgroundColor: brandColor }]}
            activeOpacity={0.8}
          >
            <Text className="text-white font-sans-semibold text-base">
              {hasAbandonedMultipleTimes ? 'Show Me Around' : "Let's Go"}
            </Text>
          </TouchableOpacity>

          {/* Skip Link */}
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.6}>
            <Text className="text-content-tertiary text-sm">
              {hasAbandonedMultipleTimes ? "I'll Explore on My Own" : 'Skip Tutorial'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  skipButton: {
    paddingVertical: 8,
  },
})
