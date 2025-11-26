-- Test Script: Free Tier 3-Task Limit RLS Policy
-- Run this script in Supabase SQL Editor to verify the RLS policy works
--
-- SETUP: This test assumes you have:
-- 1. A user with 'free' tier in public.users
-- 2. A user with 'premium' or 'lifetime' tier in public.users
--
-- The RLS policy being tested (from 001_initial_schema.sql):
--   - Free tier users: max 3 tasks per plan
--   - Premium/Lifetime users: unlimited tasks

-- ============================================================================
-- PART 1: Verify the RLS policy exists and has correct structure
-- ============================================================================

SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'tasks' AND policyname = 'Users can insert tasks with tier limit';

-- Expected: Should show the INSERT policy with WITH CHECK clause containing tier logic

-- ============================================================================
-- PART 2: Verify helper function exists
-- ============================================================================

SELECT
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'can_add_task' AND routine_schema = 'public';

-- Expected: Should return one row showing can_add_task function

-- ============================================================================
-- PART 3: Test can_add_task function (run as authenticated user)
-- ============================================================================

-- To test manually, use these queries in Supabase:

-- Step 1: Get a test user's plan ID
-- SELECT id FROM public.plans WHERE user_id = auth.uid() LIMIT 1;

-- Step 2: Test the helper function (replace with actual plan_id)
-- SELECT can_add_task('YOUR_PLAN_ID_HERE');

-- ============================================================================
-- PART 4: Verify tier distribution in users table
-- ============================================================================

SELECT
    tier,
    COUNT(*) as user_count
FROM public.users
GROUP BY tier;

-- Expected: Shows count of users per tier (free, premium, lifetime)

-- ============================================================================
-- PART 5: Count tasks per plan for debugging
-- ============================================================================

SELECT
    p.id as plan_id,
    p.planned_for,
    u.tier,
    COUNT(t.id) as task_count
FROM public.plans p
JOIN public.users u ON p.user_id = u.id
LEFT JOIN public.tasks t ON t.plan_id = p.id
GROUP BY p.id, p.planned_for, u.tier
ORDER BY p.planned_for DESC
LIMIT 10;

-- Expected: Shows recent plans with their task counts and user tier

-- ============================================================================
-- MANUAL TESTING INSTRUCTIONS
-- ============================================================================
/*
To fully test the RLS policy, follow these steps:

=== TEST 1: Free Tier User (Should Allow Max 3 Tasks) ===

1. Sign in as a free tier user
2. Create or use an existing plan for tomorrow
3. Add Task 1: Should succeed
4. Add Task 2: Should succeed
5. Add Task 3: Should succeed
6. Add Task 4: Should FAIL with error code 23514

Expected behavior: 4th insert fails, tasks 1-3 remain in plan

=== TEST 2: Premium/Lifetime User (Unlimited Tasks) ===

1. Sign in as a premium or lifetime user
2. Create or use an existing plan
3. Add Tasks 1-5+: All should succeed

Expected behavior: No limit enforced

=== TEST 3: Verify Error Code ===

When free tier user hits limit, the PostgreSQL error should be:
- Error code: 23514 (check_violation)
- Message will reference the WITH CHECK constraint

=== TEST 4: Verify can_add_task() Function ===

-- As free tier user with 2 tasks:
SELECT can_add_task('plan-uuid-here');  -- Returns TRUE

-- As free tier user with 3 tasks:
SELECT can_add_task('plan-uuid-here');  -- Returns FALSE

-- As premium user with any number of tasks:
SELECT can_add_task('plan-uuid-here');  -- Returns TRUE

*/

-- ============================================================================
-- CLEANUP HELPER (for test data, use carefully)
-- ============================================================================
/*
-- Delete test tasks from a specific plan (run as the user who owns the plan)
DELETE FROM public.tasks WHERE plan_id = 'YOUR_TEST_PLAN_ID';
*/
