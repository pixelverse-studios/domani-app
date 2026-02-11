import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated'
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist'
import {
  Heart,
  ChevronDown,
  Briefcase,
  User,
  BookOpen,
  Star,
  Tag,
  GripVertical,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useProfile } from '~/hooks/useProfile'
import {
  useSortedCategories,
  useUpdateFavoriteCategories,
  useUpdateCategoryPositions,
  type UnifiedCategory,
} from '~/hooks/useCategories'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const MAX_FAVORITES = 4

function getCategoryIcon(category: UnifiedCategory, color: string, size: number = 18) {
  const iconName = category.icon?.toLowerCase() || category.name.toLowerCase()

  switch (iconName) {
    case 'briefcase':
    case 'work':
      return <Briefcase size={size} color={color} />
    case 'heart':
    case 'health':
    case 'wellness':
      return <Heart size={size} color={color} />
    case 'user':
    case 'personal':
      return <User size={size} color={color} />
    case 'book-open':
    case 'education':
      return <BookOpen size={size} color={color} />
    case 'tag':
      return <Tag size={size} color={color} />
    default:
      return <Star size={size} color={color} />
  }
}

export function FavoriteCategoriesAccordion() {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary
  const { profile } = useProfile()
  const autoSort = profile?.auto_sort_categories ?? false
  const allCategories = useSortedCategories(false) // Always get manual sort for selection UI
  const updateFavorites = useUpdateFavoriteCategories()
  const updatePositions = useUpdateCategoryPositions()

  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Track the ordered list of favorite categories (for drag-to-reorder)
  const [orderedFavorites, setOrderedFavorites] = useState<UnifiedCategory[]>([])

  // Animation values
  const rotation = useSharedValue(0)

  // Create a stable key for favorite IDs to prevent infinite loops
  const favoriteIdsKey = allCategories
    .filter((cat) => cat.isFavorite)
    .map((cat) => cat.id)
    .sort()
    .join(',')

  // Initialize selected IDs and ordered favorites from categories
  useEffect(() => {
    const favorites = allCategories.filter((cat) => cat.isFavorite)
    const favoriteIds = new Set(favorites.map((cat) => cat.id))
    setSelectedIds(favoriteIds)
    // Sort by position for initial order
    setOrderedFavorites([...favorites].sort((a, b) => a.position - b.position))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteIdsKey])

  // Separate favorites from non-favorites based on current selection
  // Use orderedFavorites for favorites (maintains drag order)
  const favoriteCategories = useMemo(() => {
    // Filter orderedFavorites to only include currently selected items
    const ordered = orderedFavorites.filter((cat) => selectedIds.has(cat.id))
    // Add any newly selected categories that aren't in orderedFavorites yet (at the end)
    const newlySelected = allCategories.filter(
      (cat) => selectedIds.has(cat.id) && !orderedFavorites.some((f) => f.id === cat.id),
    )
    return [...ordered, ...newlySelected]
  }, [orderedFavorites, selectedIds, allCategories])

  // Sort other categories alphabetically by name
  const otherCategories = useMemo(() => {
    return allCategories
      .filter((cat) => !selectedIds.has(cat.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allCategories, selectedIds])

  const selectedCount = selectedIds.size
  const canSelectMore = selectedCount < MAX_FAVORITES

  const handleToggleExpand = useCallback(() => {
    if (autoSort) return // Don't expand if managed by smart

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded((prev) => !prev)
    rotation.value = withTiming(isExpanded ? 0 : 1, {
      duration: 200,
      easing: Easing.ease,
    })
  }, [autoSort, isExpanded, rotation])

  const handleToggleCategory = useCallback(
    async (categoryId: string) => {
      const newSelectedIds = new Set(selectedIds)

      if (newSelectedIds.has(categoryId)) {
        // Unfavorite
        newSelectedIds.delete(categoryId)
        setSelectedIds(newSelectedIds)
        setOrderedFavorites((prevOrder) => prevOrder.filter((cat) => cat.id !== categoryId))
      } else if (newSelectedIds.size < MAX_FAVORITES) {
        // Favorite
        newSelectedIds.add(categoryId)
        setSelectedIds(newSelectedIds)
        const category = allCategories.find((cat) => cat.id === categoryId)
        if (category) {
          setOrderedFavorites((prevOrder) => [...prevOrder, category])
        }
      } else {
        // At max - cannot add more
        return
      }

      // Immediately persist favorite changes
      await updateFavorites.mutateAsync(Array.from(newSelectedIds))
    },
    [selectedIds, allCategories, updateFavorites],
  )

  // Handle drag end - update local order and persist immediately
  const handleDragEnd = useCallback(
    async ({ data }: { data: UnifiedCategory[] }) => {
      setOrderedFavorites(data)

      // Immediately persist new positions
      if (data.length > 0) {
        const positionUpdates = data.map((cat, index) => ({
          id: cat.id,
          position: index,
          isSystem: cat.isSystem,
        }))
        await updatePositions.mutateAsync(positionUpdates)
      }
    },
    [updatePositions],
  )

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` }],
  }))

  // Colors
  const iconColor = theme.colors.text.tertiary
  const selectedHeartColor = brandColor
  const textMuted = theme.colors.text.muted
  const dividerColor = theme.colors.border.divider

  // Render a non-draggable category row (for "other" categories)
  const renderCategoryRow = (category: UnifiedCategory, isLast: boolean = false) => {
    const isSelected = selectedIds.has(category.id)
    const canSelect = isSelected || canSelectMore

    return (
      <TouchableOpacity
        key={category.id}
        onPress={() => canSelect && handleToggleCategory(category.id)}
        disabled={!canSelect && !isSelected}
        activeOpacity={0.7}
        style={[
          styles.categoryRow,
          !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor },
          !canSelect && !isSelected && { opacity: 0.4 },
        ]}
      >
        {/* Category Icon & Name */}
        <View style={styles.categoryInfo}>
          <View style={[styles.categoryIconBg, { backgroundColor: `${category.color}15` }]}>
            {getCategoryIcon(category, category.color, 16)}
          </View>
          <Text className="text-base text-content-primary" style={{ marginLeft: 12 }}>
            {category.name}
          </Text>
          {!category.isSystem && (
            <View style={[styles.customBadge, { backgroundColor: `${brandColor}1A` }]}>
              <Text style={{ color: brandColor, fontSize: 10, fontWeight: '500' }}>Custom</Text>
            </View>
          )}
        </View>

        {/* Heart Selection Icon */}
        <Heart
          size={20}
          color={isSelected ? selectedHeartColor : iconColor}
          fill={isSelected ? selectedHeartColor : 'transparent'}
        />
      </TouchableOpacity>
    )
  }

  // Render a draggable favorite category row
  const renderDraggableFavorite = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<UnifiedCategory>) => {
      const index = getIndex()
      const isLast = index === favoriteCategories.length - 1

      return (
        <ScaleDecorator activeScale={1.02}>
          <TouchableOpacity
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
                // Haptics not available (e.g., in Expo Go)
              })
              drag()
            }}
            onPress={() => handleToggleCategory(item.id)}
            delayLongPress={150}
            activeOpacity={0.7}
            style={[
              styles.categoryRow,
              !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor },
              isActive && {
                backgroundColor: `${brandColor}0D`,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 4,
              },
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandle}>
              <GripVertical size={18} color={iconColor} />
            </View>

            {/* Category Icon & Name */}
            <View style={styles.categoryInfo}>
              <View style={[styles.categoryIconBg, { backgroundColor: `${item.color}15` }]}>
                {getCategoryIcon(item, item.color, 16)}
              </View>
              <Text className="text-base text-content-primary" style={{ marginLeft: 12 }}>
                {item.name}
              </Text>
              {!item.isSystem && (
                <View style={[styles.customBadge, { backgroundColor: `${brandColor}1A` }]}>
                  <Text style={{ color: selectedHeartColor, fontSize: 10, fontWeight: '500' }}>
                    Custom
                  </Text>
                </View>
              )}
            </View>

            {/* Heart Selection Icon */}
            <Heart size={20} color={selectedHeartColor} fill={selectedHeartColor} />
          </TouchableOpacity>
        </ScaleDecorator>
      )
    },
    [
      favoriteCategories.length,
      handleToggleCategory,
      dividerColor,
      brandColor,
      iconColor,
      selectedHeartColor,
    ],
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      {/* Header Row - Always Visible */}
      <TouchableOpacity
        onPress={handleToggleExpand}
        disabled={autoSort}
        activeOpacity={autoSort ? 1 : 0.7}
        style={styles.headerRow}
      >
        <View style={styles.headerLeft}>
          <Heart
            size={18}
            color={selectedHeartColor}
            fill={autoSort || selectedCount > 0 ? selectedHeartColor : 'transparent'}
          />
          <Text
            className="text-base font-sans-medium text-content-primary"
            style={{ marginLeft: 12 }}
          >
            Favorite Categories
          </Text>
        </View>

        <View style={styles.headerRight}>
          {autoSort ? (
            <Text style={{ color: textMuted, fontSize: 14 }}>Managed Smartly</Text>
          ) : (
            <>
              <Text style={{ color: textMuted, fontSize: 14, marginRight: 4 }}>
                {selectedCount} selected
              </Text>
              <Animated.View style={chevronStyle}>
                <ChevronDown size={18} color={iconColor} />
              </Animated.View>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && !autoSort && (
        <View style={styles.expandedContent}>
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Text className="text-sm font-sans-semibold text-content-primary">
              Quick Access Categories
            </Text>
            <Text style={{ color: textMuted, fontSize: 13, marginTop: 4 }}>
              Select up to {MAX_FAVORITES} categories to display by default when adding tasks
            </Text>
          </View>

          {/* Favorite Categories (above the line) - Draggable */}
          {favoriteCategories.length > 0 && (
            <View style={styles.categoryList}>
              <DraggableFlatList
                data={favoriteCategories}
                keyExtractor={(item) => item.id}
                renderItem={renderDraggableFavorite}
                onDragEnd={handleDragEnd}
                scrollEnabled={false}
              />
              <Text style={{ color: textMuted, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                Hold and drag to reorder
              </Text>
            </View>
          )}

          {/* Divider between favorites and others */}
          {otherCategories.length > 0 && favoriteCategories.length > 0 && (
            <View style={[styles.sectionDivider, { backgroundColor: dividerColor }]} />
          )}

          {/* Other Categories (below the line) */}
          {otherCategories.length > 0 && (
            <View style={styles.categoryList}>
              {otherCategories.map((cat, index) =>
                renderCategoryRow(cat, index === otherCategories.length - 1),
              )}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  categoryList: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  dragHandle: {
    paddingRight: 8,
    paddingLeft: 4,
    paddingVertical: 4,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionDivider: {
    height: 1,
    marginVertical: 12,
  },
})
