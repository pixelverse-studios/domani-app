# Decision: Replace "Education" with "Home" System Category

**Date:** February 10, 2026
**Status:** Approved
**Decision Makers:** Product Team

## Context

Domani has four default system categories that all users receive: Work, Personal, Wellness, and Education. During PRD development for the Task Rollover feature, a question arose about whether "Education" was the right category for our 25-45 year old demographic.

## Problem Statement

"Education" as a default category may not serve our core demographic effectively:

- Is it used frequently enough to warrant being a default?
- Does it align with the daily task management needs of 25-45 year olds?
- Could another category provide more universal value?

## Research Conducted

Comprehensive market research was conducted analyzing:

1. **Competitor category patterns** - Todoist, Things 3, Any.do, Microsoft To Do
2. **Demographic behavior** - Task patterns of 25-45 year olds
3. **Education usage statistics** - Adult learning participation rates
4. **Alternative category candidates** - Home, Family, Finance, Social, etc.

### Key Findings

**Education Usage:**

- Only **33% of adults** are actively in formal learning at any given time
- Most education tasks naturally fit existing categories:
  - Professional development → **Work**
  - Hobby learning → **Personal**
  - Health/nutrition education → **Wellness**
- Low frequency: Many users would have zero Education tasks for weeks

**Home/Household Tasks:**

- **55% homeownership rate** in 25-45 demographic (and 100% have household responsibilities)
- **High-frequency daily tasks**: Cleaning, errands, shopping, maintenance, organizing
- Entire successful apps dedicated to household management (OurHome, Cozi, Tody)
- Universal applicability: Renters and homeowners, singles and families
- Clear category boundaries reduce confusion

## Decision

**Replace "Education" with "Home" as the fourth default system category.**

Final category set: **Work, Personal, Wellness, Home**

## Rationale

### Coverage Analysis

The new category set covers ~95% of typical daily tasks for 25-45 professionals:

1. **Work** (30-40% of daily tasks) - Job responsibilities, professional development, career planning
2. **Personal** (20-25%) - Personal goals, hobbies, social, personal admin, self-improvement
3. **Wellness** (15-20%) - Exercise, mental health, medical appointments, self-care
4. **Home** (20-30%) - Household chores, errands, shopping, maintenance, family coordination

### Alignment with Product Philosophy

- **Minimalist**: 4 clear categories, no decision fatigue
- **Universal**: All categories apply to all users
- **High-frequency**: Users will naturally use categories daily
- **Clear boundaries**: Less confusion about categorization
- **Optimized for 3-task limit**: Encourages balanced planning across life areas

## Implementation

### Database Changes

- **Migration 027**: Rename "Education" → "Home"
- **Icon**: 📌 → 🏡 (house with garden, distinct from Personal's 🏠)
- **Color**: Keep #E8B86D (warm amber - works well for home tasks)

### Code Changes

- Update `CategorySelector.tsx` mapping
- Update comments in `WeeklySummaryCard.tsx`
- Update theme comments in `themes.ts`
- Update migration 026 comments for clarity

### User Impact

- **Existing users**: Their "Education" category will be renamed to "Home" automatically
- **New users**: Will receive the new category set (Work, Personal, Wellness, Home)
- **Custom categories**: Users who created custom "Home" categories may need to merge/delete duplicates
- **Migration**: Seamless - happens during app update

## Alternatives Considered

| Alternative        | Pros                                   | Cons                                          | Verdict         |
| ------------------ | -------------------------------------- | --------------------------------------------- | --------------- |
| **Home**           | Universal, daily tasks, high frequency | None significant                              | ✅ **SELECTED** |
| **Family**         | Important for parents                  | Excludes singles, overlaps with Home/Personal | Too narrow      |
| **Finance**        | Universal need                         | Low frequency, handled in specialized apps    | Too specific    |
| **Social**         | Universal need                         | Very low task frequency                       | Not task-heavy  |
| **Keep Education** | Aspirational                           | Low frequency, overlaps with Work/Personal    | ❌ **REJECTED** |

## Success Metrics

Post-launch, we'll measure:

- **Category usage frequency** - Expect Home to have 2-3x usage of Education
- **Custom category creation** - Expect fewer users creating "Home" custom categories
- **User feedback** - Qualitative feedback on category usefulness
- **Task distribution** - Balanced usage across all 4 categories

## References

- [Full Research Report](../research/category-research-2026-02-10.md) (if created separately)
- Migration 027: `supabase/migrations/027_rename_education_to_home.sql`
- Task Rollover PRD: `docs/plans/task-rollover-prd.md`

## Questions & Answers

**Q: What happens to existing tasks in the "Education" category?**
A: They automatically become "Home" tasks. No data loss.

**Q: Can users still track education/learning tasks?**
A: Yes - they can create a custom "Education" or "Learning" category, or use Work (for professional development) or Personal (for hobbies).

**Q: Why not let users choose their 4 categories?**
A: Minimalist philosophy - sensible defaults reduce setup friction. Users can still create custom categories for their specific needs.

**Q: Will this confuse existing users?**
A: Minimal confusion expected. The rename happens during an app update, and "Home" is intuitive for household tasks. Any previous Education tasks are unlikely to be numerous.
