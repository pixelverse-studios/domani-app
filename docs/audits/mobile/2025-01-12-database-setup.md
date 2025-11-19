# Audit Log - Mobile App - 2025-01-12

## Prompt Summary
User requested a PostgreSQL script to export their current Supabase database schema, then asked for help cleaning up irrelevant tables and setting up the database properly for the Domani app.

## Actions Taken

### 1. Database Analysis
- Created `export_db_schema.sql` script to export complete database schema
- User provided output showing existing tables:
  - **Admin tables** (irrelevant): `admin_users`, `admin_roles`, `admin_permissions`
  - **Email/Waitlist tables** (ACTIVE): `email_campaigns`, `email_templates`, `campaign_recipients`, `email_unsubscribes`, `waitlist`
- **IMPORTANT**: Email/waitlist tables are actively used by landing page for alpha/beta signups - must be preserved

### 2. Database Cleanup Script
**File**: `supabase/migrations/001_cleanup_old_schema.sql`
- Drops ONLY admin-related triggers (3 triggers)
- Drops ONLY admin tables (3 tables): `admin_users`, `admin_roles`, `admin_permissions`
- **PRESERVES** email/waitlist tables for landing page:
  - `campaign_recipients`, `email_campaigns`, `email_templates`
  - `email_unsubscribes`, `waitlist`
- Keeps `update_updated_at_column()` function (used by preserved tables)
- Includes verification query to confirm cleanup

### 3. Core Schema Migration
**File**: `supabase/migrations/002_domani_schema.sql`
- **Enums**: `tier` (free/premium/lifetime), `plan_status` (draft/locked/active/completed)
- **Tables**:
  - `profiles`: User profiles extending auth.users with tier info
  - `categories`: Task categories (4 for free, unlimited for premium)
  - `plans`: Daily plans (one per day per user)
  - `tasks`: Individual tasks with MIT support
  - `task_time_blocks`: Optional time blocking
- **Indexes**: 14 indexes for optimal query performance
- **Functions**:
  - `update_updated_at_column()`: Auto-update timestamps
  - `update_plan_completion_rate()`: Track completion percentage
  - `enforce_single_mit()`: Only one MIT per plan
  - `create_default_categories()`: Auto-create 4 categories on signup
- **Triggers**: 7 triggers for automation

### 4. Row Level Security (RLS) Policies
**File**: `supabase/migrations/003_rls_policies.sql`
- **CRITICAL**: Tier enforcement at database level (authoritative)
- **Free tier limits**:
  - Max 3 tasks per plan (enforced in INSERT policy)
  - Max 4 categories (enforced in INSERT policy)
- **Premium/Lifetime**: Unlimited tasks and categories
- **Security**: Users can only access their own data
- **Helper functions**:
  - `can_add_task_to_plan()`: Check if user can add more tasks
  - `get_remaining_task_slots()`: Get remaining slots (-1 = unlimited)

### 5. Seed Data Script
**File**: `supabase/migrations/004_seed_data.sql`
- Instructions for creating test users (free/premium/lifetime)
- Commented examples for creating sample plans and tasks
- Testing scenarios for tier limits and MIT enforcement
- Development-only (not for production)

### 6. Documentation
**File**: `supabase/README.md`
- Complete setup instructions
- Schema overview with all tables and relationships
- Tier enforcement explanation (database + app level)
- Helper function documentation
- Automatic behavior (triggers) documentation
- Testing examples for all key features
- Supabase CLI commands
- Troubleshooting guide

## Files Created/Modified

### New Files
1. `export_db_schema.sql` - Schema export script
2. `supabase/migrations/001_cleanup_old_schema.sql` - Cleanup script
3. `supabase/migrations/002_domani_schema.sql` - Core schema
4. `supabase/migrations/003_rls_policies.sql` - RLS policies
5. `supabase/migrations/004_seed_data.sql` - Seed data
6. `supabase/README.md` - Complete documentation
7. `docs/audits/mobile/2025-01-12-database-setup.md` - This audit

## Components/Features Affected

### Database Architecture
- **5 core tables**: profiles, categories, plans, tasks, task_time_blocks
- **2 enums**: tier, plan_status
- **14 indexes**: Optimized for common queries
- **4 functions**: Automation and helper utilities
- **7 triggers**: Automatic behaviors
- **9 RLS policies**: Security and tier enforcement

### Freemium Model Implementation
- **Free tier**: 3 tasks/day, 4 categories (enforced by RLS)
- **Premium tier**: Unlimited tasks/categories
- **Lifetime tier**: Unlimited tasks/categories + future perks

### Key Relationships
```
auth.users (Supabase)
    ↓
profiles (tier, preferences)
    ↓
├── categories (max 4 for free)
└── plans (one per day)
        ↓
    tasks (max 3 for free)
        ↓
    task_time_blocks (optional)
```

## Testing Considerations

### Tier Enforcement
1. **Free tier limits**:
   - Create plan, add 3 tasks → should succeed
   - Try to add 4th task → should fail with RLS error
   - Try to create 5th category → should fail with RLS error

2. **Premium tier**:
   - Update user to premium tier
   - Add unlimited tasks and categories → should succeed

### Single MIT Enforcement
1. Mark task 1 as MIT → should succeed
2. Mark task 2 as MIT → task 1 should auto-unmark
3. Query tasks → only task 2 should have `is_mit = true`

