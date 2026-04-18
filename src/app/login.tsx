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
import { useAppConfig } from '~/stores/appConfigStore'
import type { PublicPricingTier } from '~/types/appConfig'

const PUBLIC_LIFETIME_PRICE_COPY: Record<PublicPricingTier, string> = {
  early_adopter: '$9.99',
  standard: '$34.99',
}

export default function LoginScreen() {
  useScreenTracking('login')
  const router = useRouter()
  const { mode } = useLocalSearchParams<{ mode?: 'new' | 'returning' }>()
  const insets = useSafeAreaInsets()
  const { signInWithGoogle, signInWithApple } = useAuth()
  const theme = useAppTheme()
  const { publicPricing, hasFetchedConfig } = useAppConfig()
  const brandColor = theme.colors.brand.primary

  // Determine if this is a new user or returning user
  const isNewUser = mode === 'new'
  const lifetimePrice = hasFetchedConfig ? PUBLIC_LIFETIME_PRICE_COPY[publicPricing] : null

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
            {isNewUser ? (
              <>
                <View
                  style={[
                    styles.offerEyebrow,
                  ]}
                >
                  <Text style={[styles.offerEyebrowText, { color: brandColor }]}>
                    Try Domani free before you buy it
                  </Text>
                </View>

                <RNText style={[styles.title, styles.titleCompact, { color: brandColor }]}>
                  Start your 14-day free trial
                </RNText>

                <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                  Full access first. One lifetime purchase only if you want to keep it.
                </Text>

                <View style={styles.stepsStack}>
                  <View
                    style={[
                      styles.stepCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border.primary,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.stepIndex,
                        { backgroundColor: `${theme.colors.brand.primary}18` },
                      ]}
                    >
                      <Text style={[styles.stepIndexText, { color: brandColor }]}>1</Text>
                    </View>
                    <View style={styles.stepCopy}>
                      <Text style={[styles.stepLabel, { color: theme.colors.text.primary }]}>
                        Start free today
                      </Text>
                      <Text style={[styles.stepBody, { color: theme.colors.text.secondary }]}>
                        Your full 14-day trial begins as soon as you sign up.
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.stepCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border.primary,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.stepIndex,
                        { backgroundColor: `${theme.colors.brand.primary}18` },
                      ]}
                    >
                      <Text style={[styles.stepIndexText, { color: brandColor }]}>2</Text>
                    </View>
                    <View style={styles.stepCopy}>
                      <Text style={[styles.stepLabel, { color: theme.colors.text.primary }]}>
                        {lifetimePrice
                          ? `Keep it for ${lifetimePrice} once`
                          : 'Keep it with one lifetime purchase'}
                      </Text>
                      <Text style={[styles.stepBody, { color: theme.colors.text.secondary }]}>
                        No credit card up front. No subscription after the trial.
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.offerEyebrow}>
                  <Text style={[styles.offerEyebrowText, { color: brandColor }]}>
                    Pick up where you left off
                  </Text>
                </View>

                <RNText style={[styles.title, styles.titleCompact, { color: brandColor }]}>
                  Welcome Back
                </RNText>

                <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                  Sign in to continue planning your tomorrow.
                </Text>

                <View
                  style={[
                    styles.returningCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border.primary,
                    },
                  ]}
                >
                  <Text style={[styles.returningCardTitle, { color: theme.colors.text.primary }]}>
                    Your plans are waiting for you.
                  </Text>
                  <Text style={[styles.returningCardBody, { color: theme.colors.text.secondary }]}>
                    Sign in to get back to your tasks, reminders, and momentum.
                  </Text>
                </View>
              </>
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
  offerEyebrow: {
    marginBottom: 22,
  },
  offerEyebrowText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 46,
    maxWidth: 320,
  },
  titleCompact: {
    fontSize: 34,
    lineHeight: 42,
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
  stepsStack: {
    width: '100%',
    gap: 12,
    marginTop: 22,
  },
  stepCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepCopy: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  stepBody: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  returningCard: {
    width: '100%',
    marginTop: 22,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  returningCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 21,
  },
  returningCardBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
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
