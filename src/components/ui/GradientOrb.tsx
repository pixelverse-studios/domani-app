import React, { useEffect, useMemo } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

interface GradientOrbProps {
  size?: number
  colors?: string[]
  position?: 'center' | 'top-right' | 'bottom-left'
}

export const GradientOrb = ({
  size = 400,
  colors = ['#7c3aed', '#a855f7', '#f59e0b', '#fbbf24'],
  position = 'center',
}: GradientOrbProps) => {
  // Use useMemo to create stable animated values
  const pulseAnim = useMemo(() => new Animated.Value(1), [])
  const rotateAnim = useMemo(() => new Animated.Value(0), [])

  useEffect(() => {
    // Breathing pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    )

    // Slow rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )

    pulseAnimation.start()
    rotateAnimation.start()

    return () => {
      pulseAnimation.stop()
      rotateAnimation.stop()
    }
  }, [pulseAnim, rotateAnim])

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const positionStyle = {
    center: {
      top: '30%' as const,
      left: '50%' as const,
      marginLeft: -size / 2,
      marginTop: -size / 2,
    },
    'top-right': { top: -size / 3, right: -size / 3 },
    'bottom-left': { bottom: -size / 3, left: -size / 3 },
  }[position]

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [{ scale: pulseAnim }, { rotate }],
        },
        positionStyle,
      ]}
    >
      {/* Multiple layered gradients for depth */}
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius: size / 2 }]}
      />
      {/* Blur overlay effect */}
      <View
        style={[
          styles.blurOverlay,
          {
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: (size * 1.5) / 2,
            marginLeft: -size * 0.25,
            marginTop: -size * 0.25,
          },
        ]}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 0,
  },
  gradient: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  blurOverlay: {
    position: 'absolute',
    backgroundColor: 'transparent',
    // Creates a soft glow effect
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 100,
    elevation: 0,
  },
})
