-- DEV-12: Remove 3-task limit RLS policy
--
-- With the removal of the free tier, there is no longer a concept of a
-- limited-task user. 'none' tier users are locked out at the app level
-- entirely; they should never reach the point of adding tasks.
--
-- Two changes:
--
-- 1. Update can_add_task() so that 'none' tier users explicitly return FALSE
--    instead of falling through to the old "count < 3" free-tier check.
--    The count check is removed entirely since no tier should hit it.
--
-- 2. Drop get_task_count_for_plan() — it was only used by the old task-limit
--    RLS policies and is no longer referenced anywhere in the codebase.

-- Step 1: Update can_add_task() to return FALSE for 'none' tier users.
-- Previously the function fell through to `RETURN v_task_count < 3` for any
-- tier that wasn't 'trialing' or 'lifetime', effectively giving 'none' users
-- a 3-task allowance. That allowance is now removed.
CREATE OR REPLACE FUNCTION can_add_task(p_plan_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_tier VARCHAR(20);
    v_user_id UUID;
BEGIN
    -- Get user_id from plan
    SELECT user_id INTO v_user_id FROM public.plans WHERE id = p_plan_id;

    -- Verify requesting user owns this plan
    IF v_user_id != auth.uid() THEN
        RETURN FALSE;
    END IF;

    -- Get user tier
    SELECT tier INTO v_user_tier FROM public.profiles WHERE id = v_user_id;

    -- Trialing/Lifetime users can always add tasks
    IF v_user_tier IN ('trialing', 'lifetime') THEN
        RETURN TRUE;
    END IF;

    -- 'none' tier (trial expired) is locked out entirely — no task additions allowed
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop get_task_count_for_plan() — only used by the old task-limit
-- RLS policies which have since been replaced. No longer referenced anywhere.
DROP FUNCTION IF EXISTS public.get_task_count_for_plan(uuid);
