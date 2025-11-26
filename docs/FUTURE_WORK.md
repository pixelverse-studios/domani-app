# Future Work & Optimization Backlog

> Running list of planned features, improvements, and technical debt.
> Add items here as they come up during development to ensure nothing falls through the cracks.

---

## High Priority

### Add Task Modal

**Context**: The Today screen has an "Add Task" button but no modal to create tasks yet.
**Scope**:

- Modal component with form fields: title, description, category, priority, estimated duration
- Category picker (dropdown or chips)
- Priority selector (High/Medium/Low with color preview)
- Duration picker (preset options: 15m, 30m, 1h, 2h, custom)
- MIT toggle (mark as Most Important Task)
- Integration with `useCreateTask` hook
- Free tier limit handling (show upgrade prompt on 4th task)
  **Files to create/modify**: `src/components/today/AddTaskModal.tsx`, `src/app/(tabs)/index.tsx`

### Task Detail/Edit Modal

**Context**: Tapping a task should open a detail view for editing or viewing more info.
**Scope**:

- View task details (full description, time blocks, notes)
- Edit all task fields
- Delete task with confirmation
- Mark as MIT
- Integration with `useUpdateTask` and `useDeleteTask` hooks
  **Files to create/modify**: `src/components/today/TaskDetailModal.tsx`

### Planning Screen Implementation

**Context**: The evening planning flow is core to Domani's philosophy - "Plan Tomorrow Tonight"
**Scope**:

- Show tomorrow's plan (or create if doesn't exist)
- Add/edit/reorder tasks for tomorrow
- MIT selection (exactly one task)
- Lock plan functionality (prevents midnight anxiety editing)
- Evening reminder integration
- Different UI than Today screen (planning vs execution mindset)
  **Files to modify**: `src/app/(tabs)/planning.tsx`
  **Reference**: See `development-plan.md` for detailed planning flow specs

---

## Medium Priority

### Animations & Micro-interactions

**Context**: Polish the UX with satisfying animations
**Scope**:

- Task completion animation (checkmark, strikethrough, card slide)
- Progress ring animation (smooth fill on completion)
- Card carousel smooth transitions
- Pull-to-refresh animation
- Modal enter/exit animations
- Haptic feedback on task completion
  **Dependencies**: `react-native-reanimated` (already installed)

### Categories Management

**Context**: Users need to view/edit their task categories
**Scope**:

- Categories list in Settings
- Create custom category (Premium feature)
- Edit category name/color/icon
- Reorder categories
- Delete category (handle tasks with that category)
  **Files to create**: `src/components/settings/CategoriesManager.tsx`

### Notifications System

**Context**: Push notifications for planning reminders and task nudges
**Scope**:

- Notification bell badge count
- Notifications list/drawer
- Evening planning reminder (configurable time)
- Morning execution reminder
- Push notification setup with Expo
  **Dependencies**: `expo-notifications`

---

## Low Priority / Nice to Have

### Analytics Screen

**Context**: Track productivity trends and insights (Premium feature)
**Scope**:

- Weekly/monthly completion rates
- Task completion by category
- Streaks tracking
- Time spent per category
- Best planning days analysis
  **Files to modify**: `src/app/(tabs)/analytics.tsx`

### Feedback Screen

**Context**: In-app feedback collection
**Scope**:

- Bug report form
- Feature request form
- Rating prompt
- Link to App Store review
  **Files to modify**: `src/app/(tabs)/feedback.tsx`

### Offline Support

**Context**: Allow task creation/completion when offline
**Scope**:

- Queue operations for sync
- Offline indicator
- Conflict resolution strategy
- Background sync when connection restored
  **Reference**: See `development-plan.md` section on Offline Support

### Light Mode Polish

**Context**: Designs provided were dark mode only
**Scope**:

- Review all components in light mode
- Adjust colors for proper contrast
- Test on actual devices in bright conditions

---

## Technical Debt

### Type Generation Automation

**Context**: Currently manual process to regenerate types after schema changes
**Scope**:

- Consider CI/CD integration
- Document in onboarding
- Add pre-commit hook option

### Test Coverage

**Context**: No tests written yet
**Scope**:

- Unit tests for hooks
- Component tests for UI
- Integration tests for auth flow
- E2E tests for critical paths (planning, execution)
  **Reference**: See `development-plan.md` Testing Strategy section

### Console.log Cleanup

**Context**: Debug logging throughout auth flow and components
**Scope**:

- Replace with proper logging utility
- Add log levels (debug, info, warn, error)
- Disable in production builds

---

## Completed

- [x] Today screen implementation (2025-11-24)
- [x] Tab navigation setup (2025-11-24)
- [x] Task priority and duration fields (2025-11-24)
- [x] CircularProgress component (2025-11-24)
- [x] React Query hooks for plans/tasks (2025-11-24)

---

_Last updated: 2025-11-24_
