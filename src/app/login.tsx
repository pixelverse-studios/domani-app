import React, { useState } from 'react'
import { Alert, StyleSheet, Text as RNText, View } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LegalFooter, Text } from '~/components/ui'
import { SocialButton } from '~/components/ui/SocialButton'
import { GradientOrb } from '~/components/ui/GradientOrb'
import { useAuth } from '~/hooks/useAuth'
import { useTheme } from '~/hooks/useTheme'

export default function LoginScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signInWithGoogle, signInWithApple } = useAuth()
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true)
      await signInWithGoogle()
      router.replace('/')
    } catch (error) {
      Alert.alert(
        'Sign In Error',
        error instanceof Error ? error.message : 'Failed to sign in with Google',
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    try {
      setAppleLoading(true)
      await signInWithApple()
      router.replace('/')
    } catch (error) {
      Alert.alert(
        'Sign In Error',
        error instanceof Error ? error.message : 'Failed to sign in with Apple',
      )
    } finally {
      setAppleLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={isDark ? ['#0f172a', '#1e1b4b', '#0f172a'] : ['#faf5ff', '#f3e8ff', '#faf5ff']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle animated orb */}
      <GradientOrb
        size={300}
        position="top-right"
        colors={
          isDark
            ? ['#4c1d95', '#7c3aed', '#a855f7', '#c4b5fd']
            : ['#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6']
        }
      />

      {/* Content overlay gradient */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(15, 23, 42, 0.3)', 'rgba(15, 23, 42, 0.8)', 'rgba(15, 23, 42, 0.95)']
            : ['rgba(250, 245, 255, 0.3)', 'rgba(250, 245, 255, 0.8)', 'rgba(250, 245, 255, 0.95)']
        }
        locations={[0, 0.3, 0.6]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Main content */}
      <View style={[styles.content, { paddingTop: insets.top + 120 }]}>
        {/* Header section - no icon, just text */}
        <View style={styles.headerSection}>
          {/* Title - using RNText to avoid line-height clipping */}
          <RNText style={[styles.title, { color: isDark ? '#a855f7' : '#7c3aed' }]}>
            Welcome Back
          </RNText>

          <Text
            style={[
              styles.subtitle,
              { color: isDark ? 'rgba(250, 245, 255, 0.6)' : 'rgba(30, 27, 75, 0.6)' },
            ]}
          >
            Sign in to continue planning your tomorrow
          </Text>
        </View>

        {/* Sign in buttons section */}
        <View style={[styles.buttonsSection, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.buttonsContainer}>
            {/* Sign in with Apple - first per iOS guidelines */}
            <SocialButton provider="apple" onPress={handleAppleSignIn} loading={appleLoading} />

            {/* Sign in with Google */}
            <SocialButton provider="google" onPress={handleGoogleSignIn} loading={googleLoading} />
          </View>

          {/* Divider with "or" */}
          <View style={styles.dividerContainer}>
            <View
              style={[
                styles.dividerLine,
                {
                  backgroundColor: isDark ? 'rgba(250, 245, 255, 0.15)' : 'rgba(30, 27, 75, 0.15)',
                },
              ]}
            />
            <Text
              style={[
                styles.dividerText,
                { color: isDark ? 'rgba(250, 245, 255, 0.4)' : 'rgba(30, 27, 75, 0.4)' },
              ]}
            >
              More options coming soon
            </Text>
            <View
              style={[
                styles.dividerLine,
                {
                  backgroundColor: isDark ? 'rgba(250, 245, 255, 0.15)' : 'rgba(30, 27, 75, 0.15)',
                },
              ]}
            />
          </View>

          {/* Footer */}
          <LegalFooter />
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
  headerSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 24,
  },
  buttonsSection: {
    width: '100%',
  },
  buttonsContainer: {
    width: '100%',
    gap: 14,
    marginBottom: 28,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    paddingHorizontal: 16,
    fontWeight: '400',
  },
})
