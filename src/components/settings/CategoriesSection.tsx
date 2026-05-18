import React from 'react'
import { View, TouchableOpacity, Switch, Alert, Platform } from 'react-native'
import { Sparkles, Info } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useTranslation } from '~/hooks/useTranslation'
import { getMainScreenCopy } from '~/i18n/mainScreenCopy'
import { SectionHeader } from './SectionHeader'
import { FavoriteCategoriesAccordion } from './FavoriteCategoriesAccordion'
import { CategoriesSkeleton } from './SettingsSkeletons'

interface CategoriesSectionProps {
  isLoading: boolean
  autoSortCategories: boolean
  onToggleSmartCategories: (value: boolean) => void
}

/**
 * Categories section with smart categories toggle and favorites accordion
 */
export function CategoriesSection({
  isLoading,
  autoSortCategories,
  onToggleSmartCategories,
}: CategoriesSectionProps) {
  const theme = useAppTheme()
  const { locale } = useTranslation()
  const copy = getMainScreenCopy(locale)
  const brandColor = theme.colors.brand.primary

  const showSmartCategoriesInfo = () => {
    Alert.alert(
      copy.settings.smartCategoriesTitle,
      copy.settings.smartCategoriesBody,
      [{ text: copy.settings.gotIt }],
    )
  }

  return (
    <View>
      <SectionHeader title={copy.settings.categoriesSection} />
      {isLoading ? (
        <CategoriesSkeleton />
      ) : (
        <View className="mb-6">
          {/* Smart Categories Toggle */}
          <View
            className="rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
            style={{ backgroundColor: theme.colors.card }}
          >
            <View className="flex-row items-center">
              <Sparkles
                size={18}
                color={brandColor}
                fill={autoSortCategories ? brandColor : 'transparent'}
              />
              <Text className="text-base font-sans-medium text-content-primary ml-3">
                {copy.settings.smartCategories}
              </Text>
              <TouchableOpacity
                className="ml-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={showSmartCategoriesInfo}
              >
                <Info size={16} color={theme.colors.text.tertiary} />
              </TouchableOpacity>
            </View>
            <Switch
              value={autoSortCategories}
              onValueChange={onToggleSmartCategories}
              trackColor={{
                false: theme.colors.border.primary,
                true: brandColor,
              }}
              thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              ios_backgroundColor={theme.colors.border.primary}
            />
          </View>

          {/* Favorite Categories Accordion */}
          <FavoriteCategoriesAccordion />
        </View>
      )}
    </View>
  )
}
