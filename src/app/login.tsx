import React, { useState } from 'react'
import { Alert, Platform, StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LegalFooter, Text } from '~/components/ui'
import { SocialButton } from '~/components/ui/SocialButton'
import { useAuth } from '~/hooks/useAuth'
import { useTheme } from '~/hooks/useTheme'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { colors } from '~/theme'

export default function LoginScreen() {
  useScreenTracking('login')
  const router = useRouter()
  const { mode } = useLocalSearchParams<{ mode?: 'new' | 'returning' }>()
  const insets = useSafeAreaInsets()
  const { signInWithGoogle, signInWithApple } = useAuth()
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  // Determine if this is a new user or returning user
  const isNewUser = mode === 'new'

  // Theme-aware colors (matching welcome.tsx)
  const themeColors = {
    background: isDark ? colors.background.dark : colors.background.light,
    glowOpacity: isDark ? 0.35 : 0.2,
  }

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
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Background glow - top right purple gradient, matching welcome.tsx */}
      <LinearGradient
        colors={[
          `rgba(${colors.brand.gradientStartRgb}, ${themeColors.glowOpacity})`,
          `rgba(${colors.brand.gradientStartRgb}, ${themeColors.glowOpacity * 0.5})`,
          `rgba(${colors.brand.gradientStartRgb}, ${themeColors.glowOpacity * 0.15})`,
          'transparent',
        ]}
        style={styles.backgroundGlow}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0.1, y: 0.7 }}
      />

      {/* Main content */}
      <View style={[styles.content, { paddingTop: insets.top + 120 }]}>
        {/* Header section - no icon, just text */}
        <View style={styles.headerSection}>
          {/* Title - using RNText to avoid line-height clipping */}
          <RNText style={[styles.title, { color: isDark ? '#a855f7' : '#7c3aed' }]}>
            {isNewUser ? "Let's Get Started" : 'Welcome Back'}
          </RNText>

          <Text
            style={[
              styles.subtitle,
              { color: isDark ? 'rgba(250, 245, 255, 0.6)' : 'rgba(30, 27, 75, 0.6)' },
            ]}
          >
            {isNewUser
              ? 'Create an account to start planning\nyour tomorrow'
              : 'Sign in to continue planning\nyour tomorrow'}
          </Text>
        </View>

        {/* Sign in buttons section */}
        <View style={[styles.buttonsSection, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.buttonsContainer}>
            {/* Sign in with Apple - first per iOS guidelines, only shown on iOS */}
            {Platform.OS === 'ios' && (
              <SocialButton provider="apple" onPress={handleAppleSignIn} loading={appleLoading} />
            )}

            {/* Sign in with Google */}
            <SocialButton provider="google" onPress={handleGoogleSignIn} loading={googleLoading} />
          </View>

          {/* Footer */}
          <LegalFooter />

          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.backButtonText,
                { color: isDark ? 'rgba(250, 245, 255, 0.5)' : 'rgba(30, 27, 75, 0.5)' },
              ]}
            >
              ← Back
            </Text>
          </TouchableOpacity>
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
  headerSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  backButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
})
