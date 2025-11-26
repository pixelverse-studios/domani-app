# Domani Development Guide for Claude Code

> **Project**: Domani - Evening Planning Productivity App  
> **Organization**: PixelVerse Studios  
> **Stack**: React Native (Expo) + Supabase + RevenueCat

---

## Project Overview

Domani is a cloud-based mobile productivity app built on **evening planning psychology**. Users plan tomorrow's tasks at night when calm, not in the morning when rushed.

**Core Philosophy**: "Plan Tomorrow Tonight" - leverage decision fatigue research showing better choices are made in the evening's reflective state vs. morning's reactive state.

---

## Tech Stack

### Frontend

- **Framework**: React Native with Expo (TypeScript)
- **State Management**: Zustand
- **Data Fetching**: @tanstack/react-query
- **Navigation**: @react-navigation/native + @react-navigation/stack
- **Styling**: NativeWind (Tailwind for React Native)
- **Animations**: react-native-reanimated

### Backend

- **Platform**: Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- **Authentication**: Supabase Auth (Google OAuth + Apple Sign-In only)
- **Row Level Security**: All data access controlled via RLS policies

### Payments

- **Mobile IAP**: RevenueCat (handles iOS/Android in-app purchases)
- **Stripe**: Backend payment processing via Supabase Edge Functions

### Development Tools

- **Build System**: Expo EAS
- **Type Generation**: `npx supabase gen types typescript`
- **Testing**: Jest + React Native Testing Library

---

## Business Model & Tier Logic

### Free Tier (Forever)

```typescript
const FREE_TIER = {
  taskLimit: 3, // STRICTLY enforced in backend
  categories: ['Work 💼', 'Personal 🏠', 'Health ❤️', 'Other 📌'],
  historyDays: 7,
  features: ['evening_planning', 'morning_views', 'mit_selection', 'plan_locking'],
}
```

### Premium Tier ($4.99/mo or $39.99/yr)

```typescript
const PREMIUM_TIER = {
  taskLimit: Infinity,
  customCategories: true,
  multiDeviceSync: true,
  pushNotifications: true,
  advancedAnalytics: true,
  historyDays: Infinity,
}
```

### Lifetime Tier ($99.99 once)

```typescript
const LIFETIME_TIER = {
  ...PREMIUM_TIER,
  expiresAt: null, // Never expires
}
```

**Critical Rule**: Free tier must feel complete, not crippled. 3 tasks is enough for core productivity (research-backed).

---

## Database Schema

### Core Tables

```sql
-- Users (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'lifetime')),
  tier_expires_at TIMESTAMPTZ,
  stripe_customer_id VARCHAR(255) UNIQUE,
  push_token TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plans (daily planning containers)
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  planned_for DATE NOT NULL,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, planned_for)
);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  is_mit BOOLEAN DEFAULT FALSE,  -- Most Important Task
  completed_at TIMESTAMPTZ,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL,  -- Hex color
  emoji VARCHAR(10),
  position INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (Critical)

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Free tier task limit enforcement (CRITICAL)
CREATE POLICY "Enforce free tier task limit" ON public.tasks
  FOR INSERT WITH CHECK (
    plan_id IN (SELECT id FROM public.plans WHERE user_id = auth.uid())
    AND (
      (SELECT tier FROM public.users WHERE id = auth.uid()) != 'free'
      OR
      (SELECT COUNT(*) FROM public.tasks WHERE plan_id = NEW.plan_id) < 3
    )
  );
```

---

## Authentication Flow

**Providers**: Google OAuth + Apple Sign-In only (no email/password)

### Implementation Pattern

```typescript
// src/lib/supabase.ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)
```

### Auth State Management

```typescript
// Use AuthProvider pattern with React Context
// Listen to onAuthStateChange for session updates
// Fetch user profile after successful authentication
// Handle tier information in profile fetch
```

---

## Core User Flows

### 1. Evening Planning Flow (8 PM default)

```
1. User opens app → Show planning view
2. Add tasks (max 3 for free, unlimited for premium)
3. Assign categories (Work/Personal/Health/Other)
4. Select MIT (Most Important Task) - star one task
5. Lock plan → Prevents midnight anxiety editing
6. Show confirmation + motivation message
```

### 2. Morning Execution Flow (6 AM default)

```
1. User opens app → Show execution view
2. Two view modes:
   - Focus View: MIT prominent, other tasks minimized
   - List View: All tasks visible with checkboxes
3. Complete tasks with satisfying animations
4. Progress tracking throughout day
```

### 3. Upgrade Flow (Natural Friction Points)

