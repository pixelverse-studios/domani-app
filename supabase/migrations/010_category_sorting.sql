-- Migration: Category Sorting & Usage Tracking
-- Description: Adds usage tracking and auto-sort preference for categories
-- Ticket: DOM-111

-- ============================================================================
-- ADD USAGE COUNT TO CATEGORIES
-- ============================================================================

-- Add usage_count to user_categories (tracks how often each category is used)
ALTER TABLE public.user_categories
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.user_categories.usage_count IS 'Number of times this category has been used in tasks';

-- ============================================================================
-- ADD AUTO-SORT PREFERENCE TO PROFILES
-- ============================================================================

-- Add auto_sort_categories preference to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auto_sort_categories BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.auto_sort_categories IS 'When true, categories are sorted by usage_count DESC instead of manual position';

-- ============================================================================
-- USER CATEGORY PREFERENCES TABLE
-- ============================================================================
-- Stores per-user preferences for system categories (position overrides, usage counts)

CREATE TABLE IF NOT EXISTS public.user_category_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    system_category_id UUID REFERENCES public.system_categories(id) ON DELETE CASCADE NOT NULL,
    position INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, system_category_id)
);

COMMENT ON TABLE public.user_category_preferences IS 'Per-user preferences for system categories including custom position and usage tracking';

-- Enable RLS
ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own category preferences" ON public.user_category_preferences;
CREATE POLICY "Users can view own category preferences"
    ON public.user_category_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own category preferences" ON public.user_category_preferences;
CREATE POLICY "Users can insert own category preferences"
    ON public.user_category_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own category preferences" ON public.user_category_preferences;
CREATE POLICY "Users can update own category preferences"
    ON public.user_category_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own category preferences" ON public.user_category_preferences;
CREATE POLICY "Users can delete own category preferences"
    ON public.user_category_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_category_preferences_user_id
    ON public.user_category_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_preferences_user_position
    ON public.user_category_preferences(user_id, position);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER user_category_preferences_updated_at
    BEFORE UPDATE ON public.user_category_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: INCREMENT CATEGORY USAGE
-- ============================================================================
-- Call this when a task is created with a category

CREATE OR REPLACE FUNCTION increment_category_usage(
    p_user_id UUID,
    p_system_category_id UUID DEFAULT NULL,
    p_user_category_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Increment user category usage if provided
    IF p_user_category_id IS NOT NULL THEN
        UPDATE public.user_categories
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = p_user_category_id
          AND user_id = p_user_id;
    END IF;

    -- Increment or create user preference for system category if provided
    IF p_system_category_id IS NOT NULL THEN
        INSERT INTO public.user_category_preferences (user_id, system_category_id, usage_count, position)
        VALUES (
            p_user_id,
            p_system_category_id,
            1,
            (SELECT COALESCE(position, 0) FROM public.system_categories WHERE id = p_system_category_id)
        )
        ON CONFLICT (user_id, system_category_id)
        DO UPDATE SET
            usage_count = public.user_category_preferences.usage_count + 1,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_category_usage IS 'Increments usage count for a category when a task is created';

-- ============================================================================
-- FUNCTION: UPDATE CATEGORY POSITIONS
-- ============================================================================
-- Batch update positions for categories after reorder

CREATE OR REPLACE FUNCTION update_category_positions(
    p_user_id UUID,
    p_category_positions JSONB
)
RETURNS VOID AS $$
DECLARE
    v_item JSONB;
    v_category_id UUID;
    v_position INTEGER;
    v_is_system BOOLEAN;
BEGIN
    -- p_category_positions format: [{"id": "uuid", "position": 0, "isSystem": true}, ...]
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_category_positions)
    LOOP
        v_category_id := (v_item->>'id')::UUID;
        v_position := (v_item->>'position')::INTEGER;
        v_is_system := (v_item->>'isSystem')::BOOLEAN;

        IF v_is_system THEN
            -- Update or insert user preference for system category
            INSERT INTO public.user_category_preferences (user_id, system_category_id, position)
            VALUES (p_user_id, v_category_id, v_position)
            ON CONFLICT (user_id, system_category_id)
            DO UPDATE SET
                position = v_position,
                updated_at = NOW();
        ELSE
            -- Update user category position
            UPDATE public.user_categories
            SET position = v_position,
                updated_at = NOW()
            WHERE id = v_category_id
              AND user_id = p_user_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_category_positions IS 'Batch updates category positions after drag-and-drop reorder';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_category_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION increment_category_usage(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_category_positions(UUID, JSONB) TO authenticated;
