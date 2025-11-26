# Today Screen Implementation Plan

> **Feature**: Today/Execution Screen
> **Date**: 2025-11-24
> **Status**: Planning

---

## Overview

Implement the "Today" screen (execution view) based on the provided Figma designs. This is the primary screen users see during the day to execute their planned tasks.

---

## Design Specifications

### Color Palette (from designs)

- **Background**: `#0a0a0f` (near-black)
- **Card Background**: `#1a1a2e` (dark purple-gray)
- **Primary/Accent**: `#a855f7` (purple-500)
- **Priority Colors**:
  - High: `#ef4444` (red-500)
  - Medium: `#f97316` (orange-500)
  - Low: `#22c55e` (green-500)
- **Text Primary**: `#ffffff`
- **Text Secondary**: `#9ca3af` (gray-400)

### Typography

- Day of week: 14px, gray
- Date: 32px, bold, white
- "Today" label: 18px, gray
- Task title: 16px, medium, white
- Task meta: 14px, gray
- Priority badge: 12px, uppercase

---

## Database Changes

### New Enum: `task_priority`

```sql
CREATE TYPE task_priority AS ENUM ('high', 'medium', 'low');
```

### Tasks Table Updates

```sql
ALTER TABLE tasks
  ADD COLUMN priority task_priority DEFAULT 'medium',
  ADD COLUMN estimated_duration_minutes INTEGER;
```

### Migration File

Create: `supabase/migrations/YYYYMMDD_add_task_priority_and_duration.sql`

---

## File Structure

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigator
│   │   ├── index.tsx            # Today screen (default tab)
│   │   ├── planning.tsx         # Placeholder
│   │   ├── feedback.tsx         # Placeholder
│   │   ├── analytics.tsx        # Placeholder
│   │   └── settings.tsx         # Placeholder
│   ├── _layout.tsx              # Root layout (update)
│   └── login.tsx                # Keep existing
├── components/
│   ├── today/
│   │   ├── TodayHeader.tsx      # Greeting + date + bell
│   │   ├── FocusCard.tsx        # MIT display card
│   │   ├── ProgressCard.tsx     # Circular progress card
│   │   ├── CardCarousel.tsx     # Horizontal swiper
│   │   ├── TaskItem.tsx         # Single task row
│   │   ├── TaskList.tsx         # List of incomplete tasks
│   │   ├── CompletedSection.tsx # Collapsible completed
│   │   └── AddTaskButton.tsx    # Bottom CTA
│   └── ui/
│       └── CircularProgress.tsx # SVG progress ring
├── hooks/
│   ├── usePlans.ts              # Plan queries/mutations
│   └── useTasks.ts              # Task queries/mutations
└── types/
    └── index.ts                 # Add Priority type
```

---

## Component Specifications

### 1. TodayHeader

**Props**: None (derives from current date/time)
**Features**:

- Time-based greeting (Good morning/afternoon/evening)
- Day of week
- Full date (e.g., "October 10th")
- "Today" label
- Notification bell icon (right side)

### 2. CardCarousel

**Props**: `children: ReactNode`
**Features**:

- Horizontal `ScrollView` with paging
- Pagination dots indicator
- Snaps to cards

### 3. FocusCard

**Props**: `task?: Task`
**Features**:

- Shows MIT task if set
- Empty state: "No focus set for today"
- Target/bullseye icon

### 4. ProgressCard

**Props**: `completed: number, total: number`
**Features**:

- Circular progress ring (SVG)
- Percentage in center
- "Today's Progress" label
- Completed/Remaining counts

### 5. CircularProgress

**Props**: `progress: number (0-100), size?: number, strokeWidth?: number`
**Features**:

- SVG-based ring
- Animated fill
- Purple gradient stroke

### 6. TaskItem

**Props**: `task: Task, onToggle: (id: string) => void`
**Features**:

- Colored left border based on priority
- Circular checkbox
- Task title
- Category + duration meta
- Priority badge (right side)

### 7. TaskList

**Props**: `tasks: Task[], onToggle: (id: string) => void`
**Features**:

- Maps tasks to TaskItem components
- Filters to show only incomplete

### 8. CompletedSection

**Props**: `tasks: Task[], onToggle: (id: string) => void`
**Features**:

- Collapsible accordion
- Shows count + "Great job!" badge
- Chevron toggle icon
- Lists completed tasks when expanded

### 9. AddTaskButton

**Props**: `onPress: () => void`
**Features**:

- Full-width purple button
- "+ Add Task" label
- Fixed at bottom (above tabs)

---

## React Query Hooks

### useTodayPlan

```typescript
function useTodayPlan() {
  // Get or create plan for today's date
  // Returns: { plan, isLoading, error }
}
```

### useTasks

```typescript
function useTasks(planId: string) {
  // Fetch all tasks for a plan with category data
  // Returns: { tasks, isLoading, error }
}
```

### useToggleTask

```typescript
function useToggleTask() {
  // Mutation to toggle task completion
  // Sets/clears completed_at timestamp
}
```

### useCreateTask

```typescript
function useCreateTask() {
  // Mutation to create new task
  // Handles free tier limit error
}
```

---

## Tab Navigation

### Tab Configuration

| Tab       | Icon             | Label     | Screen                 |
| --------- | ---------------- | --------- | ---------------------- |
| Today     | checkmark-circle | Today     | `(tabs)/index.tsx`     |
| Planning  | calendar         | Planning  | `(tabs)/planning.tsx`  |
| Feedback  | chat-bubble      | Feedback  | `(tabs)/feedback.tsx`  |
| Analytics | chart-bar        | Analytics | `(tabs)/analytics.tsx` |
| Settings  | cog              | Settings  | `(tabs)/settings.tsx`  |

### Tab Bar Styling

- Background: `#0a0a0f`
- Active: Purple (`#a855f7`)
- Inactive: Gray (`#6b7280`)
- Height: 60px + safe area

---

## Implementation Order

1. **Database**: Create migration for priority enum and estimated_duration
2. **Types**: Update TypeScript types, regenerate from Supabase
3. **Tab Navigation**: Set up `(tabs)` folder structure with placeholder screens
4. **Hooks**: Create useTodayPlan and useTasks hooks
5. **UI Components**: Build CircularProgress, then other components
6. **Today Screen**: Assemble all components
7. **Polish**: Animations, loading states, error handling

---

## Dependencies to Add

```bash
npm install react-native-svg  # For CircularProgress
```

Already have:

- `expo-router` (tabs support)
- `@tanstack/react-query` (data fetching)
- `nativewind` (styling)
- `clsx` (class merging)

---

## Testing Considerations

- [ ] Task toggle updates UI immediately (optimistic)
- [ ] Progress card updates when tasks completed
- [ ] Completed section count matches actual
- [ ] Carousel pagination dots sync with scroll
- [ ] Empty states render correctly
- [ ] Dark mode styling correct throughout
- [ ] Tab navigation works on iOS and Android

---

## Open Questions (Resolved)

1. ~~Priority field~~ → Adding `priority` enum (high/medium/low)
2. ~~Estimated duration~~ → Adding `estimated_duration_minutes` field
3. ~~Tab navigation~~ → Setting up with placeholders
4. ~~Data fetching~~ → Creating React Query hooks

---

## Notes

- The designs show dark mode only - ensure light mode also looks good
- MIT (Most Important Task) is shown on FocusCard, indicated by `is_mit` field
- Free tier limit (3 tasks) enforced at database level via RLS
- Plan locking prevents edits - execution screen should respect this
