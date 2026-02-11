-- Migration: Rename Education Category to Home
-- Description: Updates system category from "Education" to "Home" based on user research
-- Research showed that for 25-45 demographic:
--   - Only 33% actively in formal learning
--   - 55% homeownership rate (100% have household responsibilities)
--   - Home tasks are high-frequency daily tasks (cleaning, errands, shopping)
--   - Education tasks naturally fit under Work (professional dev) or Personal (hobbies)
--
-- Changes:
--   - Name: Education → Home
--   - Icon: 📌 → 🏡 (house with garden, distinct from Personal's 🏠)
--   - Color: Keep #E8B86D (warm amber works well for home tasks)
--
-- Final category set: Work, Personal, Wellness, Home

-- ============================================================================
-- UPDATE SYSTEM CATEGORY
-- ============================================================================

UPDATE public.system_categories
SET
    name = 'Home',
    icon = '🏡'
WHERE name = 'Education';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running, verify with:
-- SELECT name, icon, color FROM public.system_categories ORDER BY position;
-- Expected: Work (💼), Personal (🏠), Wellness (❤️), Home (🏡)
