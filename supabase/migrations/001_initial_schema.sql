-- Domani Initial Schema Migration
-- Description: Creates the core database schema for the Domani productivity app
-- Tables: users, categories, plans, tasks
-- Includes: Indexes, triggers, RLS policies, and default data

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USERS TABLE (extends auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'lifetime')),
    tier_expires_at TIMESTAMPTZ,
    stripe_customer_id VARCHAR(255) UNIQUE,
    push_token TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON COLUMN public.users.tier IS 'Subscription tier: free (default), premium, or lifetime';
COMMENT ON COLUMN public.users.tier_expires_at IS 'When premium subscription expires (NULL for lifetime/free)';
COMMENT ON COLUMN public.users.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN public.users.push_token IS 'Device push notification token';

-- Trigger for updated_at
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    emoji VARCHAR(10),
    position INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.categories IS 'Task categories for organizing tasks';
COMMENT ON COLUMN public.categories.color IS 'Hex color code for category (e.g., #FF5733)';
COMMENT ON COLUMN public.categories.is_default IS 'True for system default categories, false for user-created';
COMMENT ON COLUMN public.categories.position IS 'Display order position';

-- ============================================================================
-- PLANS TABLE (daily planning containers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    planned_for DATE NOT NULL,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, planned_for)
);

COMMENT ON TABLE public.plans IS 'Daily planning containers - one per user per day';
COMMENT ON COLUMN public.plans.planned_for IS 'The date this plan is for (e.g., tomorrow)';
COMMENT ON COLUMN public.plans.locked_at IS 'When plan was locked (prevents midnight anxiety editing)';

-- Trigger for updated_at
CREATE TRIGGER plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    is_mit BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.tasks IS 'Individual tasks within a daily plan';
COMMENT ON COLUMN public.tasks.is_mit IS 'Most Important Task flag - one per plan';
COMMENT ON COLUMN public.tasks.completed_at IS 'When task was marked complete (NULL if incomplete)';
COMMENT ON COLUMN public.tasks.position IS 'Display order position within the plan';

-- Trigger for updated_at
CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_tier ON public.users(tier);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_position ON public.categories(user_id, position);

