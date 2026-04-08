# Plans Usage Audit

Generated: 2026-03-24

## What Plans Are

Plans are **date-based containers** for tasks. Each plan represents one day for one user. Tasks don't have their own date — they get their date from the plan they belong to via `plan_id` foreign key.

```
User → Plan (date: 2026-03-24) → Task A, Task B, Task C
User → Plan (date: 2026-03-25) → Task D, Task E
```

## Database Schema

### `plans` table

| Column          | Type             | Notes                                 |
| --------------- | ---------------- | ------------------------------------- |
| id              | UUID             | Primary key                           |
| user_id         | UUID             | FK to users, CASCADE delete           |
| planned_for     | DATE             | The day this plan is for              |
| status          | plan_status enum | draft/active/completed                |
| locked_at       | TIMESTAMPTZ      | Deprecated (removed in migration 030) |
| completed_at    | TIMESTAMPTZ      |                                       |
| completion_rate | NUMERIC          |                                       |
| morning_notes   | TEXT             | Unused                                |
| evening_notes   | TEXT             | Unused                                |
| created_at      | TIMESTAMPTZ      |                                       |
| updated_at      | TIMESTAMPTZ      | Auto-updated via trigger              |

**Unique constraint:** `(user_id, planned_for)` — one plan per user per day.

### `tasks` table dependency

```sql
plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL
```

Every task must belong to a plan. Deleting a plan cascades to delete all its tasks.

### RLS policies

All task access is mediated through plan ownership:

```sql
plan_id IN (SELECT id FROM public.plans WHERE user_id = auth.uid())
```

### Database functions

- **`get_or_create_plan(p_date DATE)`** — Returns existing plan for date or creates one
- **`can_add_task(p_plan_id UUID)`** — Validates user owns plan + tier limits

## How Plans Are Used in the App

### Core Query Pattern

Almost everything follows this flow:

1. Get/create a plan for a date → get `plan_id`
2. Query tasks WHERE `plan_id = ?`

### Hooks (src/hooks/)

| Hook                        | File                       | What it does                                  |
| --------------------------- | -------------------------- | --------------------------------------------- |
| `usePlanForDate(dateStr)`   | usePlans.ts                | Calls `get_or_create_plan` RPC for a date     |
| `useTodayPlan()`            | usePlans.ts                | Wrapper: `usePlanForDate(today)`              |
| `useTomorrowPlan()`         | usePlans.ts                | Wrapper: `usePlanForDate(tomorrow)`           |
| `usePlan(planId)`           | usePlans.ts                | Direct plan lookup by ID                      |
| `useTasks(planId)`          | useTasks.ts                | Gets all tasks for a plan                     |
| `useCreateTask()`           | useTasks.ts                | Requires `planId` to create a task            |
| `useUpdateTask()`           | useTasks.ts                | Can update `plan_id` to move between days     |
| `useRolloverTasks()`        | useRolloverTasks.ts        | Gets yesterday's plan → incomplete tasks      |
| `useEveningRolloverTasks()` | useEveningRolloverTasks.ts | Gets today/yesterday plans → incomplete tasks |

### Screens

| Screen                          | Plan usage                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| **Today** (`index.tsx`)         | `useTodayPlan()` → `useTasks(plan?.id)`                                             |
| **Planning** (`planning.tsx`)   | `usePlanForDate(todayDate)` + `usePlanForDate(tomorrowDate)` → `useTasks(plan?.id)` |
| **Root layout** (`_layout.tsx`) | `useTomorrowPlan()` / `usePlanForDate(today)` for evening rollover target           |

### Rollover System (src/lib/rollover.ts)

- `carryForwardTasks()` takes a `targetPlanId` and creates new tasks in that plan
- Tasks are copied (not moved) — originals stay in old plan with `rolled_over_at` set

### Analytics (src/lib/analytics-queries.ts)

- Planning streak: counts consecutive days with plans
- Perfect day streak: checks if all tasks in a plan were completed
- Task grouping: joins tasks with plans via `plan_id` to get dates

## What Would Need to Change to Remove Plans

### Option A: Replace `plan_id` with `scheduled_date` on tasks

The simplest conceptual replacement — tasks get their own date field instead of inheriting it from a plan.

**Database changes:**

1. Add `scheduled_date DATE` column to `tasks` table
2. Backfill from `plans.planned_for` via JOIN
3. Update all RLS policies to use `user_id = auth.uid()` directly (no plan intermediary)
4. Remove `plan_id` foreign key from tasks
5. Drop `plans` table
6. Drop `get_or_create_plan()` and `can_add_task()` functions
7. Update unique constraints and indexes

**Hook changes:**

1. **Delete** `usePlans.ts` entirely (usePlanForDate, useTodayPlan, useTomorrowPlan, usePlan)
2. **Rewrite** `useTasks.ts` — query by `scheduled_date` + `user_id` instead of `plan_id`
3. **Rewrite** `useCreateTask` — set `scheduled_date` instead of `plan_id`
4. **Rewrite** `useUpdateTask` — change `scheduled_date` instead of `plan_id` to move tasks
5. **Rewrite** `useRolloverTasks.ts` — query by `scheduled_date < today` instead of plan lookup
6. **Rewrite** `useEveningRolloverTasks.ts` — same pattern
7. **Rewrite** `useCarryForwardTasks.ts` / `rollover.ts` — set `scheduled_date` on new tasks

**Screen changes:**

1. **Today** (`index.tsx`) — use `useTasks(todayDate)` instead of `useTodayPlan()` → `useTasks(plan?.id)`
2. **Planning** (`planning.tsx`) — remove plan intermediary, query tasks directly by date
3. **Root layout** (`_layout.tsx`) — remove plan fetching for rollover target

**Analytics changes:**

1. Replace all `plans!inner(planned_for)` joins with direct `scheduled_date` queries
2. Planning streak: count distinct `scheduled_date` values instead of plan existence
3. Perfect day streak: group by `scheduled_date` instead of `plan_id`

**Type changes:**

1. Remove Plan, PlanInsert, PlanUpdate, PlanStatus from `src/types/index.ts`
2. Regenerate `src/types/supabase.ts` after schema change

### Option B: Keep plans as an implementation detail, hide behind hooks

Less disruptive — keep the `plans` table but make it invisible to components.

1. Create a `useTasksForDate(date)` hook that internally does plan lookup + task fetch
2. Create a `useCreateTaskForDate(date, task)` that internally resolves plan
3. Components never see `plan_id` — they just work with dates

### Estimated Scope

| Approach                     | Files touched           | Risk                                    | Effort   |
| ---------------------------- | ----------------------- | --------------------------------------- | -------- |
| Option A (full removal)      | ~15 files + 1 migration | High — touches RLS, rollover, analytics | 2-3 days |
| Option B (hide behind hooks) | ~8 files                | Medium — existing DB stays intact       | 1 day    |

### Key Risk: RLS Policies

The current RLS policies on `tasks` use plan ownership to verify access:

```sql
plan_id IN (SELECT id FROM plans WHERE user_id = auth.uid())
```

Without plans, tasks would need their own `user_id` column (they already have one) and RLS would simplify to:

```sql
user_id = auth.uid()
```

This is actually simpler and eliminates the subquery overhead.
