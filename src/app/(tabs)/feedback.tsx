import React, { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MessageCircle, Bug, Lightbulb, Heart, Rocket, Send } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { useCreateBetaFeedback, type FeedbackCategory } from '~/hooks/useBetaFeedback'
import {
  CategoryGrid,
  SubjectField,
  FormTextArea,
  InfoBanner,
  FormSuccessState,
} from '~/components/forms'

// Category configuration
const FEEDBACK_CATEGORIES = [
  { id: 'bug_report' as FeedbackCategory, label: 'Bug Report', icon: Bug },
  { id: 'feature_idea' as FeedbackCategory, label: 'Feature Idea', icon: Lightbulb },
  { id: 'what_i_love' as FeedbackCategory, label: 'What I Love', icon: Heart },
  { id: 'general' as FeedbackCategory, label: 'General', icon: MessageCircle },
] as const

const MIN_MESSAGE_LENGTH = 1

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets()
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const createFeedback = useCreateBetaFeedback()

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success'>('idle')

  // Derived state
  const isValid = selectedCategory !== null && message.trim().length >= MIN_MESSAGE_LENGTH
  const selectedCategoryConfig = FEEDBACK_CATEGORIES.find((c) => c.id === selectedCategory)

  // Colors
  const colors = {
    textSecondary: isDark ? '#94a3b8' : '#64748b',
  }

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
      <View className="flex-1 bg-white dark:bg-slate-950" style={{ paddingTop: insets.top }}>
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="pt-6 pb-4">
            <View className="w-14 h-14 rounded-full bg-purple-500 items-center justify-center mb-4">
              <MessageCircle size={28} color="#ffffff" />
            </View>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Share Your Thoughts
            </Text>
            <Text className="text-base text-slate-500 dark:text-slate-400">
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
      className="flex-1 bg-white dark:bg-slate-950"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="pt-6 pb-6">
          <View className="w-14 h-14 rounded-full bg-purple-500 items-center justify-center mb-4">
            <MessageCircle size={28} color="#ffffff" />
          </View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Share Your Thoughts
          </Text>
          <Text className="text-base text-slate-500 dark:text-slate-400">
            Help us make Domani better! Your feedback shapes our development.
          </Text>
        </View>

        {/* Category Selection */}
        <Text className="text-sm text-slate-600 dark:text-slate-300 mb-3">
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
          className={`py-4 rounded-xl flex-row items-center justify-center mt-6 mb-4 ${
            isValid ? 'bg-purple-500' : 'bg-slate-200 dark:bg-slate-800'
          }`}
        >
          {submitState === 'submitting' ? (
            <ActivityIndicator color={isValid ? '#ffffff' : colors.textSecondary} />
          ) : (
            <>
              <Send size={18} color={isValid ? '#ffffff' : colors.textSecondary} />
              <Text
                className={`font-semibold text-base ml-2 ${
                  isValid ? 'text-white' : 'text-slate-400 dark:text-slate-500'
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
