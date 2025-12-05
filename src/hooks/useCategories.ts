import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
import type { UserCategory, SystemCategory } from '~/types'

// Map of display names to database names for system categories
const SYSTEM_CATEGORY_MAP: Record<string, string> = {
  work: 'Work',
  wellness: 'Health', // Form uses "wellness", DB has "Health"
  personal: 'Personal',
  education: 'Other', // Form uses "education", DB has "Other"
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
  })
}

export function useCreateUserCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      color = '#8b5cf6',
      icon = 'tag',
    }: {
      name: string
      color?: string
      icon?: string
    }) => {
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
