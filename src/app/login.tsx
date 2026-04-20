import React, { useState } from 'react'
import {
  Alert,
  Modal,
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
import { useTranslation } from '~/hooks/useTranslation'
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
  const { t } = useTranslation()
  const { publicPricing, hasFetchedConfig } = useAppConfig()
  const brandColor = theme.colors.brand.primary

  // Determine if this is a new user or returning user
  const isNewUser = mode === 'new'
  const lifetimePrice = hasFetchedConfig ? PUBLIC_LIFETIME_PRICE_COPY[publicPricing] : null

  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [trialConfirmProvider, setTrialConfirmProvider] = useState<'google' | 'apple' | null>(null)

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true)
      await signInWithGoogle()
      router.replace('/')
    } catch (error) {
      Alert.alert(
        t('auth.errors.signInTitle'),
        error instanceof Error ? error.message : t('auth.errors.googleFallback'),
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
        t('auth.errors.signInTitle'),
        error instanceof Error ? error.message : t('auth.errors.appleFallback'),
      )
    } finally {
      setAppleLoading(false)
    }
  }

  const closeTrialConfirmation = () => {
    if (googleLoading || appleLoading) return
    setTrialConfirmProvider(null)
  }

  const handleProviderPress = (provider: 'google' | 'apple') => {
    if (!isNewUser) {
      if (provider === 'apple') {
        void handleAppleSignIn()
      } else {
        void handleGoogleSignIn()
      }
      return
    }

    setTrialConfirmProvider(provider)
  }

  const handleTrialConfirmation = () => {
    const provider = trialConfirmProvider
    setTrialConfirmProvider(null)

    if (provider === 'apple') {
      void handleAppleSignIn()
      return
    }

    void handleGoogleSignIn()
  }

  const trialConfirmLabel =
    trialConfirmProvider === 'apple'
      ? t('auth.login.continueWithApple')
      : t('auth.login.continueWithGoogle')

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
                <View style={[styles.offerEyebrow]}>
                  <Text style={[styles.offerEyebrowText, { color: brandColor }]}>
                    {t('auth.login.newUserEyebrow')}
                  </Text>
                </View>

                <RNText style={[styles.title, styles.titleCompact, { color: brandColor }]}>
                  {t('auth.login.newUserTitle')}
                </RNText>

                <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                  {t('auth.login.newUserSubtitle')}
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
                        {t('auth.login.stepStartLabel')}
                      </Text>
                      <Text style={[styles.stepBody, { color: theme.colors.text.secondary }]}>
                        {t('auth.login.stepStartBody')}
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
                          ? t('auth.login.stepKeepLabelWithPrice', { price: lifetimePrice })
                          : t('auth.login.stepKeepLabelFallback')}
                      </Text>
                      <Text style={[styles.stepBody, { color: theme.colors.text.secondary }]}>
                        {t('auth.login.stepKeepBody')}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.offerEyebrow}>
                  <Text style={[styles.offerEyebrowText, { color: brandColor }]}>
                    {t('auth.login.returningEyebrow')}
                  </Text>
                </View>

                <RNText style={[styles.title, styles.titleCompact, { color: brandColor }]}>
                  {t('auth.login.returningTitle')}
                </RNText>

                <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                  {t('auth.login.returningSubtitle')}
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
                    {t('auth.login.returningCardTitle')}
                  </Text>
                  <Text style={[styles.returningCardBody, { color: theme.colors.text.secondary }]}>
                    {t('auth.login.returningCardBody')}
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
                  onPress={() => handleProviderPress('apple')}
                  loading={appleLoading}
                  label={
                    isNewUser
                      ? t('auth.login.startTrialWithApple')
                      : t('auth.login.continueWithApple')
                  }
                />
              )}

              <SocialButton
                provider="google"
                onPress={() => handleProviderPress('google')}
                loading={googleLoading}
                label={
                  isNewUser
                    ? t('auth.login.startTrialWithGoogle')
                    : t('auth.login.continueWithGoogle')
                }
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
                  {t('auth.login.back')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={trialConfirmProvider !== null}
        transparent
        animationType="fade"
        onRequestClose={closeTrialConfirmation}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border.primary,
              },
            ]}
          >
            <Text style={[styles.modalEyebrow, { color: brandColor }]}>
              {t('auth.login.trialConfirmEyebrow')}
            </Text>

            <RNText style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              {t('auth.login.trialConfirmTitle')}
            </RNText>

            <Text style={[styles.modalBody, { color: theme.colors.text.secondary }]}>
              {t('auth.login.trialConfirmBody')}
            </Text>

            <View style={styles.modalPoints}>
              <View style={styles.modalPointRow}>
                <View
                  style={[
                    styles.modalPointDot,
                    { backgroundColor: `${theme.colors.brand.primary}20` },
                  ]}
                />
                <Text style={[styles.modalPointText, { color: theme.colors.text.secondary }]}>
                  {t('auth.login.trialConfirmPointTrial')}
                </Text>
              </View>

              <View style={styles.modalPointRow}>
                <View
                  style={[
                    styles.modalPointDot,
                    { backgroundColor: `${theme.colors.brand.primary}20` },
                  ]}
                />
                <Text style={[styles.modalPointText, { color: theme.colors.text.secondary }]}>
                  {lifetimePrice
                    ? t('auth.login.trialConfirmPointLifetimeWithPrice', {
                        price: lifetimePrice,
                      })
                    : t('auth.login.trialConfirmPointLifetimeFallback')}
                </Text>
              </View>

              <View style={styles.modalPointRow}>
                <View
                  style={[
                    styles.modalPointDot,
                    { backgroundColor: `${theme.colors.brand.primary}20` },
                  ]}
                />
                <Text style={[styles.modalPointText, { color: theme.colors.text.secondary }]}>
                  {t('auth.login.trialConfirmPointNoCard')}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={closeTrialConfirmation}
                disabled={googleLoading || appleLoading}
                activeOpacity={0.8}
                style={[styles.modalSecondaryButton, { backgroundColor: theme.colors.background }]}
              >
                <Text
                  style={[styles.modalSecondaryButtonText, { color: theme.colors.text.primary }]}
                >
                  {t('auth.login.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTrialConfirmation}
                disabled={googleLoading || appleLoading}
                activeOpacity={0.85}
                style={[
                  styles.modalPrimaryButton,
                  { backgroundColor: brandColor, opacity: googleLoading || appleLoading ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.modalPrimaryButtonText}>{trialConfirmLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(41, 48, 44, 0.36)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 26,
  },
  modalEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    textAlign: 'center',
    marginTop: 12,
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
  },
  modalPoints: {
    gap: 12,
    marginTop: 22,
  },
  modalPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  modalPointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  modalPointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  modalActions: {
    gap: 10,
    marginTop: 24,
  },
  modalSecondaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
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
