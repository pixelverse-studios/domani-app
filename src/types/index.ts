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
export type Task = Tables<'tasks'>
export type SystemCategory = Tables<'system_categories'>
export type UserCategory = Tables<'user_categories'>
export type UserCategoryPreference = Tables<'user_category_preferences'>
export type SupportRequest = Tables<'support_requests'>
export type Feedback = Tables<'beta_feedback'>
export type PurchaseRefundState = Tables<'purchase_refund_states'>
export type PromoCampaign = Tables<'promo_campaigns'>
export type PromoCode = Tables<'promo_codes'>
export type PromoRedemptionAttempt = Tables<'promo_redemption_attempts'>

// Insert types
export type ProfileInsert = TablesInsert<'profiles'>
export type TaskInsert = TablesInsert<'tasks'>
export type UserCategoryInsert = TablesInsert<'user_categories'>
export type UserCategoryPreferenceInsert = TablesInsert<'user_category_preferences'>
export type SupportRequestInsert = TablesInsert<'support_requests'>
export type FeedbackInsert = TablesInsert<'beta_feedback'>
export type PurchaseRefundStateInsert = TablesInsert<'purchase_refund_states'>
export type PromoCampaignInsert = TablesInsert<'promo_campaigns'>
export type PromoCodeInsert = TablesInsert<'promo_codes'>
export type PromoRedemptionAttemptInsert = TablesInsert<'promo_redemption_attempts'>

// Update types
export type ProfileUpdate = TablesUpdate<'profiles'>
export type TaskUpdate = TablesUpdate<'tasks'>
export type UserCategoryUpdate = TablesUpdate<'user_categories'>
export type PurchaseRefundStateUpdate = TablesUpdate<'purchase_refund_states'>
export type PromoCampaignUpdate = TablesUpdate<'promo_campaigns'>
export type PromoCodeUpdate = TablesUpdate<'promo_codes'>
export type PromoRedemptionAttemptUpdate = TablesUpdate<'promo_redemption_attempts'>

// Enum types
export type Tier = Enums<'tier'>
export type RefundRequestStatus = Enums<'refund_request_status'>
export type PromoCampaignType = Enums<'promo_campaign_type'>
export type PromoCodeStatus = Enums<'promo_code_status'>
export type PromoDiscountKind = Enums<'promo_discount_kind'>
export type PromoRedemptionStatus = Enums<'promo_redemption_status'>

// Priority type - matches database enum
export type TaskPriority = Enums<'task_priority'>

// Extended task type with category relations
export interface TaskWithCategory extends Task {
  system_category?: SystemCategory | null
  user_category?: UserCategory | null
}

// Day type inference types (re-exported for convenience)
export type { DayTheme } from '~/constants/systemCategories'
export type { DayType } from '~/utils/dayTypeInference'

// App configuration types
export type { AppPhase, PhaseConfig, FeatureFlags, AppConfig } from './appConfig'
export { PHASE_DISPLAY } from './appConfig'
