-- Migration: Update Category Colors to Sage Theme
-- Description: Updates system_categories colors to match the sage/muted theme aesthetic
-- Ticket: Color Redesign
-- Previous colors were too vibrant (blue, green, purple, gray)
-- New colors are muted, earthy tones that align with the sage theme

-- ============================================================================
-- UPDATE SYSTEM CATEGORY COLORS
-- ============================================================================

-- Update category colors to match sage theme
-- Work: Muted blue-gray (#8B9DAF) - professional, calm
-- Wellness: Terracotta (#D77A61) - warm, nurturing
-- Personal: Sage green (#7D9B8A) - balanced, personal
-- Education: Warm amber (#E8B86D) - growth, learning (renamed to Home in migration 027)

UPDATE public.system_categories
SET color = CASE name
    WHEN 'Work' THEN '#8B9DAF'
    WHEN 'Wellness' THEN '#D77A61'
    WHEN 'Personal' THEN '#7D9B8A'
    WHEN 'Education' THEN '#E8B86D'
    ELSE color
END,
updated_at = NOW()
WHERE name IN ('Work', 'Wellness', 'Personal', 'Education');

-- Note: These colors are also defined in src/theme/themes.ts priority section
-- They provide enough contrast for chart readability while matching the overall aesthetic