### Plan Locking
1. Create draft plan → can edit tasks
2. Lock plan (status = 'locked') → enforce read-only in app
3. Try to edit locked plan → prevent in app UI

### Default Categories
1. Create new user via Supabase Auth
2. Check categories table → should have 4 default categories
3. Verify: Work (blue), Personal (purple), Health (green), Other (gray)

### Completion Rate
1. Create plan with 3 tasks
2. Complete 1 task → completion_rate should be 33.33
3. Complete 2nd task → completion_rate should be 66.67
4. Complete 3rd task → completion_rate should be 100.00

## Performance Impact

### Indexes (14 total)
- **profiles**: tier, revenuecat_user_id
- **categories**: user_id, (user_id, position)
- **plans**: (user_id, planned_for), (user_id, status), planned_for
- **tasks**: plan_id, user_id, category_id, (plan_id, completed_at), (plan_id, position)
- **task_time_blocks**: task_id

### Query Optimization
- All common queries have supporting indexes
- Foreign key indexes for JOIN performance
- Composite indexes for filtered ordering

### RLS Policy Performance
- Policies use indexed columns (user_id, plan_id)
- Tier checks use single indexed lookup on profiles
- COUNT queries for limits are on indexed plan_id

## Next Steps

### Immediate (Database Setup)
1. ✅ Run `001_cleanup_old_schema.sql` in Supabase SQL Editor
2. ✅ Run `002_domani_schema.sql` to create tables
3. ✅ Run `003_rls_policies.sql` to enable security
4. ✅ (Optional) Run `004_seed_data.sql` for test data

### Frontend Integration
1. Generate TypeScript types from schema:
   ```bash
   supabase gen types typescript --linked > src/types/supabase.ts
   ```

2. Create Supabase client ([src/lib/supabase.ts](../../src/lib/supabase.ts))

3. Create React Query hooks:
   - `useProfile()` - User profile and tier
   - `usePlans()` - Fetch plans
   - `useTasks(planId)` - Fetch tasks for plan
   - `useCategories()` - Fetch user categories
   - `useCreateTask()` - Create task with tier enforcement
   - `useCompleteTask()` - Mark task complete
   - `useLockPlan()` - Lock plan for execution

4. Create auth provider ([src/providers/AuthProvider.tsx](../../src/providers/AuthProvider.tsx))

### RevenueCat Integration
1. Set up RevenueCat project (iOS + Android)
2. Configure entitlements (premium, lifetime)
3. Create offerings (monthly, annual, lifetime)
4. Implement purchase flow
5. Sync subscription status with Supabase profiles table

### Testing
1. Create test users (free, premium, lifetime)
2. Test tier limits in app
3. Test MIT enforcement
4. Test plan locking
5. Test category management
6. Verify RLS policies block unauthorized access

## Notes

### IMPORTANT: Preserved Tables for Landing Page
The following tables are **actively used** by the landing page for alpha/beta signups and are **preserved**:
- `waitlist` - User signups from landing page
- `email_campaigns` - Marketing campaigns
- `email_templates` - Email templates
- `campaign_recipients` - Campaign recipient tracking
- `email_unsubscribes` - Unsubscribe management

These tables continue to function independently alongside the Domani app tables.

### CRITICAL: Tier Enforcement Strategy
The tier limits are enforced at **TWO levels**:

1. **Database Level (Authoritative)**: RLS policies prevent unauthorized inserts
   - This is the source of truth
   - Even if app has bug, database will block violation

2. **App Level (Better UX)**: Frontend pre-validates before save
   - Prevents error states
   - Shows upgrade prompts proactively
   - Better user experience

### Free Tier Philosophy
The 3-task limit is a **feature, not a bug**:
- Research shows 3-6 tasks is optimal for productivity
- Forces prioritization
- Reduces overwhelm
- Higher completion rates
- Messaging: "3 tasks is enough for what truly matters"

### Evening Planning Psychology
- Plans are created the **evening before** (calm, reflective state)
- Plans are **locked** before morning (commitment device)
- Morning is for **execution only** (no decision fatigue)
- This workflow is baked into the schema and UX

### Database Design Decisions

1. **Why separate `profiles` table?**
   - Supabase `auth.users` is in `auth` schema (can't add columns)
   - `profiles` extends with app-specific data
   - Foreign key ensures referential integrity

2. **Why `tier` enum instead of boolean?**
   - Three tiers: free, premium, lifetime
   - Extensible for future tiers (e.g., "team", "enterprise")
   - Explicit and type-safe

3. **Why `plan_status` enum?**
   - Clear state machine: draft → locked → active → completed
   - Enforces workflow (can't edit locked plans)
   - Enables future features (e.g., archiving, templates)

4. **Why `position` INTEGER instead of timestamp?**
   - User-defined ordering (drag-and-drop)
   - More flexible than created_at sorting
   - Common pattern for ordered lists

5. **Why `is_mit` BOOLEAN instead of priority enum?**
   - MIT (Most Important Task) is binary (yes/no)
   - Only ONE per plan (enforced by trigger)
   - Simpler than priority levels (which encourage analysis paralysis)

## Timestamp
Created: 2025-01-12 (database setup)
Feature Area: database/schema/migrations
Migration Files: 001-004
Total Tables: 5
Total Indexes: 14
Total Triggers: 7
Total Functions: 4
RLS Policies: 9
