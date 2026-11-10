import type { Profile, SystemCategory, Task, TaskWithCategory, UserCategory } from '~/types'

const TEST_TIMESTAMP = '2026-01-01T00:00:00.000Z'
const TEST_DATE = '2026-01-02'

export function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    auto_sort_categories: true,
    avatar_url: null,
    created_at: TEST_TIMESTAMP,
    deleted_at: null,
    deletion_scheduled_for: null,
    email: 'test-user@domani.app',
    expo_push_token: null,
    full_name: 'Test User',
    id: 'profile-test-id',
    last_active_at: null,
    notification_onboarding_completed: false,
    planning_activated_at: null,
    planning_reminder_enabled: false,
    planning_reminder_time: null,
    purchased_at: null,
    push_token_invalid_at: null,
    push_token_last_verified_at: null,
    refunded_at: null,
    reminder_shortcuts: null,
    revenuecat_user_id: null,
    signup_cohort: null,
    signup_method: 'test',
    tier: 'none',
    timezone: 'America/New_York',
    trial_ends_at: null,
    trial_started_at: null,
    tutorial_completed_at: null,
    updated_at: TEST_TIMESTAMP,
    ...overrides,
  }
}

export function buildSystemCategory(overrides: Partial<SystemCategory> = {}): SystemCategory {
  return {
    color: 'test-purple',
    created_at: TEST_TIMESTAMP,
    icon: 'briefcase',
    id: 'system-category-test-id',
    is_active: true,
    name: 'Work',
    position: 1,
    ...overrides,
  }
}

export function buildUserCategory(overrides: Partial<UserCategory> = {}): UserCategory {
  return {
    color: 'test-blue',
    created_at: TEST_TIMESTAMP,
    icon: 'folder',
    id: 'user-category-test-id',
    is_favorite: false,
    name: 'Focus',
    position: 1,
    updated_at: TEST_TIMESTAMP,
    usage_count: 0,
    user_id: 'profile-test-id',
    ...overrides,
  }
}

export function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    completed_at: null,
    completed_duration_minutes: null,
    created_at: TEST_TIMESTAMP,
    description: null,
    estimated_duration_minutes: null,
    id: 'task-test-id',
    is_mit: false,
    notes: null,
    notification_id: null,
    position: 1,
    priority: 'medium',
    reminder_at: null,
    rolled_over_at: null,
    scheduled_date: TEST_DATE,
    system_category_id: 'system-category-test-id',
    title: 'Write the test',
    updated_at: TEST_TIMESTAMP,
    user_category_id: null,
    user_id: 'profile-test-id',
    ...overrides,
  }
}

export function buildTaskWithCategory(overrides: Partial<TaskWithCategory> = {}): TaskWithCategory {
  const systemCategory =
    overrides.system_category === undefined ? buildSystemCategory() : overrides.system_category

  return {
    ...buildTask({
      system_category_id: systemCategory?.id ?? null,
      user_category_id: overrides.user_category?.id ?? null,
    }),
    system_category: systemCategory,
    user_category: null,
    ...overrides,
  }
}
