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
import { useCreateBetaFeedback, type FeedbackCategory } from '~/hooks/useBetaFeedback'
import {
  CategoryGrid,
  SubjectField,
  FormTextArea,
  InfoBanner,
  FormSuccessState,
} from '~/components/forms'
import { useScreenTracking } from '~/hooks/useScreenTracking'

// Category configuration
const FEEDBACK_CATEGORIES = [
  { id: 'bug_report' as FeedbackCategory, label: 'Bug Report', icon: Bug },
  { id: 'feature_idea' as FeedbackCategory, label: 'Feature Idea', icon: Lightbulb },
  { id: 'what_i_love' as FeedbackCategory, label: 'What I Love', icon: Heart },
  { id: 'general' as FeedbackCategory, label: 'General', icon: MessageCircle },
] as const

const MIN_MESSAGE_LENGTH = 1

export default function FeedbackScreen() {
  useScreenTracking('feedback')
  const insets = useSafeAreaInsets()
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary
  const createFeedback = useCreateBetaFeedback()

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success'>('idle')

  // Derived state
  const isValid = selectedCategory !== null && message.trim().length >= MIN_MESSAGE_LENGTH
  const selectedCategoryConfig = FEEDBACK_CATEGORIES.find((c) => c.id === selectedCategory)

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
      Alert.alert('Failed to send feedback', 'Please try again.')
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
        return 'Describe the bug you encountered...'
      case 'feature_idea':
        return 'Tell us about your feature idea...'
      case 'what_i_love':
        return 'Share what you love about Domani...'
      case 'general':
        return 'Share your thoughts with us...'
    }
  }

  // Success State
  if (submitState === 'success') {
    return (
      <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: theme.colors.background }}>
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="pt-6 pb-4">
            <View className="w-14 h-14 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: brandColor }}>
              <MessageCircle size={28} color="#ffffff" />
            </View>
            <Text className="text-2xl font-bold text-content-primary mb-2">
              Share Your Thoughts
            </Text>
            <Text className="text-base text-content-secondary">
              Help us make Domani better! Your feedback shapes our development.
            </Text>
          </View>

          {/* Success Content */}
          <FormSuccessState
            title="Feedback Received!"
            message="Thank you for sharing your thoughts! We've received your message and will review it soon. Your input helps us build a better Domani."
            actionLabel="Submit More Feedback"
            actionIcon={MessageCircle}
            onAction={handleSubmitAnother}
            banner={{
              icon: Heart,
              title: 'We appreciate you!',
              description:
                "Every piece of feedback matters. You're helping shape the future of productivity.",
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
          <View className="w-14 h-14 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: brandColor }}>
            <MessageCircle size={28} color="#ffffff" />
          </View>
          <Text className="text-2xl font-bold text-content-primary mb-2">
            Share Your Thoughts
          </Text>
          <Text className="text-base text-content-secondary">
            Help us make Domani better! Your feedback shapes our development.
          </Text>
        </View>

        {/* Category Selection */}
        <Text className="text-sm text-content-secondary mb-3">
          What would you like to share? <Text className="text-red-500">*</Text>
        </Text>

        <View className="mb-6">
          <CategoryGrid
            categories={FEEDBACK_CATEGORIES}
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
          label="Your Message"
          value={message}
          onChange={setMessage}
          placeholder={selectedCategory ? getPlaceholderText(selectedCategory) : ''}
          disabled={!selectedCategory}
          showClear={true}
          onClear={handleClearMessage}
          minCharacters={MIN_MESSAGE_LENGTH}
          showMinLabel={false}
          disabledMessage="Select a category to start"
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
                Send Feedback
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Beta Tester Banner */}
        <InfoBanner
          icon={Rocket}
          title="You're a Beta Tester!"
          description="Your feedback directly shapes Domani's future. Every submission is read by our team and helps prioritize what we build next."
          variant="purple"
        />

        {/* Bottom Padding */}
        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
