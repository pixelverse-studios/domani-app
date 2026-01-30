import React from 'react'
import { View, TouchableOpacity, Switch, Alert, Platform } from 'react-native'
import { Sparkles, Info } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
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
  const { activeTheme } = useTheme()

  const showSmartCategoriesInfo = () => {
    Alert.alert(
      'Smart Categories',
      'Favorite categories automatically adjust based on usage frequency. The app learns your habits and displays your most-used categories.',
      [{ text: 'Got it' }],
    )
  }

  return (
    <>
      <SectionHeader title="Categories" />
      {isLoading ? (
        <CategoriesSkeleton />
      ) : (
        <View className="mb-6">
          {/* Smart Categories Toggle */}
          <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Sparkles
                size={18}
                color={activeTheme === 'dark' ? '#a78bfa' : '#8b5cf6'}
                fill={
                  autoSortCategories
                    ? activeTheme === 'dark'
                      ? '#a78bfa'
                      : '#8b5cf6'
                    : 'transparent'
                }
              />
              <Text className="text-base font-sans-medium text-slate-900 dark:text-white ml-3">
                Smart Categories
              </Text>
              <TouchableOpacity
                className="ml-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={showSmartCategoriesInfo}
              >
                <Info size={16} color={activeTheme === 'dark' ? '#64748b' : '#94a3b8'} />
              </TouchableOpacity>
            </View>
            <Switch
              value={autoSortCategories}
              onValueChange={onToggleSmartCategories}
              trackColor={{
                false: activeTheme === 'dark' ? '#334155' : '#e2e8f0',
                true: activeTheme === 'dark' ? '#a78bfa' : '#8b5cf6',
              }}
              thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              ios_backgroundColor={activeTheme === 'dark' ? '#334155' : '#e2e8f0'}
            />
          </View>

          {/* Favorite Categories Accordion */}
          <FavoriteCategoriesAccordion />
        </View>
      )}
    </>
  )
}
