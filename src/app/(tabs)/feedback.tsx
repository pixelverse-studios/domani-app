import React, { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MessageCircle, Bug, Lightbulb, Heart, Rocket, Send } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useCreateFeedback, type FeedbackCategory } from '~/hooks/useFeedback'
import { useSubscriptionStatus } from '~/hooks/useSubscription'
import { useTranslation } from '~/hooks/useTranslation'
import { getMainScreenCopy } from '~/i18n/mainScreenCopy'
import {
  CategoryGrid,
  SubjectField,
  FormTextArea,
  InfoBanner,
  FormSuccessState,
} from '~/components/forms'
import { useScreenTracking } from '~/hooks/useScreenTracking'

// Category configuration
const MIN_MESSAGE_LENGTH = 1

export default function FeedbackScreen() {
  useScreenTracking('feedback')
  const insets = useSafeAreaInsets()
  const theme = useAppTheme()
  const { locale } = useTranslation()
  const copy = getMainScreenCopy(locale)
  const brandColor = theme.colors.brand.primary
  const createFeedback = useCreateFeedback()
  // Lightweight read-only status — avoids spinning up a second AppState
  // listener / trial timer just to check for the beta banner.
  const { status: subscriptionStatus } = useSubscriptionStatus()

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success'>('idle')

  const feedbackCategories = [
    { id: 'bug_report' as FeedbackCategory, label: copy.feedback.categories.bugReport, icon: Bug },
    {
      id: 'feature_idea' as FeedbackCategory,
      label: copy.feedback.categories.featureIdea,
      icon: Lightbulb,
    },
    {
      id: 'what_i_love' as FeedbackCategory,
      label: copy.feedback.categories.whatILove,
      icon: Heart,
    },
    { id: 'general' as FeedbackCategory, label: copy.feedback.categories.general, icon: MessageCircle },
  ] as const

  // Derived state
  const isValid = selectedCategory !== null && message.trim().length >= MIN_MESSAGE_LENGTH
  const selectedCategoryConfig = feedbackCategories.find((c) => c.id === selectedCategory)

  // Colors
  const textSecondary = theme.colors.text.secondary

  const handleClearCategory = () => {
    setSelectedCategory(null)
  }

  const handleClearMessage = () => {
    setMessage('')
  }

  const handleSubmit = async () => {
    if (!isValid || !selectedCategory) return

    setSubmitState('submitting')
    try {
      await createFeedback.mutateAsync({
        category: selectedCategory,
        message: message.trim(),
      })
      setSubmitState('success')
    } catch (error) {
      setSubmitState('idle')
      console.error('Failed to submit feedback:', error)
      Alert.alert(copy.feedback.submitErrorTitle, copy.feedback.submitErrorMessage)
    }
  }

  const handleSubmitAnother = () => {
    setSelectedCategory(null)
    setMessage('')
    setSubmitState('idle')
  }

  // Helper to get placeholder text based on category
  const getPlaceholderText = (category: FeedbackCategory): string => {
    switch (category) {
      case 'bug_report':
        return copy.feedback.placeholders.bugReport
      case 'feature_idea':
        return copy.feedback.placeholders.featureIdea
      case 'what_i_love':
        return copy.feedback.placeholders.whatILove
      case 'general':
        return copy.feedback.placeholders.general
    }
  }

  // Success State
  if (submitState === 'success') {
    return (
      <View
        className="flex-1"
        style={{ paddingTop: insets.top, backgroundColor: theme.colors.background }}
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="pt-6 pb-4">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: brandColor }}
            >
              <MessageCircle size={28} color="#ffffff" />
            </View>
            <Text className="text-2xl font-bold text-content-primary mb-2">
              {copy.feedback.title}
            </Text>
            <Text className="text-base text-content-secondary">
              {copy.feedback.subtitle}
            </Text>
          </View>

          {/* Success Content */}
          <FormSuccessState
            title={copy.feedback.successTitle}
            message={copy.feedback.successMessage}
            actionLabel={copy.feedback.successAction}
            actionIcon={MessageCircle}
            onAction={handleSubmitAnother}
            banner={{
              icon: Heart,
              title: copy.feedback.appreciationTitle,
              description: copy.feedback.appreciationMessage,
            }}
          />

          {/* Bottom Padding */}
          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      </View>
    )
  }

  // Form State
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ paddingTop: insets.top, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="pt-6 pb-6">
          <View
            className="w-14 h-14 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: brandColor }}
          >
            <MessageCircle size={28} color="#ffffff" />
          </View>
          <Text className="text-2xl font-bold text-content-primary mb-2">{copy.feedback.title}</Text>
          <Text className="text-base text-content-secondary">
            {copy.feedback.subtitle}
          </Text>
        </View>

        {/* Category Selection */}
        <Text className="text-sm text-content-secondary mb-3">
          {copy.feedback.categoryPrompt} <Text className="text-red-500">*</Text>
        </Text>

        <View className="mb-6">
          <CategoryGrid
            categories={feedbackCategories}
            selectedId={selectedCategory}
            onSelect={(id) => setSelectedCategory(id as FeedbackCategory)}
          />
        </View>

        {/* Subject Field (only shown when category selected) */}
        {selectedCategory && selectedCategoryConfig && (
          <SubjectField
            icon={selectedCategoryConfig.icon}
            label={selectedCategoryConfig.label}
            onClear={handleClearCategory}
          />
        )}

        {/* Message Field */}
        <FormTextArea
          label={copy.feedback.messageLabel}
          value={message}
          onChange={setMessage}
          placeholder={selectedCategory ? getPlaceholderText(selectedCategory) : ''}
          disabled={!selectedCategory}
          showClear={true}
          onClear={handleClearMessage}
          minCharacters={MIN_MESSAGE_LENGTH}
          showMinLabel={false}
          disabledMessage={copy.feedback.disabledMessage}
        />

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isValid || submitState === 'submitting'}
          activeOpacity={0.8}
          className="py-4 rounded-xl flex-row items-center justify-center mt-6 mb-4"
          style={{ backgroundColor: isValid ? brandColor : theme.colors.interactive.hover }}
        >
          {submitState === 'submitting' ? (
            <ActivityIndicator color={isValid ? '#ffffff' : textSecondary} />
          ) : (
            <>
              <Send size={18} color={isValid ? '#ffffff' : textSecondary} />
              <Text
                className={`font-semibold text-base ml-2 ${
                  isValid ? 'text-white' : 'text-content-tertiary'
                }`}
              >
                {copy.feedback.submit}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Beta Tester Banner — only shown while the app is in a beta phase.
            Gated via the subscription state machine (DEV-696) so the check is
            consistent with how other beta-specific UI is gated elsewhere. */}
        {subscriptionStatus === 'beta' && (
          <InfoBanner
            icon={Rocket}
            title={copy.feedback.betaTitle}
            description={copy.feedback.betaDescription}
            variant="purple"
          />
        )}

        {/* Bottom Padding */}
        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
