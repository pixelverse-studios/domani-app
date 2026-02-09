import React, { useEffect, useMemo } from 'react'
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Path, Circle, G } from 'react-native-svg'
import { useAppTheme } from '~/hooks/useAppTheme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface SplashContentProps {
  showTagline?: boolean
}

/**
 * Domani Splash Screen Content
 *
 * Design concept: "Twilight Luxury"
 * The D monogram represents a horizon with a setting/rising sun (amber) peeking over,
 * capturing the threshold moment between today and tomorrow.
 */
export function SplashContent({ showTagline = true }: SplashContentProps) {
  const theme = useAppTheme()
  const logoAnim = useMemo(() => new Animated.Value(0), [])
  const taglineAnim = useMemo(() => new Animated.Value(0), [])
  const sunAnim = useMemo(() => new Animated.Value(0), [])

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      // Logo fades in and rises
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Sun pulses subtly
      Animated.loop(
        Animated.sequence([
          Animated.timing(sunAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(sunAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start()

    // Tagline comes in separately
    Animated.timing(taglineAnim, {
      toValue: 1,
      duration: 600,
      delay: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [logoAnim, taglineAnim, sunAnim])

  const logoStyle = {
    opacity: logoAnim,
    transform: [
      {
        translateY: logoAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  }

  const taglineStyle = {
    opacity: taglineAnim,
    transform: [
      {
        translateY: taglineAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  }

  // Reserved for future sun pulse animation enhancement
  const _sunOpacity = sunAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  })

  return (
    <View style={styles.container}>
      {/* Gradient background - twilight sky */}
      <LinearGradient
        colors={[theme.colors.text.primary, '#2A3530', '#1E2722']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle ambient glow */}
      <View style={[styles.ambientGlow, { backgroundColor: theme.colors.brand.primary }]} />

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo: "domani" wordmark with gradient */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <Svg width={280} height={72} viewBox="0 0 280 72">
            <Defs>
              <SvgGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={theme.colors.brand.light} />
                <Stop offset="50%" stopColor={theme.colors.brand.primary} />
                <Stop offset="100%" stopColor={theme.colors.brand.dark} />
              </SvgGradient>
            </Defs>
            {/* Custom "domani" letterforms - geometric, slightly rounded, lowercase */}
            {/* d */}
            <Path
              d="M0 56V16h6v14.5c2.5-3.5 6.5-5.5 11.5-5.5 9 0 15.5 7 15.5 16s-6.5 16-15.5 16c-5 0-9-2-11.5-5.5V56H0zm16.5-5c6 0 10-4.5 10-10s-4-10-10-10-10 4.5-10 10 4 10 10 10z"
              fill="url(#textGradient)"
            />
            {/* o */}
            <Path
              d="M52 41c0-9 7-16 16-16s16 7 16 16-7 16-16 16-16-7-16-16zm26 0c0-5.5-4-10-10-10s-10 4.5-10 10 4 10 10 10 10-4.5 10-10z"
              fill="url(#textGradient)"
            />
            {/* m */}
            <Path
              d="M92 56V26h6v4c2-3 5.5-5 10-5 5 0 9 2.5 11 6.5 2.5-4 7-6.5 12.5-6.5 8 0 13.5 5.5 13.5 14v17h-6V40c0-5.5-3.5-9-8.5-9-5.5 0-9.5 4-9.5 10v15h-6V40c0-5.5-3.5-9-8.5-9-5.5 0-9.5 4-9.5 10v15h-5z"
              fill="url(#textGradient)"
            />
            {/* a */}
            <Path
              d="M154 41c0-9 7-16 16-16 10 0 16.5 7.5 16.5 17v2h-27c.5 5.5 5 9.5 11 9.5 4.5 0 8-2 10-5.5l5 3c-3 5-8.5 8-15.5 8-10 0-16-7-16-18zm6-.5h21c-.5-5-4.5-9-10.5-9s-10 4-10.5 9z"
              fill="url(#textGradient)"
            />
            {/* n */}
            <Path
              d="M196 56V26h6v4.5c2.5-3.5 6.5-5.5 11.5-5.5 8.5 0 14 5.5 14 14v17h-6V40c0-6-4-9-9.5-9s-10 4-10 10v15h-6z"
              fill="url(#textGradient)"
            />
            {/* i with amber dot */}
            <Path d="M238 56V26h6v30h-6z" fill="url(#textGradient)" />
            {/* Amber dot on the i - the "sun" */}
            <Circle cx="241" cy="14" r="5" fill="#f59e0b" />
          </Svg>
        </Animated.View>

        {/* Tagline */}
        {showTagline && (
          <Animated.View style={[styles.taglineContainer, taglineStyle]}>
            <Svg width={200} height={20} viewBox="0 0 200 20">
              <Defs>
                <SvgGradient id="taglineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#fbbf24" />
                  <Stop offset="100%" stopColor="#f59e0b" />
                </SvgGradient>
              </Defs>
              {/* "plan tomorrow tonight" in small caps style */}
              <G fill="url(#taglineGradient)" opacity={0.85}>
                {/* Simplified - using text element for tagline */}
              </G>
            </Svg>
            <Animated.Text style={[styles.taglineText, { opacity: taglineAnim }]}>
              plan tomorrow tonight
            </Animated.Text>
          </Animated.View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    marginLeft: -SCREEN_WIDTH * 0.4,
    marginTop: -SCREEN_WIDTH * 0.4,
    borderRadius: SCREEN_WIDTH * 0.4,
    opacity: 0.08,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  taglineText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: '#f59e0b',
  },
})
