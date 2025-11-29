import React, { useEffect, useMemo } from 'react'
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
} from 'react-native'
import { Link } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, LegalFooter, Text } from '~/components/ui'
import { GradientOrb } from '~/components/ui/GradientOrb'
import { useTheme } from '~/hooks/useTheme'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets()
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  // Use useMemo to create stable animated values
  const titleAnim = useMemo(() => new Animated.Value(0), [])
  const taglineAnim = useMemo(() => new Animated.Value(0), [])
  const ctaAnim = useMemo(() => new Animated.Value(0), [])
  const footerAnim = useMemo(() => new Animated.Value(0), [])

  useEffect(() => {
    const staggerDelay = 150
    const duration = 800

    Animated.stagger(staggerDelay, [
      Animated.timing(titleAnim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(taglineAnim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ctaAnim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [titleAnim, taglineAnim, ctaAnim, footerAnim])

  const createAnimatedStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0],
        }),
      },
    ],
  })

  return (
    <View style={styles.container}>
      {/* Background gradient base */}
      <LinearGradient
        colors={isDark ? ['#0f172a', '#1e1b4b', '#0f172a'] : ['#faf5ff', '#f3e8ff', '#faf5ff']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated gradient orb - positioned in corner away from text */}
      <GradientOrb
        size={SCREEN_HEIGHT * 0.45}
        position="top-right"
        colors={
          isDark
            ? ['#4c1d95', '#7c3aed', '#a855f7', '#c084fc']
            : ['#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed']
        }
      />

      {/* Content overlay - ensures text readability */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(15, 23, 42, 0.3)', 'rgba(15, 23, 42, 0.85)', 'rgba(15, 23, 42, 0.98)']
            : ['rgba(250, 245, 255, 0.3)', 'rgba(250, 245, 255, 0.85)', 'rgba(250, 245, 255, 0.98)']
        }
        locations={[0, 0.35, 0.55]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Main content */}
      <View style={[styles.content, { paddingTop: insets.top + 120 }]}>
        {/* Brand section - no icon, just text */}
        <View style={styles.brandSection}>
          {/* App name - using RNText directly to avoid line-height clipping from Text component */}
          <Animated.View style={createAnimatedStyle(titleAnim)}>
            <RNText style={[styles.appName, { color: isDark ? '#a855f7' : '#7c3aed' }]}>
              Domani
            </RNText>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={[styles.taglineContainer, createAnimatedStyle(taglineAnim)]}>
            <Text
              style={[
                styles.tagline,
                {
                  color: isDark ? 'rgba(250, 245, 255, 0.8)' : 'rgba(30, 27, 75, 0.8)',
                },
              ]}
            >
              Plan your tomorrow, tonight.
            </Text>
            <Text
              style={[
                styles.taglineSecondary,
                {
                  color: isDark ? 'rgba(250, 245, 255, 0.5)' : 'rgba(30, 27, 75, 0.5)',
                },
              ]}
            >
              Execute with focus.
            </Text>
          </Animated.View>
        </View>

        {/* CTA Section */}
        <View style={[styles.ctaSection, { paddingBottom: insets.bottom + 32 }]}>
          <Animated.View style={[styles.ctaContainer, createAnimatedStyle(ctaAnim)]}>
            {/* Primary CTA */}
            <Link href="/login" asChild>
              <Button
                variant="primary"
                size="lg"
                onPress={() => {}}
                className="w-full"
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Start Planning</Text>
              </Button>
            </Link>

            {/* Secondary link */}
            <Link href="/login" asChild>
              <TouchableOpacity style={styles.secondaryLink} activeOpacity={0.7}>
                <Text
                  style={[
                    styles.secondaryLinkText,
                    { color: isDark ? 'rgba(250, 245, 255, 0.6)' : 'rgba(30, 27, 75, 0.6)' },
                  ]}
                >
                  Already have an account?{' '}
                </Text>
                <Text
                  style={[styles.secondaryLinkHighlight, { color: isDark ? '#f59e0b' : '#d97706' }]}
                >
                  Sign in
                </Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={createAnimatedStyle(footerAnim)}>
            <LegalFooter />
          </Animated.View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  brandSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  appName: {
    fontSize: 52,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
  },
  taglineContainer: {
    marginTop: 20,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  taglineSecondary: {
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  ctaSection: {
    width: '100%',
  },
  ctaContainer: {
    width: '100%',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#1f1f1f',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  secondaryLinkText: {
    fontSize: 15,
    fontWeight: '400',
  },
  secondaryLinkHighlight: {
    fontSize: 15,
    fontWeight: '600',
  },
})
