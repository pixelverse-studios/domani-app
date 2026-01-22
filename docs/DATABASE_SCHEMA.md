# Domani Database Schema

Complete reference for the Supabase PostgreSQL database.

> **Last Updated:** 2025-11-26

---

## Table of Contents

1. [Core App Tables](#core-app-tables)
2. [Admin & Marketing Tables](#admin--marketing-tables)
3. [Enums](#enums)
4. [Foreign Keys](#foreign-keys)
5. [RLS Policies](#rls-policies)
6. [Functions](#functions)
7. [Triggers](#triggers)
8. [Auth Schema](#auth-schema)

---

## Core App Tables

### profiles

User profiles linked to Supabase Auth. Created automatically on signup via trigger.

| Column                  | Type        | Nullable | Default | Description                        |
| ----------------------- | ----------- | -------- | ------- | ---------------------------------- |
| id                      | uuid        | NO       | -       | Primary key, matches auth.users.id |
| email                   | text        | NO       | -       | User's email                       |
| full_name               | text        | YES      | -       | Display name                       |
| avatar_url              | text        | YES      | -       | Profile picture URL                |
| tier                    | tier (enum) | NO       | 'free'  | Subscription tier                  |
| revenuecat_user_id      | text        | YES      | -       | RevenueCat customer ID (unique)    |
| subscription_status     | text        | YES      | -       | Current subscription status        |
| subscription_expires_at | timestamptz | YES      | -       | When subscription expires          |
| timezone                | text        | YES      | 'UTC'   | User's timezone                    |
| planning_reminder_time  | time        | YES      | -       | Evening planning notification      |
| reminder_shortcuts      | jsonb       | YES      | (*)     | User-customizable reminder time shortcuts |
| trial_started_at        | timestamptz | YES      | -       | When trial began                   |
| trial_ends_at           | timestamptz | YES      | -       | When trial expires                 |
| created_at              | timestamptz | NO       | now()   | -                                  |
| updated_at              | timestamptz | NO       | now()   | -                                  |

**Indexes:** `idx_profiles_tier`, `idx_profiles_subscription_status`, `idx_profiles_trial_ends_at`, `idx_profiles_revenuecat`

---

### plans

Daily plans - one per user per day.

| Column          | Type               | Nullable | Default            | Description                  |
| --------------- | ------------------ | -------- | ------------------ | ---------------------------- |
| id              | uuid               | NO       | uuid_generate_v4() | Primary key                  |
| user_id         | uuid               | NO       | -                  | FK → profiles.id             |
| planned_for     | date               | NO       | -                  | The date this plan is for    |
| status          | plan_status (enum) | NO       | 'draft'            | Plan lifecycle state         |
| locked_at       | timestamptz        | YES      | -                  | When plan was locked         |
| completed_at    | timestamptz        | YES      | -                  | When marked complete         |
| completion_rate | numeric            | YES      | -                  | % of tasks completed (0-100) |
| evening_notes   | text               | YES      | -                  | Notes from planning session  |
| morning_notes   | text               | YES      | -                  | Notes from execution         |
| created_at      | timestamptz        | NO       | now()              | -                            |
| updated_at      | timestamptz        | NO       | now()              | -                            |

**Unique Constraint:** `(user_id, planned_for)` - One plan per user per day

**Indexes:** `idx_plans_user_id`, `idx_plans_planned_for`, `idx_plans_user_date`, `idx_plans_status`

---

### tasks

Individual tasks within a plan.

| Column                     | Type                 | Nullable | Default            | Description               |
| -------------------------- | -------------------- | -------- | ------------------ | ------------------------- |
| id                         | uuid                 | NO       | uuid_generate_v4() | Primary key               |
| plan_id                    | uuid                 | NO       | -                  | FK → plans.id             |
| user_id                    | uuid                 | NO       | -                  | FK → profiles.id          |
| title                      | text                 | NO       | -                  | Task title                |
| description                | text                 | YES      | -                  | Optional details          |
| is_mit                     | boolean              | NO       | false              | Most Important Task flag  |
| priority                   | task_priority (enum) | YES      | 'medium'           | high/medium/low           |
| position                   | integer              | NO       | 0                  | Sort order within plan    |
| estimated_duration_minutes | integer              | YES      | -                  | Planned time              |
| completed_at               | timestamptz          | YES      | -                  | When task was completed   |
| completed_duration_minutes | integer              | YES      | -                  | Actual time spent         |
| system_category_id         | uuid                 | YES      | -                  | FK → system_categories.id |
| user_category_id           | uuid                 | YES      | -                  | FK → user_categories.id   |
| created_at                 | timestamptz          | NO       | now()              | -                         |
| updated_at                 | timestamptz          | NO       | now()              | -                         |

**Business Rules:**

- Free tier: Max 3 tasks per plan (enforced via RLS)
- Only ONE task per plan can have `is_mit = true` (enforced via trigger)

**Indexes:** `idx_tasks_plan`, `idx_tasks_user`, `idx_tasks_plan_position`, `idx_tasks_completed`, `idx_tasks_priority`, `idx_tasks_system_category_id`, `idx_tasks_user_category_id`

---

### task_time_blocks

Time blocks for scheduling tasks (premium feature).

| Column           | Type        | Nullable | Default            | Description       |
| ---------------- | ----------- | -------- | ------------------ | ----------------- |
| id               | uuid        | NO       | uuid_generate_v4() | Primary key       |
| task_id          | uuid        | NO       | -                  | FK → tasks.id     |
| start_time       | time        | NO       | -                  | Block start time  |
| end_time         | time        | NO       | -                  | Block end time    |
| duration_minutes | integer     | YES      | -                  | Computed duration |
| created_at       | timestamptz | NO       | now()              | -                 |

**Indexes:** `idx_time_blocks_task`

---

### system_categories

Predefined task categories (read-only for users).

| Column     | Type        | Nullable | Default           | Description            |
| ---------- | ----------- | -------- | ----------------- | ---------------------- |
| id         | uuid        | NO       | gen_random_uuid() | Primary key            |
| name       | text        | NO       | -                 | Category name (unique) |
| color      | text        | NO       | -                 | Hex color code         |
| icon       | text        | NO       | -                 | Icon identifier        |
| position   | integer     | NO       | 0                 | Display order          |
| is_active  | boolean     | NO       | true              | Whether to show        |
| created_at | timestamptz | NO       | now()             | -                      |

---

### user_categories

Custom categories created by users.

| Column     | Type        | Nullable | Default           | Description      |
| ---------- | ----------- | -------- | ----------------- | ---------------- |
| id         | uuid        | NO       | gen_random_uuid() | Primary key      |
| user_id    | uuid        | NO       | -                 | FK → profiles.id |
| name       | text        | NO       | -                 | Category name    |
| color      | text        | NO       | -                 | Hex color code   |
| icon       | text        | NO       | -                 | Icon identifier  |
| position   | integer     | NO       | 0                 | Display order    |
| created_at | timestamptz | NO       | now()             | -                |
| updated_at | timestamptz | NO       | now()             | -                |

**Unique Constraint:** `(user_id, name)` - Category names unique per user

---

## Admin & Marketing Tables

### waitlist

Pre-launch email signups.

| Column        | Type        | Nullable | Default           |
| ------------- | ----------- | -------- | ----------------- |
| id            | uuid        | NO       | gen_random_uuid() |
| email         | varchar     | NO       | -                 |
| name          | varchar     | YES      | -                 |
| referral_type | varchar     | YES      | 'website'         |
| confirmed     | boolean     | YES      | false             |
| confirmed_at  | timestamptz | YES      | -                 |
| status        | varchar     | YES      | 'confirmed'       |
| invited_at    | timestamptz | YES      | -                 |
| metadata      | jsonb       | YES      | '{}'              |
| created_at    | timestamptz | YES      | now()             |

---

### email_templates

Reusable email templates for campaigns.

| Column         | Type        | Nullable | Default           |
| -------------- | ----------- | -------- | ----------------- |
| id             | uuid        | NO       | gen_random_uuid() |
| name           | varchar     | NO       | -                 |
| description    | text        | YES      | -                 |
| category       | varchar     | YES      | -                 |
| subject        | varchar     | NO       | -                 |
| preview_text   | varchar     | YES      | -                 |
| html_content   | text        | NO       | -                 |
| text_content   | text        | YES      | -                 |
| variables      | jsonb       | YES      | '[]'              |
| from_name      | varchar     | YES      | -                 |
| from_email     | varchar     | YES      | -                 |
| reply_to_email | varchar     | YES      | -                 |
| is_active      | boolean     | YES      | true              |
| is_default     | boolean     | YES      | false             |
| created_by     | uuid        | YES      | -                 |
| created_at     | timestamptz | YES      | now()             |
| updated_at     | timestamptz | YES      | now()             |
| deleted_at     | timestamptz | YES      | -                 |

---

### email_campaigns

Email marketing campaigns.

| Column           | Type        | Nullable | Default                 |
| ---------------- | ----------- | -------- | ----------------------- |
| id               | uuid        | NO       | gen_random_uuid()       |
| name             | varchar     | NO       | -                       |
| description      | text        | YES      | -                       |
| type             | varchar     | YES      | 'manual'                |
| template_id      | uuid        | YES      | FK → email_templates.id |
| subject          | varchar     | NO       | -                       |
| preview_text     | varchar     | YES      | -                       |
| html_content     | text        | YES      | -                       |
| text_content     | text        | YES      | -                       |
| from_name        | varchar     | YES      | -                       |
| from_email       | varchar     | YES      | -                       |
| reply_to_email   | varchar     | YES      | -                       |
| recipient_filter | jsonb       | YES      | '{}'                    |
| recipient_count  | integer     | YES      | 0                       |
| status           | varchar     | YES      | 'draft'                 |
| scheduled_at     | timestamptz | YES      | -                       |
| sent_at          | timestamptz | YES      | -                       |
| completed_at     | timestamptz | YES      | -                       |
| metrics          | jsonb       | YES      | (see below)             |
| settings         | jsonb       | YES      | (see below)             |
| created_by       | uuid        | YES      | -                       |
| created_at       | timestamptz | YES      | now()                   |
| updated_at       | timestamptz | YES      | now()                   |
| deleted_at       | timestamptz | YES      | -                       |

**Default metrics:** `{"opened": 0, "bounced": 0, "clicked": 0, "delivered": 0, "total_sent": 0, "unsubscribed": 0}`

**Default settings:** `{"track_opens": true, "track_clicks": true, "include_unsubscribe": true}`

---

### campaign_recipients

Individual recipients for each campaign.

| Column             | Type        | Nullable | Default                 |
| ------------------ | ----------- | -------- | ----------------------- |
| id                 | uuid        | NO       | gen_random_uuid()       |
| campaign_id        | uuid        | NO       | FK → email_campaigns.id |
| recipient_id       | uuid        | YES      | FK → waitlist.id        |
| email              | varchar     | NO       | -                       |
| first_name         | varchar     | YES      | -                       |
| last_name          | varchar     | YES      | -                       |
| merge_data         | jsonb       | YES      | '{}'                    |
| status             | varchar     | YES      | 'pending'               |
| sent_at            | timestamptz | YES      | -                       |
| delivered_at       | timestamptz | YES      | -                       |
| bounced_at         | timestamptz | YES      | -                       |
| bounce_type        | varchar     | YES      | -                       |
| bounce_reason      | text        | YES      | -                       |
| opened_at          | timestamptz | YES      | -                       |
| open_count         | integer     | YES      | 0                       |
| clicked_at         | timestamptz | YES      | -                       |
| click_count        | integer     | YES      | 0                       |
| clicked_links      | jsonb       | YES      | '[]'                    |
| unsubscribed_at    | timestamptz | YES      | -                       |
| unsubscribe_reason | text        | YES      | -                       |
| provider_id        | varchar     | YES      | -                       |
| provider_response  | jsonb       | YES      | -                       |
| created_at         | timestamptz | YES      | now()                   |
| updated_at         | timestamptz | YES      | now()                   |

**Unique Index:** `(campaign_id, email)`

---

### email_unsubscribes

Global email unsubscribe list.

| Column            | Type        | Nullable | Default                 |
| ----------------- | ----------- | -------- | ----------------------- |
| id                | uuid        | NO       | gen_random_uuid()       |
| email             | varchar     | NO       | - (unique)              |
| reason            | varchar     | YES      | -                       |
| feedback          | text        | YES      | -                       |
| campaign_id       | uuid        | YES      | FK → email_campaigns.id |
| unsubscribe_token | uuid        | YES      | gen_random_uuid()       |
| unsubscribed_at   | timestamptz | YES      | now()                   |
| ip_address        | inet        | YES      | -                       |
| user_agent        | text        | YES      | -                       |
| resubscribed_at   | timestamptz | YES      | -                       |

---

### admin_audit_log

Tracks admin actions for security/compliance.

| Column        | Type                | Nullable | Default           |
| ------------- | ------------------- | -------- | ----------------- |
| id            | uuid                | NO       | gen_random_uuid() |
| user_id       | uuid                | YES      | -                 |
| admin_user_id | uuid                | YES      | -                 |
| action        | admin_action (enum) | NO       | -                 |
| resource_type | text                | NO       | -                 |
| resource_id   | text                | YES      | -                 |
| description   | text                | YES      | -                 |
| old_values    | jsonb               | YES      | -                 |
| new_values    | jsonb               | YES      | -                 |
| ip_address    | inet                | YES      | -                 |
| user_agent    | text                | YES      | -                 |
| session_id    | uuid                | YES      | -                 |
| metadata      | jsonb               | YES      | '{}'              |
| created_at    | timestamptz         | YES      | now()             |

---

### admin_sessions

Admin portal sessions.

| Column             | Type        | Nullable | Default |
| ------------------ | ----------- | -------- | ------- |
| id                 | text        | NO       | -       |
| admin_user_id      | uuid        | NO       | -       |
| token_hash         | text        | NO       | -       |
| refresh_token_hash | text        | YES      | -       |
| expires_at         | timestamptz | NO       | -       |
| invalidated_at     | timestamptz | YES      | -       |
| last_activity_at   | timestamptz | YES      | now()   |
| ip_address         | inet        | YES      | -       |
| user_agent         | text        | YES      | -       |
| created_at         | timestamptz | YES      | now()   |

---

## Enums

### tier

User subscription tier.

```
'free' | 'premium' | 'lifetime'
```

### plan_status

Plan lifecycle states.

```
'draft' | 'locked' | 'active' | 'completed'
```

### task_priority

Task priority levels.

```
'high' | 'medium' | 'low'
```

### subscription_status_enum

Subscription states (for tracking).

```
'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
```

### admin_action

Actions tracked in audit log.

```
'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'execute'
```

### admin_role

Admin permission levels.

```
'super_admin' | 'admin' | 'editor' | 'viewer'
```

### audit_action

Extended audit actions.

```
'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' |
'permission_change' | 'role_change' | 'settings_change' | 'login_attempt' |
'login_error' | 'read'
```

---

## Foreign Keys

| Table               | Column             | References           |
| ------------------- | ------------------ | -------------------- |
| plans               | user_id            | profiles.id          |
| tasks               | plan_id            | plans.id             |
| tasks               | user_id            | profiles.id          |
| tasks               | system_category_id | system_categories.id |
| tasks               | user_category_id   | user_categories.id   |
| task_time_blocks    | task_id            | tasks.id             |
| user_categories     | user_id            | profiles.id          |
| email_campaigns     | template_id        | email_templates.id   |
| campaign_recipients | campaign_id        | email_campaigns.id   |
| campaign_recipients | recipient_id       | waitlist.id          |
| email_unsubscribes  | campaign_id        | email_campaigns.id   |

---

## RLS Policies

### profiles

- **Users can read own profile** (SELECT): `auth.uid() = id`
- **Users can update own profile** (UPDATE): `auth.uid() = id`

### plans

- **Users can view own plans** (SELECT): `auth.uid() = user_id`
- **Users can insert own plans** (INSERT): `auth.uid() = user_id`
- **Users can update own unlocked plans** (UPDATE): `auth.uid() = user_id AND locked_at IS NULL`
- **Users can delete own unlocked plans** (DELETE): `auth.uid() = user_id AND locked_at IS NULL`

### tasks

- **Users can read own tasks** (SELECT): `auth.uid() = user_id`
- **Task creation with tier enforcement** (INSERT): Free tier limited to 3 tasks per plan
- **Users can update own tasks in unlocked plans** (UPDATE): Plan must be unlocked
- **Users can delete own tasks in unlocked plans** (DELETE): Plan must be unlocked

### task_time_blocks

- All operations require owning the parent task (via EXISTS subquery)

### system_categories

- **Anyone can view** (SELECT): `true`

### user_categories

- Full CRUD restricted to `auth.uid() = user_id`

### waitlist

- **Enable insert for all users** (INSERT): `true`
- **Enable read for authenticated** (SELECT): authenticated role only

### email_unsubscribes

- **Public can unsubscribe** (INSERT): `true` (anon + authenticated)

### admin_sessions

- **System can manage sessions** (ALL): `auth.role() = 'service_role'`

### admin_audit_log

- **System can insert audit logs** (INSERT): `true`

---

## Functions

| Function                        | Returns | Description                              |
| ------------------------------- | ------- | ---------------------------------------- |
| `handle_new_user()`             | trigger | Creates profile on auth.users insert     |
| `get_or_create_plan(uuid)`      | uuid    | Gets or creates plan for a date          |
| `can_add_task(uuid)`            | boolean | Checks if user can add task (tier check) |
| `can_add_task_to_plan(uuid)`    | boolean | Checks task limit for specific plan      |
| `get_remaining_task_slots()`    | integer | Returns available slots for free tier    |
| `has_premium_access()`          | boolean | Checks if user has premium/lifetime      |
| `enforce_single_mit()`          | trigger | Ensures only one MIT per plan            |
| `ensure_single_mit()`           | trigger | Alternative MIT enforcement              |
| `update_plan_completion_rate()` | trigger | Recalculates plan completion %           |
| `update_updated_at_column()`    | trigger | Sets updated_at on UPDATE                |
| `cleanup_expired_sessions()`    | void    | Removes old admin sessions               |
| `log_audit_event(...)`          | uuid    | Creates audit log entry                  |
| `sync_auth_user_to_profile()`   | boolean | Syncs auth data to profile               |
| `is_email_subscribed(varchar)`  | boolean | Checks unsubscribe list                  |
| `update_campaign_metrics()`     | void    | Recalculates campaign stats              |
| `has_permission(...)`           | boolean | Admin permission check                   |
| `get_user_role_level()`         | integer | Returns admin role priority              |

---

## Triggers

### Auto-update timestamps

- `update_profiles_updated_at` → profiles
- `update_plans_updated_at` → plans
- `update_tasks_updated_at` → tasks
- `update_user_categories_updated_at` → user_categories
- `update_email_templates_updated_at` → email_templates
- `update_email_campaigns_updated_at` → email_campaigns
- `update_campaign_recipients_updated_at` → campaign_recipients

### Business logic

- `enforce_single_mit_per_plan` (INSERT/UPDATE on tasks) → Ensures one MIT
- `ensure_single_mit_trigger` (INSERT/UPDATE on tasks) → Alternative MIT check
- `update_completion_on_task_change` (INSERT/UPDATE/DELETE on tasks) → Updates plan completion_rate

---

## Auth Schema

Supabase-managed `auth.users` table (reference only).

| Column             | Type        | Description                      |
| ------------------ | ----------- | -------------------------------- |
| id                 | uuid        | Primary key, used as profiles.id |
| email              | varchar     | User's email                     |
| encrypted_password | varchar     | Hashed password                  |
| email_confirmed_at | timestamptz | Email verification timestamp     |
| last_sign_in_at    | timestamptz | Last login                       |
| raw_app_meta_data  | jsonb       | App metadata (provider info)     |
| raw_user_meta_data | jsonb       | User metadata (name, avatar)     |
| is_sso_user        | boolean     | OAuth user flag                  |
| is_anonymous       | boolean     | Anonymous auth flag              |
| created_at         | timestamptz | Account creation                 |
| updated_at         | timestamptz | Last update                      |
| deleted_at         | timestamptz | Soft delete timestamp            |

---

## Regenerating TypeScript Types

After schema changes, regenerate types:

```bash
npm run db:types
# or
npx supabase gen types typescript --project-id exxnnlhxcjujxnnwwrxv > src/types/supabase.ts
```
