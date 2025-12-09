-- Migration: Favorite Categories
-- Description: Adds is_favorite column to track which categories are favorites (max 4)
-- Ticket: DOM-111

-- ============================================================================
-- ADD IS_FAVORITE TO USER_CATEGORY_PREFERENCES
-- ============================================================================

-- Add is_favorite column to user_category_preferences for system categories
ALTER TABLE public.user_category_preferences
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.user_category_preferences.is_favorite IS 'Whether this system category is in the user favorites (max 4 total)';

-- Add is_favorite column to user_categories for custom categories
ALTER TABLE public.user_categories
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.user_categories.is_favorite IS 'Whether this custom category is in the user favorites (max 4 total)';

-- ============================================================================
-- FUNCTION: UPDATE FAVORITE CATEGORIES
-- ============================================================================
-- Updates which categories are marked as favorites (max 4)

CREATE OR REPLACE FUNCTION update_favorite_categories(
    p_user_id UUID,
    p_favorite_category_ids JSONB
)
RETURNS VOID AS $$
DECLARE
    v_category_id UUID;
    v_total_count INTEGER;
BEGIN
    -- Validate max 4 favorites
    v_total_count := jsonb_array_length(p_favorite_category_ids);
    IF v_total_count > 4 THEN
        RAISE EXCEPTION 'Maximum 4 favorite categories allowed';
    END IF;

    -- First, unfavorite all system category preferences for this user
    UPDATE public.user_category_preferences
    SET is_favorite = false, updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Unfavorite all user categories for this user
    UPDATE public.user_categories
    SET is_favorite = false, updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Now mark the selected categories as favorites
    FOR v_category_id IN SELECT jsonb_array_elements_text(p_favorite_category_ids)::UUID
    LOOP
        -- Try to update user_category_preferences (system categories)
        -- Use upsert in case the preference doesn't exist yet
        INSERT INTO public.user_category_preferences (user_id, system_category_id, is_favorite, position)
        SELECT p_user_id, v_category_id, true, COALESCE(
            (SELECT position FROM public.system_categories WHERE id = v_category_id),
            0
        )
        WHERE EXISTS (SELECT 1 FROM public.system_categories WHERE id = v_category_id)
        ON CONFLICT (user_id, system_category_id)
        DO UPDATE SET is_favorite = true, updated_at = NOW();

        -- Try to update user_categories (custom categories)
        UPDATE public.user_categories
        SET is_favorite = true, updated_at = NOW()
        WHERE id = v_category_id AND user_id = p_user_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_favorite_categories IS 'Updates which categories are marked as favorites (max 4)';

-- ============================================================================
-- FUNCTION: GET FAVORITE CATEGORIES
-- ============================================================================
-- Returns all favorite category IDs for a user

CREATE OR REPLACE FUNCTION get_favorite_category_ids(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_agg(category_id) INTO v_result
    FROM (
        -- System category favorites
        SELECT ucp.system_category_id as category_id
        FROM public.user_category_preferences ucp
        WHERE ucp.user_id = p_user_id AND ucp.is_favorite = true

        UNION ALL

        -- User category favorites
        SELECT uc.id as category_id
        FROM public.user_categories uc
        WHERE uc.user_id = p_user_id AND uc.is_favorite = true
    ) favorites;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_favorite_category_ids IS 'Returns all favorite category IDs for a user';

-- ============================================================================
-- INITIALIZE DEFAULT FAVORITES
-- ============================================================================
-- Set all 4 system categories as favorites by default for existing users
-- This runs once during migration

-- For users who have preferences, mark system categories as favorites
UPDATE public.user_category_preferences
SET is_favorite = true
WHERE system_category_id IN (SELECT id FROM public.system_categories WHERE is_active = true);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION update_favorite_categories(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_favorite_category_ids(UUID) TO authenticated;
