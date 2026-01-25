import React, { useEffect, useState } from 'react'
import { View, Modal, Animated, StyleSheet, TouchableOpacity } from 'react-native'
import { Sparkles } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { useTutorialStore } from '~/stores/tutorialStore'

/**
 * Welcome overlay that appears as the first tutorial step.
 * Introduces users to the tutorial and offers a skip option.
 */
export function WelcomeOverlay() {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const { isActive, currentStep, nextStep, skipTutorial, isLoading } = useTutorialStore()

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
    // Animate out then advance
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      nextStep('add_task_button')
    })
  }

  const handleSkip = () => {
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
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              transform: [{ scale }],
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
            <Sparkles size={40} color="#a855f7" />
          </View>

          {/* Title */}
          <Text className="text-2xl font-sans-bold text-slate-900 dark:text-white text-center mb-2">
            Welcome to Domani!
          </Text>

          {/* Description */}
          <Text className="text-base text-slate-600 dark:text-slate-300 text-center mb-6">
            {"Let's walk through how to plan your day. This takes about 2 minutes."}
          </Text>

          {/* Primary Button */}
          <TouchableOpacity
            onPress={handleLetsGo}
            style={styles.primaryButton}
            activeOpacity={0.8}
          >
            <Text className="text-white font-sans-semibold text-base">{"Let's Go"}</Text>
          </TouchableOpacity>

          {/* Skip Link */}
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.6}>
            <Text className="text-slate-500 dark:text-slate-400 text-sm">Skip Tutorial</Text>
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
    backgroundColor: '#a855f7',
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
