import React, { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  Settings,
  User,
  CreditCard,
  MessageCircle,
  Lock,
  X,
  Check,
  Send,
  Clock,
  MessageSquare,
  PartyPopper,
} from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { useCreateSupportRequest, type SupportCategory } from '~/hooks/useSupportRequests'

// Category configuration
const SUPPORT_CATEGORIES = [
  { id: 'technical_issue' as SupportCategory, label: 'Technical Issue', icon: Settings },
  { id: 'account_help' as SupportCategory, label: 'Account Help', icon: User },
  { id: 'billing_question' as SupportCategory, label: 'Billing Question', icon: CreditCard },
  { id: 'other' as SupportCategory, label: 'Other', icon: MessageCircle },
] as const

const MIN_DESCRIPTION_LENGTH = 6

export default function ContactSupportScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const createSupportRequest = useCreateSupportRequest()

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory | null>(null)
  const [description, setDescription] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success'>('idle')

  // Derived state
  const isValid = selectedCategory !== null && description.trim().length >= MIN_DESCRIPTION_LENGTH
  const selectedCategoryConfig = SUPPORT_CATEGORIES.find((c) => c.id === selectedCategory)

  // Colors
  const colors = {
    background: isDark ? '#020617' : '#ffffff',
    text: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    cardBg: isDark ? '#1e293b' : '#f1f5f9',
    cardBgSelected: isDark ? '#581c87' : '#f3e8ff',
    border: isDark ? '#334155' : '#e2e8f0',
    borderSelected: '#a855f7',
    purple: '#a855f7',
    green: '#22c55e',
    icon: isDark ? '#94a3b8' : '#64748b',
  }

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
      // Could add error toast here
      console.error('Failed to submit support request:', error)
    }
  }

  const handleSubmitAnother = () => {
    setSelectedCategory(null)
    setDescription('')
    setSubmitState('idle')
  }

  // Success State
  if (submitState === 'success') {
    return (
      <View className="flex-1 bg-white dark:bg-slate-950" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-4 pb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color="#a855f7" />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Contact Support
          </Text>
          <Text className="text-base text-slate-500 dark:text-slate-400 mb-8">
            Submit a request and get personalized help from our team
          </Text>

          {/* Success Content */}
          <View className="flex-1 items-center justify-center py-8">
            {/* Green Checkmark Circle */}
            <View className="w-24 h-24 rounded-full bg-green-500 items-center justify-center mb-6">
              <Check size={48} color="#ffffff" strokeWidth={3} />
            </View>

            {/* Success Message */}
            <Text className="text-base text-slate-600 dark:text-slate-300 text-center px-4 mb-8">
              We&apos;ve received your support request and our team will get back to you within 24
              hours. Check your email for updates.
            </Text>

            {/* Submit Another Request Button */}
            <TouchableOpacity
              onPress={handleSubmitAnother}
              activeOpacity={0.8}
              className="w-full bg-purple-500 py-4 rounded-xl flex-row items-center justify-center mb-5"
            >
              <MessageSquare size={20} color="#ffffff" />
              <Text className="text-white font-semibold text-base ml-2">
                Submit Another Request
              </Text>
            </TouchableOpacity>

            {/* We're on it! Banner */}
            <View className="w-full bg-green-500/10 rounded-xl p-4 border border-green-500/30">
              <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-full bg-green-500/20 items-center justify-center mr-3">
                  <PartyPopper size={20} color="#22c55e" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                  We&apos;re on it!
                </Text>
                <Text className="text-sm text-slate-500 dark:text-slate-400">
                  Your ticket has been assigned to our support team. We&apos;ll investigate and
                  respond as soon as possible.
                </Text>
              </View>
            </View>
          </View>
          </View>
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
      className="flex-1 bg-white dark:bg-slate-950"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color="#a855f7" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Contact Support
        </Text>
        <Text className="text-base text-slate-500 dark:text-slate-400 mb-6">
          Submit a request and get personalized help from our team
        </Text>

        {/* Category Selection */}
        <Text className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          What do you need help with?{' '}
          <Text className="text-red-500">*</Text>
        </Text>

        <View className="flex-row flex-wrap gap-3 mb-6">
          {SUPPORT_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category.id
            const IconComponent = category.icon

            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.7}
                className={`w-[48%] p-4 rounded-xl border ${
                  isSelected
                    ? 'bg-purple-500 border-purple-500'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <View className="flex-row items-center">
                  <IconComponent
                    size={20}
                    color={isSelected ? '#ffffff' : colors.icon}
                  />
                  <Text
                    className={`text-sm font-medium ml-2 ${
                      isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {category.label}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Subject Field (only shown when category selected) */}
        {selectedCategory && selectedCategoryConfig && (
          <>
            <Text className="text-sm text-slate-600 dark:text-slate-300 mb-2">Subject</Text>
            <View className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 mb-6 flex-row items-center justify-between border border-slate-200 dark:border-slate-700">
              <View className="flex-row items-center flex-1">
                <selectedCategoryConfig.icon size={18} color={colors.icon} />
                <Text className="text-base text-slate-900 dark:text-white ml-2">
                  {selectedCategoryConfig.label}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClearCategory} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={18} color={colors.icon} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Description Field */}
        <Text className="text-sm text-slate-600 dark:text-slate-300 mb-2">
          Describe your issue <Text className="text-red-500">*</Text>
        </Text>

        {selectedCategory ? (
          <>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={getPlaceholderText(selectedCategory)}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-base text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 min-h-[140px]"
              style={{ color: colors.text }}
            />
            {/* Character Counter */}
            <View className="flex-row justify-between mt-2 mb-6">
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                {description.length} characters
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Min. {MIN_DESCRIPTION_LENGTH} characters
              </Text>
            </View>
          </>
        ) : (
          <View className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 min-h-[140px] items-center justify-center border border-slate-200 dark:border-slate-700 mb-6">
            <Lock size={24} color={colors.textSecondary} />
            <Text className="text-sm text-slate-400 dark:text-slate-500 mt-2">
              Select a category to start
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isValid || submitState === 'submitting'}
          activeOpacity={0.8}
          className={`py-4 rounded-xl flex-row items-center justify-center mb-4 ${
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
                Submit Support Request
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Quick Response Time Banner */}
        <View className="bg-purple-500/10 rounded-xl p-4 mb-4 border border-purple-500/30">
          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-purple-500/20 items-center justify-center mr-3">
              <Clock size={20} color="#a855f7" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Quick Response Time
              </Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">
                Our support team typically responds within 24 hours. All requests are handled with
                care and attention.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Padding */}
      <View style={{ height: insets.bottom + 16 }} />
    </KeyboardAvoidingView>
  )
}

// Helper to get placeholder text based on category
function getPlaceholderText(category: SupportCategory): string {
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
