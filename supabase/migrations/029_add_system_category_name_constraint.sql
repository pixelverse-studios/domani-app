-- Migration: Add CHECK constraint for valid system category names
-- Ensures only Work, Personal, Wellness, Home are allowed

-- Verify existing data passes constraint FIRST
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.system_categories
  WHERE name NOT IN ('Work', 'Personal', 'Wellness', 'Home');

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % invalid system category names. Cannot add constraint.', invalid_count;
  END IF;
END $$;

-- THEN add the constraint
ALTER TABLE public.system_categories
ADD CONSTRAINT valid_system_category_name
CHECK (name IN ('Work', 'Personal', 'Wellness', 'Home'));

-- Document the constraint
COMMENT ON CONSTRAINT valid_system_category_name ON public.system_categories IS
'Enforces that system categories can only be: Work, Personal, Wellness, Home.
If adding new system categories, update this constraint and:
- src/constants/systemCategories.ts (type definitions)
- src/constants/systemCategories.validation.ts (validation logic)';
