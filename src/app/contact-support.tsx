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
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  Settings,
  User,
  CreditCard,
  MessageCircle,
  Send,
  Clock,
  MessageSquare,
  PartyPopper,
} from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { useCreateSupportRequest, type SupportCategory } from '~/hooks/useSupportRequests'
import {
  CategoryGrid,
  SubjectField,
  FormTextArea,
  InfoBanner,
  FormSuccessState,
} from '~/components/forms'

// Category configuration
const SUPPORT_CATEGORIES = [
  { id: 'technical_issue' as SupportCategory, label: 'Technical Issue', icon: Settings },
  { id: 'account_help' as SupportCategory, label: 'Account Help', icon: User },
  { id: 'billing_question' as SupportCategory, label: 'Billing Question', icon: CreditCard },
  { id: 'other' as SupportCategory, label: 'Other', icon: MessageCircle },
] as const

const MIN_DESCRIPTION_LENGTH = 6

export default function ContactSupportScreen() {
  useScreenTracking('contact_support')
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary
  const createSupportRequest = useCreateSupportRequest()

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory | null>(null)
  const [description, setDescription] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success'>('idle')

  // Derived state
  const isValid = selectedCategory !== null && description.trim().length >= MIN_DESCRIPTION_LENGTH
  const selectedCategoryConfig = SUPPORT_CATEGORIES.find((c) => c.id === selectedCategory)

  // Colors
  const textSecondary = theme.colors.text.secondary

  const handleClearCategory = () => {
    setSelectedCategory(null)
  }

  const handleSubmit = async () => {
    if (!isValid || !selectedCategory) return

    setSubmitState('submitting')
    try {
      await createSupportRequest.mutateAsync({
        category: selectedCategory,
        description: description.trim(),
      })
      setSubmitState('success')
    } catch (error) {
      setSubmitState('idle')
      console.error('Failed to submit support request:', error)
      Alert.alert('Failed to submit request', 'Please try again.')
    }
  }

  const handleSubmitAnother = () => {
    setSelectedCategory(null)
    setDescription('')
    setSubmitState('idle')
  }

  // Helper to get placeholder text based on category
  const getPlaceholderText = (category: SupportCategory): string => {
    switch (category) {
      case 'technical_issue':
        return "Describe the technical problem you're experiencing."
      case 'account_help':
        return 'Describe what help you need with your account.'
      case 'billing_question':
        return 'Describe your billing question or concern.'
      case 'other':
        return 'Describe what you need help with.'
    }
  }

  // Success State
  if (submitState === 'success') {
    return (
      <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: theme.colors.background }}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-4 pb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={brandColor} />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text className="text-2xl font-bold text-content-primary mb-2">
            Contact Support
          </Text>
          <Text className="text-base text-content-secondary mb-8">
            Submit a request and get personalized help from our team
          </Text>

          {/* Success Content */}
          <FormSuccessState
            message="We've received your support request and our team will get back to you within 24 hours. Check your email for updates."
            actionLabel="Submit Another Request"
            actionIcon={MessageSquare}
            onAction={handleSubmitAnother}
            banner={{
              icon: PartyPopper,
              title: "We're on it!",
              description:
                "Your ticket has been assigned to our support team. We'll investigate and respond as soon as possible.",
            }}
          />
        </ScrollView>

        {/* Bottom Padding */}
        <View style={{ height: insets.bottom + 16 }} />
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
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={brandColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text className="text-2xl font-bold text-content-primary mb-2">
          Contact Support
        </Text>
        <Text className="text-base text-content-secondary mb-6">
          Submit a request and get personalized help from our team
        </Text>

        {/* Category Selection */}
        <Text className="text-sm text-content-secondary mb-3">
          What do you need help with? <Text className="text-red-500">*</Text>
        </Text>

        <View className="mb-6">
          <CategoryGrid
            categories={SUPPORT_CATEGORIES}
            selectedId={selectedCategory}
            onSelect={(id) => setSelectedCategory(id as SupportCategory)}
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

        {/* Description Field */}
        <FormTextArea
          label="Describe your issue"
          value={description}
          onChange={setDescription}
          placeholder={selectedCategory ? getPlaceholderText(selectedCategory) : ''}
          disabled={!selectedCategory}
          minCharacters={MIN_DESCRIPTION_LENGTH}
          showMinLabel={true}
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
                Submit Support Request
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Quick Response Time Banner */}
        <InfoBanner
          icon={Clock}
          title="Quick Response Time"
          description="Our support team typically responds within 24 hours. All requests are handled with care and attention."
          variant="purple"
        />

        {/* Bottom spacing for scroll */}
        <View className="h-8" />
      </ScrollView>

      {/* Bottom Padding */}
      <View style={{ height: insets.bottom + 16 }} />
    </KeyboardAvoidingView>
  )
}
