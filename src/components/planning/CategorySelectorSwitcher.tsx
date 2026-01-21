import React, { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { CategorySelector } from './CategorySelector'
import { CategorySelectorOptionA } from './CategorySelectorOptionA'
import { CategorySelectorOptionB } from './CategorySelectorOptionB'
import { CategorySelectorOptionC } from './CategorySelectorOptionC'

type VariantType = 'current' | 'optionA' | 'optionB' | 'optionC'

interface VariantOption {
  id: VariantType
  label: string
  description: string
}

const VARIANTS: VariantOption[] = [
  { id: 'current', label: 'Original', description: 'Search + grid' },
  { id: 'optionA', label: 'Option A', description: 'Chips + tray' },
  { id: 'optionB', label: 'Option B', description: 'Bottom sheet' },
  { id: 'optionC', label: 'Option C', description: 'Carousel slider' },
]

interface CategorySelectorSwitcherProps {
  selectedCategory: string | null
  selectedCategoryLabel: string | null
  onSelectCategory: (categoryId: string, categoryLabel: string) => void
  onClearCategory: () => void
  disabled?: boolean
}

/**
 * Development component that wraps all category selector variants
 * with a switcher UI for A/B comparison testing.
 *
 * Remove this component before production - use the chosen variant directly.
 */
export function CategorySelectorSwitcher({
  selectedCategory,
  selectedCategoryLabel,
  onSelectCategory,
  onClearCategory,
  disabled = false,
}: CategorySelectorSwitcherProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const [activeVariant, setActiveVariant] = useState<VariantType>('current')

  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'

  // Render the active variant
  const renderCategorySelector = () => {
    const props = {
      selectedCategory,
      selectedCategoryLabel,
      onSelectCategory,
      onClearCategory,
      disabled,
    }

    switch (activeVariant) {
      case 'optionA':
        return <CategorySelectorOptionA {...props} />
      case 'optionB':
        return <CategorySelectorOptionB {...props} />
      case 'optionC':
        return <CategorySelectorOptionC {...props} />
      case 'current':
      default:
        return <CategorySelector {...props} />
    }
  }

  return (
    <View>
      {/* Variant Switcher Bar */}
      <View
        style={[
          styles.switcherContainer,
          {
            backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.08)',
            borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)',
          },
        ]}
      >
        <Text style={[styles.switcherLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          Compare Variants
        </Text>
        <View style={styles.switcherButtons}>
          {VARIANTS.map((variant) => {
            const isActive = activeVariant === variant.id
            return (
              <TouchableOpacity
                key={variant.id}
                onPress={() => setActiveVariant(variant.id)}
                style={[
                  styles.variantButton,
                  {
                    backgroundColor: isActive
                      ? purpleColor
                      : isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.05)',
                    borderColor: isActive ? purpleColor : isDark ? '#334155' : '#e2e8f0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.variantButtonText,
                    {
                      color: isActive ? '#ffffff' : isDark ? '#e2e8f0' : '#334155',
                      fontWeight: isActive ? '600' : '500',
                    },
                  ]}
                >
                  {variant.label}
                </Text>
                {isActive && (
                  <Text style={styles.variantDescription}>
                    {variant.description}
                  </Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Render the selected variant */}
      {renderCategorySelector()}
    </View>
  )
}

const styles = StyleSheet.create({
  switcherContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  switcherLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  switcherButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    gap: 6,
  },
  variantButton: {
    width: '48%',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  variantButtonText: {
    fontSize: 11,
  },
  variantDescription: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
})
