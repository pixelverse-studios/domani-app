import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
import type { UserCategory, SystemCategory, UserCategoryPreference } from '~/types'
import { getTheme } from '~/theme/themes'
import { validateCategoryName } from '~/constants/systemCategories.validation'

// Map of form category IDs to database names for system categories
const SYSTEM_CATEGORY_MAP: Record<string, string> = {
  work: 'Work',
  wellness: 'Wellness',
  personal: 'Personal',
  home: 'Home',
}

// 30 minutes - user categories rarely change
const USER_CATEGORIES_STALE_TIME = 1000 * 60 * 30

// Unified category type for UI components
export interface UnifiedCategory {
  id: string
  name: string
  icon: string
  color: string
  position: number
  usageCount: number
  isSystem: boolean
  isFavorite: boolean
}

export function useSystemCategories() {
  return useQuery({
    queryKey: ['systemCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_categories')
        .select('*')
        .eq('is_active', true)
        .order('position')

      if (error) throw error

      return data as SystemCategory[]
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour - system categories rarely change
  })
}

// Helper to get system category UUID from form ID
export function useSystemCategoryId(formCategoryId: string | undefined) {
  const { data: systemCategories } = useSystemCategories()

  if (!formCategoryId || !systemCategories) return undefined

  const dbName = SYSTEM_CATEGORY_MAP[formCategoryId]
  if (!dbName) return undefined

  const category = systemCategories.find((c) => c.name === dbName)
  return category?.id
}

export function useUserCategories() {
  return useQuery({
    queryKey: ['userCategories'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('user_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('position')

      if (error) throw error

      return data as UserCategory[]
    },
    staleTime: USER_CATEGORIES_STALE_TIME,
  })
}

export function useCreateUserCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      color = getTheme().colors.brand.primary,
      icon = 'tag',
    }: {
      name: string
      color?: string
      icon?: string
    }) => {
      // Validate name before database call (fail fast)
      validateCategoryName(name)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('user_categories')
        .insert({
          user_id: user.id,
          name,
          color,
          icon,
        })
        .select()
        .single()

      if (error) throw error

      return data as UserCategory
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCategories'] })
    },
  })
}

export function useDeleteUserCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('user_categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCategories'] })
    },
  })
}

// Fetch user preferences for system categories (positions, usage counts)
export function useUserCategoryPreferences() {
  return useQuery({
    queryKey: ['userCategoryPreferences'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('user_category_preferences')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      return data as UserCategoryPreference[]
    },
    staleTime: USER_CATEGORIES_STALE_TIME,
  })
}

// Get all categories unified with user preferences, sorted appropriately
export function useSortedCategories(autoSort: boolean = false) {
  const { data: systemCategories = [] } = useSystemCategories()
  const { data: userCategories = [] } = useUserCategories()
  const { data: preferences = [] } = useUserCategoryPreferences()

  // Memoize the unified and sorted categories to prevent infinite re-renders
  const unified = React.useMemo(() => {
    // Build a map of system category preferences by system_category_id
    const prefMap = new Map<string, UserCategoryPreference>()
    preferences.forEach((pref) => {
      prefMap.set(pref.system_category_id, pref)
    })

    // Convert to unified format
    const result: UnifiedCategory[] = [
      // System categories with user preferences overlay
      ...systemCategories.map((cat) => {
        const pref = prefMap.get(cat.id)
        return {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          position: pref?.position ?? cat.position,
          usageCount: pref?.usage_count ?? 0,
          isSystem: true,
          // System categories are favorites by default if no preference exists
          isFavorite: pref?.is_favorite ?? true,
        }
      }),
      // User categories
      ...userCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        // Only offset non-favorite custom categories to keep them after system categories
        // Favorite custom categories keep their raw position to respect user's drag-and-drop ordering
        position: cat.is_favorite ? cat.position : cat.position + 100,
        usageCount: cat.usage_count ?? 0,
        isSystem: false,
        isFavorite: cat.is_favorite ?? false,
      })),
    ]

    // Sort by usage count if auto-sort enabled, otherwise by position
    if (autoSort) {
      result.sort((a, b) => b.usageCount - a.usageCount || a.position - b.position)
    } else {
      result.sort((a, b) => a.position - b.position)
    }

    return result
  }, [systemCategories, userCategories, preferences, autoSort])

  return unified
}

// Get categories to display in quick-select (top 4)
// When autoSort is true: returns top 4 by usage count (smart mode)
// When autoSort is false: returns user's manually selected favorites
export function useFavoriteCategories(autoSort: boolean = false) {
  const allCategories = useSortedCategories(autoSort)

  return React.useMemo(() => {
    if (autoSort) {
      // Smart mode: return top 4 by usage count (already sorted by useSortedCategories)
      return allCategories.slice(0, 4)
    } else {
      // Manual mode: return user's selected favorites
      return allCategories.filter((cat) => cat.isFavorite)
    }
  }, [allCategories, autoSort])
}

// Update favorite categories
export function useUpdateFavoriteCategories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (categoryIds: string[]) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (categoryIds.length > 4) {
        throw new Error('Maximum 4 favorite categories allowed')
      }

      const { error } = await supabase.rpc('update_favorite_categories', {
        p_user_id: user.id,
        p_favorite_category_ids: categoryIds,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCategories'] })
      queryClient.invalidateQueries({ queryKey: ['userCategoryPreferences'] })
    },
  })
}

// Update category positions after drag-and-drop reorder
export function useUpdateCategoryPositions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (categories: { id: string; position: number; isSystem: boolean }[]) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Call the database function to batch update positions
      const { error } = await supabase.rpc('update_category_positions', {
        p_user_id: user.id,
        p_category_positions: categories,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCategories'] })
      queryClient.invalidateQueries({ queryKey: ['userCategoryPreferences'] })
    },
  })
}

// Increment usage count when a task is created with a category
export function useIncrementCategoryUsage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      systemCategoryId,
      userCategoryId,
    }: {
      systemCategoryId?: string | null
      userCategoryId?: string | null
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Only call if there's a category to update
      if (!systemCategoryId && !userCategoryId) return

      const { error } = await supabase.rpc('increment_category_usage', {
        p_user_id: user.id,
        p_system_category_id: systemCategoryId ?? undefined,
        p_user_category_id: userCategoryId ?? undefined,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCategories'] })
      queryClient.invalidateQueries({ queryKey: ['userCategoryPreferences'] })
    },
  })
}
