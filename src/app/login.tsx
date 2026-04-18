import React, { useState } from 'react'
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LegalFooter, Text } from '~/components/ui'
import { SocialButton } from '~/components/ui/SocialButton'
import { useAuth } from '~/hooks/useAuth'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useScreenTracking } from '~/hooks/useScreenTracking'

const PUBLIC_LIFETIME_PRICE_COPY = {
  early_adopter: '$9.99',
  standard: '$34.99',
} as const

type PublicPricingTier = keyof typeof PUBLIC_LIFETIME_PRICE_COPY

function getLoginPricingTier(): PublicPricingTier {
  // Friends & family pricing is intentionally excluded from public login copy.
  // New users are still on the public early-adopter offer for now.
  return 'early_adopter'
}

export default function LoginScreen() {
  useScreenTracking('login')
  const router = useRouter()
  const { mode } = useLocalSearchParams<{ mode?: 'new' | 'returning' }>()
  const insets = useSafeAreaInsets()
  const { signInWithGoogle, signInWithApple } = useAuth()
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  // Determine if this is a new user or returning user
  const isNewUser = mode === 'new'
  const lifetimePrice = PUBLIC_LIFETIME_PRICE_COPY[getLoginPricingTier()]

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Background glow - top right sage gradient, matching welcome.tsx */}
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

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 28,
            paddingBottom: insets.bottom + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.headerSection}>
            {isNewUser && (
              <View
                style={[
                  styles.offerBadge,
                  {
                    backgroundColor: `${theme.colors.brand.primary}14`,
                    borderColor: `${theme.colors.brand.primary}22`,
                  },
                ]}
              >
                <Text style={[styles.offerBadgeText, { color: brandColor }]}>
                  14 days free, then yours forever
                </Text>
              </View>
            )}

            <RNText style={[styles.title, { color: brandColor }]}>
              {isNewUser ? 'Start your 14-day free trial' : 'Welcome Back'}
            </RNText>

            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              {isNewUser
                ? `Full access for 14 days. Then ${lifetimePrice} once for lifetime access.`
                : 'Sign in to continue planning your tomorrow.'}
            </Text>

            {isNewUser && (
              <View style={styles.offerPillsRow}>
                <View
                  style={[
                    styles.offerPill,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border.primary,
                    },
                  ]}
                >
                  <Text style={[styles.offerPillLabel, { color: theme.colors.text.primary }]}>
                    14 days free
                  </Text>
                </View>
                <View
                  style={[
                    styles.offerPill,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border.primary,
                    },
                  ]}
                >
                  <Text style={[styles.offerPillLabel, { color: theme.colors.text.primary }]}>
                    Then {lifetimePrice} once
                  </Text>
                </View>
              </View>
            )}

            {isNewUser && (
              <View
                style={[
                  styles.trialCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border.secondary,
                  },
                ]}
              >
                <Text style={[styles.trialCardTitle, { color: theme.colors.text.primary }]}>
                  Signing up starts your free trial immediately.
                </Text>
                <Text style={[styles.trialCardBody, { color: theme.colors.text.secondary }]}>
                  No credit card required. Try every feature first, then decide if you want
                  lifetime access.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footerSection}>
            <View style={styles.buttonsSection}>
              {Platform.OS === 'ios' && (
                <SocialButton
                  provider="apple"
                  onPress={handleAppleSignIn}
                  loading={appleLoading}
                  label={isNewUser ? 'Start Free Trial with Apple' : undefined}
                />
              )}

              <SocialButton
                provider="google"
                onPress={handleGoogleSignIn}
                loading={googleLoading}
                label={isNewUser ? 'Start Free Trial with Google' : undefined}
              />
            </View>

            <View style={styles.legalSection}>
              <LegalFooter />

              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Text style={[styles.backButtonText, { color: theme.colors.text.tertiary }]}>
                  ← Back
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 432,
    alignSelf: 'center',
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 12,
  },
  offerBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 22,
  },
  offerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  title: {
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 46,
    maxWidth: 320,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 24,
    marginTop: 14,
    maxWidth: 332,
  },
  offerPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  offerPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  offerPillLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  trialCard: {
    width: '100%',
    marginTop: 20,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  trialCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 8,
  },
  trialCardBody: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 21,
    letterSpacing: 0.2,
  },
  footerSection: {
    marginTop: 'auto',
    paddingTop: 28,
  },
  buttonsSection: {
    width: '100%',
    gap: 14,
  },
  legalSection: {
    marginTop: 28,
  },
  backButton: {
    marginTop: 22,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
})