```
1. User hits task limit (4th task attempt)
2. Show upgrade modal (not blocking)
3. Options: Monthly / Annual / Lifetime
4. RevenueCat handles purchase flow
5. Webhook updates user tier in database
```

---

## API Patterns

### React Query Hooks

```typescript
// src/hooks/useTasks.ts
export function useTasks(planId: string) {
  return useQuery({
    queryKey: ['tasks', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, category:categories(*)')
        .eq('plan_id', planId)
        .order('position')

      if (error) throw error
      return data
    },
    enabled: !!planId,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (task: CreateTaskInput) => {
      const { data, error } = await supabase.from('tasks').insert(task).select().single()

      if (error) {
        // Check for free tier limit error
        if (error.code === '23514') {
          throw new Error('FREE_TIER_LIMIT')
        }
        throw error
      }
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['tasks', data.plan_id])
    },
    onError: (error: Error) => {
      if (error.message === 'FREE_TIER_LIMIT') {
        // Show upgrade modal
      }
    },
  })
}
```

### Plan Management

```typescript
// Get or create today's/tomorrow's plan
export function useGetOrCreatePlan(date: Date) {
  return useMutation({
    mutationFn: async () => {
      const dateStr = formatDate(date)

      // Try to get existing plan
      let { data } = await supabase.from('plans').select('*').eq('planned_for', dateStr).single()

      if (!data) {
        // Create new plan
        const { data: newPlan } = await supabase
          .from('plans')
          .insert({ planned_for: dateStr })
          .select()
          .single()
        data = newPlan
      }

      return data
    },
  })
}
```

---

## File Structure

```
domani/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Auth screens (login, etc.)
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── plan.tsx              # Evening planning screen
│   │   ├── execute.tsx           # Morning execution screen
│   │   ├── analytics.tsx         # Stats/insights (premium)
│   │   └── settings.tsx          # User settings
│   ├── _layout.tsx               # Root layout
│   └── index.tsx                 # Entry point
├── src/
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── tasks/                # Task-related components
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskList.tsx
│   │   │   └── CreateTaskModal.tsx
│   │   └── plan/                 # Planning components
│   │       ├── PlanHeader.tsx
│   │       ├── MITSelector.tsx
│   │       └── LockPlanButton.tsx
│   ├── hooks/                    # Custom React hooks
│   │   ├── useTasks.ts
│   │   ├── usePlans.ts
│   │   ├── useAuth.ts
│   │   └── useSubscription.ts
│   ├── lib/                      # Core utilities
│   │   ├── supabase.ts           # Supabase client
│   │   ├── revenuecat.ts         # RevenueCat setup
│   │   └── notifications.ts      # Push notifications
│   ├── providers/                # React Context providers
│   │   ├── AuthProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── QueryProvider.tsx
│   ├── stores/                   # Zustand stores
│   │   ├── uiStore.ts            # UI state (modals, etc.)
│   │   └── planStore.ts          # Planning session state
│   ├── types/                    # TypeScript types
│   │   ├── supabase.ts           # Generated DB types
│   │   └── index.ts              # App-specific types
│   └── utils/                    # Helper functions
│       ├── date.ts
│       ├── formatting.ts
│       └── validation.ts
├── supabase/
│   ├── migrations/               # Database migrations
│   └── functions/                # Edge Functions
│       ├── create-checkout-session/
│       └── stripe-webhook/
└── docs/
    └── audits/                   # Development audit trails
        └── mobile/
```

---

## Component Patterns

### Composition Over Duplication

```typescript
// ✅ Good: Composable components
<Card>
  <Card.Header>
    <Card.Title>Today's Tasks</Card.Title>
  </Card.Header>
  <Card.Content>
    <TaskList tasks={tasks} />
  </Card.Content>
</Card>

// ❌ Bad: Prop explosion
<TaskCard
  showHeader={true}
  headerTitle="Today's Tasks"
  showContent={true}
  tasks={tasks}
  variant="default"
/>
```

### Theme-First Design

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          500: 'var(--color-primary-500)',
          900: 'var(--color-primary-900)',
        },
        // Semantic colors
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
      },
    },
  },
}

