/**
 * Supabase Database Types
 *
 * To regenerate types after schema changes:
 *   npx supabase gen types typescript --project-id exxnnlhxcjujxnnwwrxv > src/types/supabase.ts
 */

// Re-export all Supabase types
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from './supabase'

// Import types for use in aliases
import type { Tables, TablesInsert, TablesUpdate, Enums } from './supabase'

// Convenience type aliases for common tables
export type Profile = Tables<'profiles'>
export type Plan = Tables<'plans'>
export type Task = Tables<'tasks'>
export type SystemCategory = Tables<'system_categories'>
export type UserCategory = Tables<'user_categories'>

// Insert types
export type ProfileInsert = TablesInsert<'profiles'>
export type PlanInsert = TablesInsert<'plans'>
export type TaskInsert = TablesInsert<'tasks'>
export type UserCategoryInsert = TablesInsert<'user_categories'>

// Update types
export type ProfileUpdate = TablesUpdate<'profiles'>
export type PlanUpdate = TablesUpdate<'plans'>
export type TaskUpdate = TablesUpdate<'tasks'>
export type UserCategoryUpdate = TablesUpdate<'user_categories'>

// Enum types
export type Tier = Enums<'tier'>
export type PlanStatus = Enums<'plan_status'>

// Priority type (will be in Enums after migration + type regen)
export type TaskPriority = 'high' | 'medium' | 'low'

// Extended task type with category relations
export interface TaskWithCategory extends Task {
  system_category?: SystemCategory | null
  user_category?: UserCategory | null
}
