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
import { useLocalSearchParams, useRouter } from 'expo-router'
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
import { useTranslation } from '~/hooks/useTranslation'

const MIN_DESCRIPTION_LENGTH = 6

export default function ContactSupportScreen() {
  useScreenTracking('contact_support')
  const router = useRouter()
  const params = useLocalSearchParams<{
    category?: SupportCategory
  }>()
  const insets = useSafeAreaInsets()
  const theme = useAppTheme()
  const { t } = useTranslation()
  const brandColor = theme.colors.brand.primary
  const createSupportRequest = useCreateSupportRequest()

  const supportCategories = [
    {
      id: 'technical_issue' as SupportCategory,
      label: t('support.categories.technicalIssue'),
      icon: Settings,
    },
    { id: 'account_help' as SupportCategory, label: t('support.categories.accountHelp'), icon: User },
    {
      id: 'billing_question' as SupportCategory,
      label: t('support.categories.billingQuestion'),
      icon: CreditCard,
    },
    { id: 'other' as SupportCategory, label: t('support.categories.other'), icon: MessageCircle },
  ] as const

  // Form state
  const initialCategory =
    params.category && supportCategories.some((item) => item.id === params.category)
      ? params.category
      : null
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory | null>(initialCategory)
  const [description, setDescription] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success'>('idle')

  // Derived state
  const isValid = selectedCategory !== null && description.trim().length >= MIN_DESCRIPTION_LENGTH
  const selectedCategoryConfig = supportCategories.find((c) => c.id === selectedCategory)

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
      Alert.alert(t('support.submitFailedTitle'), t('common.errors.tryAgain'))
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
        return t('support.placeholders.technicalIssue')
      case 'account_help':
        return t('support.placeholders.accountHelp')
      case 'billing_question':
        return t('support.placeholders.billingQuestion')
      case 'other':
        return t('support.placeholders.other')
    }
  }

  // Success State
  if (submitState === 'success') {
    return (
      <View
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
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text className="text-2xl font-bold text-content-primary mb-2">{t('support.title')}</Text>
          <Text className="text-base text-content-secondary mb-8">{t('support.subtitle')}</Text>

          {/* Success Content */}
          <FormSuccessState
            message={t('support.success.message')}
            actionLabel={t('support.success.action')}
            actionIcon={MessageSquare}
            onAction={handleSubmitAnother}
            banner={{
              icon: PartyPopper,
              title: t('support.success.bannerTitle'),
              description: t('support.success.bannerDescription'),
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
        <Text className="text-2xl font-bold text-content-primary mb-2">{t('support.title')}</Text>
        <Text className="text-base text-content-secondary mb-6">{t('support.subtitle')}</Text>

        {/* Category Selection */}
        <Text className="text-sm text-content-secondary mb-3">
          {t('support.categoryPrompt')} <Text className="text-red-500">*</Text>
        </Text>

        <View className="mb-6">
          <CategoryGrid
            categories={supportCategories}
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
          label={t('support.issueLabel')}
          value={description}
          onChange={setDescription}
          placeholder={selectedCategory ? getPlaceholderText(selectedCategory) : ''}
          disabled={!selectedCategory}
          minCharacters={MIN_DESCRIPTION_LENGTH}
          showMinLabel={true}
          disabledMessage={t('support.disabledMessage')}
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
                {t('support.submitCta')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Quick Response Time Banner */}
        <InfoBanner
          icon={Clock}
          title={t('support.responseBanner.title')}
          description={t('support.responseBanner.description')}
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
