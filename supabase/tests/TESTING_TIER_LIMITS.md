# Testing Free Tier Task Limits

This document describes how to test the RLS policy that enforces the 3-task limit for free tier users.

## Overview

The policy `Users can insert tasks with tier limit` enforces:

- **Free tier**: Max 3 tasks per plan (daily plan)
- **Premium/Lifetime**: Unlimited tasks

Location: `supabase/migrations/001_initial_schema.sql` (lines 249-263)

## Prerequisites

1. Local Supabase running: `npx supabase start`
2. Migration applied (automatic on start)
3. At least two test users:
   - One with `tier = 'free'`
   - One with `tier = 'premium'` or `tier = 'lifetime'`

## Testing Methods

### Method 1: Supabase Dashboard SQL Editor

1. Open local Supabase dashboard: `http://localhost:54323`
2. Go to SQL Editor
3. Run `supabase/tests/test_task_tier_limit.sql`

### Method 2: Manual API Testing with curl

```bash
# Set your Supabase URL and keys
SUPABASE_URL="http://localhost:54321"
ANON_KEY="your-anon-key"
ACCESS_TOKEN="user-access-token-from-login"

# Get or create a plan for tomorrow
curl -X POST "$SUPABASE_URL/rest/v1/rpc/get_or_create_plan" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"p_date": "2025-01-25"}'

# Insert a task (replace PLAN_ID with actual ID)
curl -X POST "$SUPABASE_URL/rest/v1/tasks" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"plan_id": "PLAN_ID", "title": "Test Task 1"}'
```

### Method 3: App Testing

1. Start the Expo app: `npx expo start`
2. Sign in with a test Google account
3. Create tasks via the UI
4. Observe behavior when attempting 4th task

## Expected Results

### Free Tier User

| Action                         | Expected Result                  |
| ------------------------------ | -------------------------------- |
| Insert task 1                  | Success                          |
| Insert task 2                  | Success                          |
| Insert task 3                  | Success                          |
| Insert task 4                  | **FAIL** with error code `23514` |
| Delete task 3, insert new task | Success                          |

### Premium/Lifetime User

| Action          | Expected Result    |
| --------------- | ------------------ |
| Insert task 1-3 | Success            |
| Insert task 4+  | Success (no limit) |

## Error Handling

When the RLS policy blocks an insert, PostgreSQL returns:

- **Error code**: `23514` (check_violation)
- **SQLSTATE**: `23514`
- **Message**: References the policy check constraint

In the application, catch this error:

```typescript
const { data, error } = await supabase.from('tasks').insert({ plan_id, title }).select().single()

if (error?.code === '23514') {
  // Free tier limit reached
  showUpgradeModal()
}
```

## Helper Function: `can_add_task()`

Use this function to check limits BEFORE attempting insert:

```sql
-- Returns TRUE if user can add more tasks to the plan
SELECT can_add_task('plan-uuid-here');
```

```typescript
const { data: canAdd } = await supabase.rpc('can_add_task', { p_plan_id: planId })

if (!canAdd) {
  showUpgradeModal()
  return
}
// Proceed with insert
```

## Changing User Tier for Testing

```sql
-- Set user to premium (replace with actual user ID)
UPDATE public.users
SET tier = 'premium'
WHERE id = 'user-uuid-here';

-- Set user back to free
UPDATE public.users
SET tier = 'free'
WHERE id = 'user-uuid-here';

-- Set user to lifetime
UPDATE public.users
SET tier = 'lifetime'
WHERE id = 'user-uuid-here';
```

## Verifying the Policy

Check that the policy exists and is enabled:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'tasks';
```

Expected output should include a row for `Users can insert tasks with tier limit` with `cmd = INSERT`.

## Troubleshooting

### Tasks not being limited for free user

1. Check user tier: `SELECT tier FROM public.users WHERE id = auth.uid();`
2. Verify RLS is enabled: `SELECT relrowsecurity FROM pg_class WHERE relname = 'tasks';`
3. Ensure migration was applied: Check `_migrations` table

### All inserts failing

1. Check if user owns the plan: `SELECT * FROM plans WHERE user_id = auth.uid();`
2. Verify auth is working: `SELECT auth.uid();` should return the user ID
3. Check for other policies that might conflict

### Premium user being limited

1. Verify tier is exactly `'premium'` or `'lifetime'` (case-sensitive)
2. Check `tier_expires_at` is NULL or in the future (though current policy doesn't check expiration)