// Use semantic class names
<View className="bg-primary-500 dark:bg-primary-900" />
```

---

## Error Handling

### Standard Error Response Pattern

```typescript
// Custom error types
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// Common errors
const ERRORS = {
  FREE_TIER_LIMIT: new AppError('Free tier allows 3 tasks per day', 'FREE_TIER_LIMIT', 403),
  PLAN_LOCKED: new AppError('Cannot modify a locked plan', 'PLAN_LOCKED', 403),
  UNAUTHORIZED: new AppError('Authentication required', 'UNAUTHORIZED', 401),
}
```

### User-Friendly Error Messages

```typescript
// Show upgrade prompt for tier limit
if (error.code === 'FREE_TIER_LIMIT') {
  Alert.alert(
    'Task Limit Reached',
    'Free tier allows 3 tasks per day. Upgrade to Premium for unlimited tasks.',
    [
      { text: 'Maybe Later', style: 'cancel' },
      { text: 'Upgrade Now', onPress: () => navigation.navigate('Upgrade') },
    ],
  )
}
```

---

## Testing Strategy

### Unit Tests

- Component rendering
- Hook behavior
- Utility functions
- Store actions

### Integration Tests

- API interactions with Supabase
- Auth flow completion
- Payment flow with RevenueCat

### E2E Tests (Detox)

- Complete planning flow
- Task completion flow
- Upgrade flow

```typescript
// Example test
describe('Task Creation', () => {
  it('should enforce free tier limit', async () => {
    // Create 3 tasks (should succeed)
    for (let i = 0; i < 3; i++) {
      await createTask({ title: `Task ${i}` })
    }

    // 4th task should fail
    await expect(createTask({ title: 'Task 4' })).rejects.toThrow('FREE_TIER_LIMIT')
  })
})
```

---

## Environment Variables

```bash
# .env.local (development)
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_test_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_test_xxx

# .env.production
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_live_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_live_xxx
```

---

## Development Commands

```bash
# Start local Supabase
npx supabase start

# Generate TypeScript types from remote database (recommended)
npm run db:types

# Generate TypeScript types from local database
npx supabase gen types typescript --local > src/types/supabase.ts

# Start Expo development server
npx expo start

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Deploy Edge Functions
npx supabase functions deploy

# Code quality
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier formatting
npm run format:check # Check formatting
```

### Type Generation Workflow

When you make schema changes in Supabase:

1. Apply migrations to the database
2. Run `npm run db:types` to regenerate types
3. Commit the updated `src/types/supabase.ts`

The generated types provide:

- `Database` - Full database schema type for Supabase client
- `Tables<'tablename'>` - Row type for a table
- `TablesInsert<'tablename'>` - Insert type (optional fields for defaults)
- `TablesUpdate<'tablename'>` - Update type (all fields optional)
- `Enums<'enumname'>` - Enum value types

Convenience aliases in `src/types/index.ts`:

```typescript
import { Profile, Plan, Task, Category } from '@/types'
import { TaskInsert, TaskUpdate, Tier, PlanStatus } from '@/types'
```

---

## Code Quality Rules

1. **TypeScript Strict Mode**: All files must be TypeScript with strict mode enabled
2. **No `any`**: Use proper typing, never `any` (use `unknown` if needed)
3. **Async/Await**: Prefer async/await over .then() chains
4. **Error Boundaries**: Wrap screens in error boundaries
5. **Loading States**: Always handle loading, error, and empty states
6. **Accessibility**: Include `accessibilityLabel` on interactive elements
7. **Performance**: Use `useMemo`/`useCallback` for expensive operations
8. **Comments**: Document "why" not "what" - code should be self-explanatory

---

## Critical Implementation Notes

### 1. Task Limit Enforcement

**MUST** be enforced at the database level via RLS, not just frontend. Free users attempting to add a 4th task should receive a clear error, not silent failure.

### 2. Plan Locking

Once locked, a plan cannot be modified. This is core to the evening planning psychology - prevents midnight anxiety editing.

### 3. MIT Selection

Each plan should have exactly ONE Most Important Task. If user changes MIT, previous MIT is unset automatically.

### 4. Date Handling

- Plans are created for "tomorrow" during evening (after 6 PM)
- Plans are created for "today" during morning (before 6 PM)
- Always use user's local timezone for date calculations

### 5. Offline Support

- Tasks should be creatable offline
- Sync when connection restored
- Show clear offline indicator
- Queue operations for sync

### 6. Upgrade Prompts

- Only show at natural friction points (task limit reached)
- Never interrupt active planning
- Always provide "Maybe Later" option
- Track conversion rates per prompt location

---

## Linear Project Reference

- **Team ID**: `e48f33dc-ba66-4b0c-b0df-ac8e6fa64cdb`
- **Project ID**: `cf44c86e-0ee8-44b2-8c52-3de64a6fa2e2`
- **Current Milestone**: Alpha

---

## Audit Trail Requirement

Every development session should create/update an audit file:

```
docs/audits/mobile/YYYY-MM-DD-feature-name.md
```

Include:

- What was implemented
- Technical decisions made
- Files created/modified
- Next steps
- Any blockers or concerns

---

_Last Updated: January 2025_