-- Plans indexes
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_planned_for ON public.plans(planned_for);
CREATE INDEX IF NOT EXISTS idx_plans_user_planned_for ON public.plans(user_id, planned_for);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_plan_id ON public.tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON public.tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_plan_position ON public.tasks(plan_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON public.tasks(completed_at) WHERE completed_at IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- --------------------------
-- Users Policies
-- --------------------------

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
    ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- --------------------------
-- Categories Policies
-- --------------------------

DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories"
    ON public.categories
    FOR SELECT
    USING (auth.uid() = user_id OR is_default = TRUE);

DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories"
    ON public.categories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories"
    ON public.categories
    FOR UPDATE
    USING (auth.uid() = user_id AND is_default = FALSE)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own non-default categories" ON public.categories;
CREATE POLICY "Users can delete own non-default categories"
    ON public.categories
    FOR DELETE
    USING (auth.uid() = user_id AND is_default = FALSE);

-- --------------------------
-- Plans Policies
-- --------------------------

DROP POLICY IF EXISTS "Users can view own plans" ON public.plans;
CREATE POLICY "Users can view own plans"
    ON public.plans
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own plans" ON public.plans;
CREATE POLICY "Users can insert own plans"
    ON public.plans
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own unlocked plans" ON public.plans;
CREATE POLICY "Users can update own unlocked plans"
    ON public.plans
    FOR UPDATE
    USING (auth.uid() = user_id AND locked_at IS NULL)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own unlocked plans" ON public.plans;
CREATE POLICY "Users can delete own unlocked plans"
    ON public.plans
    FOR DELETE
    USING (auth.uid() = user_id AND locked_at IS NULL);

-- --------------------------
-- Tasks Policies
-- --------------------------

DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks"
    ON public.tasks
    FOR SELECT
    USING (
        plan_id IN (
            SELECT id FROM public.plans WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert tasks with tier limit" ON public.tasks;
CREATE POLICY "Users can insert tasks with tier limit"
    ON public.tasks
    FOR INSERT
    WITH CHECK (
        -- Verify task belongs to user's plan
        plan_id IN (SELECT id FROM public.plans WHERE user_id = auth.uid())
        AND (
            -- Premium/Lifetime users have no limit
            (SELECT tier FROM public.users WHERE id = auth.uid()) IN ('premium', 'lifetime')
            OR
            -- Free tier users limited to 3 tasks per plan
            (SELECT COUNT(*) FROM public.tasks WHERE plan_id = tasks.plan_id) < 3
        )
    );

DROP POLICY IF EXISTS "Users can update own tasks in unlocked plans" ON public.tasks;
CREATE POLICY "Users can update own tasks in unlocked plans"
    ON public.tasks
    FOR UPDATE
    USING (
        plan_id IN (
            SELECT id FROM public.plans
            WHERE user_id = auth.uid() AND locked_at IS NULL
        )
    )
    WITH CHECK (
        plan_id IN (
            SELECT id FROM public.plans
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own tasks in unlocked plans" ON public.tasks;
CREATE POLICY "Users can delete own tasks in unlocked plans"
    ON public.tasks
    FOR DELETE
    USING (
        plan_id IN (
            SELECT id FROM public.plans
            WHERE user_id = auth.uid() AND locked_at IS NULL
        )
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to create default categories for a new user
CREATE OR REPLACE FUNCTION create_default_categories_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.categories (user_id, name, color, emoji, position, is_default)
    VALUES
        (NEW.id, 'Work', '#3B82F6', '💼', 0, TRUE),
        (NEW.id, 'Personal', '#10B981', '🏠', 1, TRUE),
        (NEW.id, 'Health', '#EF4444', '❤️', 2, TRUE),
        (NEW.id, 'Other', '#6B7280', '📌', 3, TRUE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default categories when a new user is created
CREATE TRIGGER on_user_created_add_default_categories
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_categories_for_user();

-- Function to ensure only one MIT per plan
CREATE OR REPLACE FUNCTION ensure_single_mit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_mit = TRUE THEN
        UPDATE public.tasks
        SET is_mit = FALSE
        WHERE plan_id = NEW.plan_id
          AND id != NEW.id
          AND is_mit = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single MIT per plan
CREATE TRIGGER ensure_single_mit_trigger
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    WHEN (NEW.is_mit = TRUE)
    EXECUTE FUNCTION ensure_single_mit();

-- Function to handle new auth user creation
-- This creates a corresponding public.users record
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to create public.users record
-- Note: This trigger is created on auth.users which is a Supabase managed table
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_auth_user();

-- ============================================================================
-- HELPER FUNCTIONS FOR APPLICATION USE
-- ============================================================================

-- Function to check if user can add more tasks (respects tier limits)
CREATE OR REPLACE FUNCTION can_add_task(p_plan_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_tier VARCHAR(20);
    v_task_count INTEGER;
    v_user_id UUID;
BEGIN
    -- Get user_id from plan
    SELECT user_id INTO v_user_id FROM public.plans WHERE id = p_plan_id;

    -- Verify requesting user owns this plan
    IF v_user_id != auth.uid() THEN
        RETURN FALSE;
    END IF;

    -- Get user tier
    SELECT tier INTO v_user_tier FROM public.users WHERE id = v_user_id;

    -- Premium/Lifetime can always add
    IF v_user_tier IN ('premium', 'lifetime') THEN
        RETURN TRUE;
    END IF;

    -- Count current tasks for free tier
    SELECT COUNT(*) INTO v_task_count FROM public.tasks WHERE plan_id = p_plan_id;

    RETURN v_task_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create a plan for a specific date
CREATE OR REPLACE FUNCTION get_or_create_plan(p_date DATE)
RETURNS UUID AS $$
DECLARE
    v_plan_id UUID;
BEGIN
    -- Try to get existing plan
    SELECT id INTO v_plan_id
    FROM public.plans
    WHERE user_id = auth.uid() AND planned_for = p_date;

    -- Create if not exists
    IF v_plan_id IS NULL THEN
        INSERT INTO public.plans (user_id, planned_for)
        VALUES (auth.uid(), p_date)
        RETURNING id INTO v_plan_id;
    END IF;

    RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT SELECT ON public.users TO anon, authenticated;
GRANT INSERT, UPDATE ON public.users TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT ON public.categories TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION can_add_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_plan(DATE) TO authenticated;
