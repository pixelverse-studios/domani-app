import React, { useEffect, useMemo } from 'react'
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Link } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GradientText, LegalFooter, Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useScreenTracking } from '~/hooks/useScreenTracking'

export default function WelcomeScreen() {
  useScreenTracking('welcome')
  const insets = useSafeAreaInsets()
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Background glow - top right sage gradient, extends left and down */}
      <LinearGradient
        colors={[
          'rgba(125, 155, 138, 0.2)',
          'rgba(125, 155, 138, 0.1)',
          'rgba(125, 155, 138, 0.03)',
          'transparent',
        ]}
        style={styles.backgroundGlow}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0.1, y: 0.7 }}
      />

      {/* Main content */}
      <View style={[styles.content, { paddingTop: insets.top }]}>
        {/* Brand section - centered vertically */}
        <View style={styles.brandSection}>
          {/* App name with gradient text - pink to purple */}
          <Animated.View style={createAnimatedStyle(titleAnim)}>
            <GradientText
              colors={[theme.colors.brand.primary, theme.colors.brand.dark]}
              style={styles.appName}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              Domani
            </GradientText>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={[styles.taglineContainer, createAnimatedStyle(taglineAnim)]}>
            <Text style={[styles.tagline, { color: theme.colors.text.secondary }]}>
              Plan your tomorrow, tonight.
            </Text>
            <Text style={[styles.taglineSecondary, { color: theme.colors.text.secondary }]}>
              Execute with focus.
            </Text>
          </Animated.View>
        </View>

        {/* CTA Section */}
        <View style={[styles.ctaSection, { paddingBottom: insets.bottom + 32 }]}>
          <Animated.View style={[styles.ctaContainer, createAnimatedStyle(ctaAnim)]}>
            {/* Primary CTA - Gradient button for new users */}
            <Link href="/login?mode=new" asChild>
              <TouchableOpacity activeOpacity={0.8} style={styles.primaryButtonContainer}>
                <LinearGradient
                  colors={[theme.colors.brand.primary, theme.colors.brand.dark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Start Planning</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Link>

            {/* Secondary link for returning users */}
            <Link href="/login?mode=returning" asChild>
              <TouchableOpacity style={styles.secondaryLink} activeOpacity={0.7}>
                <Text style={[styles.secondaryLinkText, { color: theme.colors.text.secondary }]}>
                  Already have an account?{' '}
                </Text>
                <GradientText
                  colors={[theme.colors.brand.primary, theme.colors.brand.dark]}
                  style={styles.secondaryLinkHighlight}
                >
                  Sign in
                </GradientText>
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
  },
  backgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  brandSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  taglineContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  taglineSecondary: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  ctaSection: {
    width: '100%',
  },
  ctaContainer: {
    width: '100%',
    marginBottom: 24,
  },
  primaryButtonContainer: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: '#FFFFFF',
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
