-- Rename system categories to use correct names
-- Health → Wellness
-- Other → Education

UPDATE public.system_categories
SET name = 'Wellness'
WHERE name = 'Health';

UPDATE public.system_categories
SET name = 'Education'
WHERE name = 'Other';
