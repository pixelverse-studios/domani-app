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
export type UserCategoryPreference = Tables<'user_category_preferences'>
export type SupportRequest = Tables<'support_requests'>
export type BetaFeedback = Tables<'beta_feedback'>

// Insert types
export type ProfileInsert = TablesInsert<'profiles'>
export type PlanInsert = TablesInsert<'plans'>
export type TaskInsert = TablesInsert<'tasks'>
export type UserCategoryInsert = TablesInsert<'user_categories'>
export type UserCategoryPreferenceInsert = TablesInsert<'user_category_preferences'>
export type SupportRequestInsert = TablesInsert<'support_requests'>
export type BetaFeedbackInsert = TablesInsert<'beta_feedback'>

// Update types
export type ProfileUpdate = TablesUpdate<'profiles'>
export type PlanUpdate = TablesUpdate<'plans'>
export type TaskUpdate = TablesUpdate<'tasks'>
export type UserCategoryUpdate = TablesUpdate<'user_categories'>

// Enum types
export type Tier = Enums<'tier'>
export type PlanStatus = Enums<'plan_status'>

// Priority type - matches database enum
export type TaskPriority = Enums<'task_priority'>

// Extended task type with category relations
export interface TaskWithCategory extends Task {
  system_category?: SystemCategory | null
  user_category?: UserCategory | null
}

// Day type inference types (re-exported from utility for convenience)
export type { DayTheme, DayType } from '~/utils/dayTypeInference'

// App configuration types
export type { AppPhase, PhaseConfig, FeatureFlags, AppConfig } from './appConfig'
export { PHASE_DISPLAY } from './appConfig'
