# Domani Mobile App - Development Guide for Claude Code

## Project Overview

Domani is a React Native mobile productivity app that revolutionizes task planning through evening psychology. Built with Expo, Supabase, and RevenueCat, it implements a freemium model with three tiers: Free (3 tasks/day), Premium ($3.99/month or $25/year), and Lifetime ($99 one-time).

**Core Philosophy**: Plan tomorrow tonight when calm, execute in the morning when focused.

## Documentation Requirements

**IMPORTANT: ALL documentation and audit files MUST be created in the `docs/` directory**

### Directory Structure:

```
docs/
├── audits/
│   └── mobile/         # Mobile app audit files
├── features/           # Feature documentation
├── technical/          # Technical documentation
└── planning/           # Planning and strategy documents
```

## Audit Trail Requirements

**IMPORTANT: Create an audit file after EVERY prompt**

After completing any task or answering any prompt, create an audit file with the following:

### File Naming Convention:

```
docs/audits/mobile/YYYY-MM-DD-HH-MM-SS-[brief-description].md
```

Example: `docs/audits/mobile/2025-01-15-14-30-45-planning-screen.md`

### Audit File Template:

```markdown
# Audit Log - Mobile App - [Date Time]

## Prompt Summary

[Summarize what the user asked for]

## Actions Taken

1. [List each action performed]
2. [Include files created/modified]
3. [Note any decisions made]

## Files Changed

- `src/screens/Planning/PlanningScreen.tsx` - [Brief description of changes]
- `src/hooks/useTasks.ts` - [Brief description of changes]

## Components/Features Affected

- [Component/Feature name]
- [Related dependencies]

## Testing Considerations

- [What should be tested]
- [Potential edge cases]
- [Device testing needs (iOS/Android)]

## Performance Impact

- [Bundle size changes]
- [Memory considerations]
- [Animation performance]

## Next Steps

- [Suggested follow-up tasks]
- [Related features to consider]

## Notes

[Any additional context, warnings, or important information]

## Timestamp

Created: YYYY-MM-DD HH:MM:SS
Feature Area: [auth/planning/execution/billing/etc]
```

## Pull Request Workflow

**IMPORTANT: Create a pull request after completing each scope of work**

After completing a scope of work (a feature, bug fix, or meaningful set of changes), create a pull request for review:

### Workflow Steps:

1. **Ensure all changes are committed** to the current branch
2. **Create a pull request** against the `dev` branch using:

```bash
   gh pr create --base dev --title "[Brief description of changes]" --body "[Detailed description]"
```

### PR Title Format:

```
[Type]: Brief description
```

Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `perf`

Example: `feat: Add evening planning screen with task limits`

### PR Body Template:

```markdown
## Summary

Brief description of what was changed and why

## Changes Made

- List of specific changes
- Components added/modified
- Logic changes
- Database migrations (if any)

## Testing

- What was tested
- How to test the changes
- Devices tested on (iOS/Android)

## Screenshots (if UI changes)

[Add screenshots from iOS and Android if applicable]

## Related Issues

Closes #[issue number] (if applicable)

## Checklist

- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Dark mode working
- [ ] Loading states handled
- [ ] Error states handled
- [ ] TypeScript types updated
```

## Technology Stack

### Core Framework

- **Framework**: React Native via Expo (SDK 50+)
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand (UI state) + React Query (server state)
- **Navigation**: React Navigation v6 (Stack + Bottom Tabs)
- **Styling**: NativeWind (Tailwind for React Native)

### Backend & Data

- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Authentication**: Supabase Auth (Google OAuth + Apple Sign In)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: Supabase subscriptions (optional)

### Payments & Monetization

- **IAP Platform**: RevenueCat
- **Payment Processing**: Native App Store/Play Store
- **Subscription Types**: Monthly, Annual, Lifetime (non-consumable)

### Developer Experience

- **Build Tool**: EAS Build (Expo Application Services)
- **Code Quality**: ESLint + Prettier
- **Type Safety**: TypeScript strict mode
- **Version Control**: Git with conventional commits

### UI & Animation

- **Animations**: React Native Reanimated
- **Gestures**: React Native Gesture Handler
- **Icons**: Lucide React Native
- **Utilities**: date-fns, react-native-url-polyfill

## Project Structure

```
domani-app/
├── src/
│   ├── app/                          # Expo Router (file-based routing)
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── onboarding.tsx
│   │   ├── (tabs)/                   # Main app tabs
│   │   │   ├── plan.tsx              # Evening planning
│   │   │   ├── execute.tsx           # Morning execution
│   │   │   ├── settings.tsx
│   │   │   └── _layout.tsx
│   │   ├── billing/
│   │   │   └── upgrade.tsx
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── ui/                       # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Badge.tsx
│   │   ├── tasks/                    # Task-specific components
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskList.tsx
│   │   │   └── MITSelector.tsx
│   │   ├── categories/
│   │   │   └── CategorySelector.tsx
│   │   └── shared/                   # Shared components
│   │       ├── LoadingState.tsx
│   │       ├── ErrorState.tsx
│   │       └── EmptyState.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePlans.ts
│   │   ├── useTasks.ts
│   │   ├── usePurchases.ts
│   │   └── useTheme.ts
│   ├── lib/
│   │   ├── supabase.ts               # Supabase client
│   │   ├── revenueCat.ts             # RevenueCat config
│   │   └── analytics.ts              # Event tracking
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   └── ThemeProvider.tsx
│   ├── stores/
│   │   ├── authStore.ts              # Zustand auth state
│   │   ├── planStore.ts              # Current plan state
│   │   └── uiStore.ts                # UI preferences
│   ├── types/
│   │   ├── supabase.ts               # Generated DB types
│   │   ├── models.ts                 # App models
│   │   └── navigation.ts             # Navigation types
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── validation.ts
│   │   └── formatting.ts
│   └── theme/
│       ├── colors.ts                 # Theme color system
│       ├── spacing.ts                # Consistent spacing
│       └── typography.ts             # Type scale
├── supabase/
│   ├── functions/                    # Edge Functions
│   └── migrations/                   # Database migrations
├── docs/                             # All documentation
│   ├── audits/mobile/                # Mobile-specific audits
│   ├── features/                     # Feature documentation
│   ├── technical/                    # Technical docs
│   └── planning/                     # Planning docs
├── app.json                          # Expo configuration
├── tailwind.config.js                # Tailwind + theme config
└── tsconfig.json
```

## Core Product Concepts

### The Evening Planning Psychology

```typescript
// Core philosophy embedded in the UX
const PLANNING_PHILOSOPHY = {
  principle: 'Plan tomorrow tonight when calm, execute when it counts',

  eveningBenefits: [
    'Reflective mode (not reactive)',
    'Clear-headed decision making',
    'No morning stress or rush',
    'Better prioritization',
  ],

  morningBenefits: [
    'Wake up with clarity',
    'No decision fatigue',
    'Immediate execution mode',
    'Momentum from minute one',
  ],
}
```

### The 3-Task Free Tier Philosophy

```typescript
// Why 3 tasks is a feature, not a limitation
const FREE_TIER_LOGIC = {
  rationale: 'Research shows 3-6 tasks is optimal for daily productivity',

  benefits: [
    'Forces prioritization',
    'Maintains focus',
    'Higher completion rates',
    'Reduces overwhelm',
  ],

  messaging: '3 tasks is enough for what truly matters',
}
```

### Tier Enforcement Strategy

```typescript
interface TierFeatures {
  free: {
    tasksPerDay: 3
    categories: 4 // Work, Personal, Health, Other
    features: string[]
  }
  premium: {
    tasksPerDay: 'unlimited'
    categories: 'unlimited'
    features: string[]
  }
  lifetime: {
    tasksPerDay: 'unlimited'
    categories: 'unlimited'
    features: string[]
    perks: string[]
  }
}

// Enforcement happens at:
// 1. Backend (RLS policies) - authoritative
// 2. Frontend (pre-validation) - better UX
```

## Theme System (CRITICAL)

### Color System with CSS Variables

```typescript
// src/theme/colors.ts
export const colors = {
  // Brand colors
  primary: 'rgb(147, 51, 234)', // purple-600
  primaryLight: 'rgb(168, 85, 247)', // purple-500
  primaryDark: 'rgb(126, 34, 206)', // purple-700

  // Semantic colors
  success: 'rgb(34, 197, 94)', // green-500
  warning: 'rgb(251, 146, 60)', // orange-400
  error: 'rgb(239, 68, 68)', // red-500
  info: 'rgb(59, 130, 246)', // blue-500

  // Neutral colors (auto-switch for dark mode)
  background: {
    light: 'rgb(255, 255, 255)',
    dark: 'rgb(15, 23, 42)', // slate-900
  },
  surface: {
    light: 'rgb(248, 250, 252)', // slate-50
    dark: 'rgb(30, 41, 59)', // slate-800
  },
  border: {
    light: 'rgb(226, 232, 240)', // slate-200
    dark: 'rgb(51, 65, 85)', // slate-700
  },
  text: {
    primary: {
      light: 'rgb(15, 23, 42)', // slate-900
      dark: 'rgb(248, 250, 252)', // slate-50
    },
    secondary: {
      light: 'rgb(71, 85, 105)', // slate-600
      dark: 'rgb(148, 163, 184)', // slate-400
    },
    tertiary: {
      light: 'rgb(100, 116, 139)', // slate-500
      dark: 'rgb(148, 163, 184)', // slate-400
    },
  },
}
```

### Tailwind/NativeWind Configuration

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // Enable dark mode

  theme: {
    extend: {
      colors: {
        // Use CSS variables for theming
        primary: 'var(--color-primary)',
        'primary-light': 'var(--color-primary-light)',
        'primary-dark': 'var(--color-primary-dark)',

        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',

        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',

        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
      },

      spacing: {
        // Consistent spacing scale
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },

      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
}
```

### Theme Provider Implementation

```typescript
// src/providers/ThemeProvider.tsx
import { useColorScheme } from 'react-native';
import { create } from 'zustand';

interface ThemeStore {
  mode: 'light' | 'dark' | 'auto';
  setMode: (mode: 'light' | 'dark' | 'auto') => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'auto',
  setMode: (mode) => set({ mode })
}));

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemTheme = useColorScheme();
  const { mode } = useThemeStore();

  const activeTheme = mode === 'auto' ? systemTheme : mode;

  return (
    <View className={activeTheme === 'dark' ? 'dark' : ''}>
      {children}
    </View>
  );
};
```

## Component Architecture (CRITICAL)

### Base UI Components (Reusable, Theme-Aware)

```typescript
// src/components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onPress: () => void;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  onPress
}: ButtonProps) => {
  const baseClasses = "rounded-lg font-semibold active:opacity-80";

  const variantClasses = {
    primary: "bg-primary text-white",
    secondary: "bg-surface border border-border text-text-primary",
    ghost: "text-primary",
    destructive: "bg-error text-white"
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg"
  };

  return (
    <TouchableOpacity
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator /> : <Text>{children}</Text>}
    </TouchableOpacity>
  );
};
```

### Composition Over Duplication

```typescript
// DON'T: Duplicate similar components
// ❌ TaskCard.tsx, CompletedTaskCard.tsx, MITTaskCard.tsx (each with similar code)

// DO: Use composition and variants
// ✅ Single TaskCard with variants
interface TaskCardProps {
  task: Task;
  variant?: 'default' | 'completed' | 'mit';
  onPress?: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
}

export const TaskCard = ({ task, variant = 'default', ...handlers }: TaskCardProps) => {
  const isCompleted = variant === 'completed';
  const isMIT = variant === 'mit' || task.is_mit;

  return (
    <Card className={`
      ${isCompleted ? 'opacity-60' : ''}
      ${isMIT ? 'border-primary border-2' : ''}
    `}>
      {isMIT && <Badge className="absolute top-2 right-2">⭐ MIT</Badge>}

      <Text className={isCompleted ? 'line-through text-text-secondary' : 'text-text-primary'}>
        {task.title}
      </Text>

      <CategoryBadge category={task.category} />

      <TaskActions {...handlers} />
    </Card>
  );
};
```

### Container/Presenter Pattern

```typescript
// Container handles logic
// src/screens/Planning/PlanningScreen.tsx
export const PlanningScreen = () => {
  const { data: plan, isLoading } = usePlans();
  const { data: tasks } = useTasks(plan?.id);
  const { mutate: createTask } = useCreateTask();
  const { profile } = useAuth();

  const canAddTask = profile?.tier !== 'free' || tasks.length < 3;

  if (isLoading) return <LoadingState />;

  return <PlanningView plan={plan} tasks={tasks} canAddTask={canAddTask} onCreateTask={createTask} />;
};

// Presenter handles display
// src/screens/Planning/PlanningView.tsx
interface PlanningViewProps {
  plan: Plan;
  tasks: Task[];
  canAddTask: boolean;
  onCreateTask: (task: CreateTaskInput) => void;
}

export const PlanningView = ({ plan, tasks, canAddTask, onCreateTask }: PlanningViewProps) => {
  return (
    <ScrollView className="flex-1 bg-background">
      <PlanningHeader date={plan.planned_for} />
      <TaskInput onSubmit={onCreateTask} disabled={!canAddTask} />
      <TaskList tasks={tasks} />
      {!canAddTask && <UpgradePrompt />}
      <LockPlanButton plan={plan} />
    </ScrollView>
  );
};
```

## Data Fetching Patterns

### React Query Setup

```typescript
// src/hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (task: CreateTaskInput) => {
      const { data, error } = await supabase.from('tasks').insert(task).select().single()

      if (error) {
        // Backend RLS enforces 3-task limit
        if (error.code === '23514') {
          throw new Error('FREE_TIER_LIMIT')
        }
        throw error
      }

      return data
    },

    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries(['tasks', data.plan_id])
    },

    onError: (error: Error) => {
      if (error.message === 'FREE_TIER_LIMIT') {
        // Show upgrade prompt
        navigation.navigate('Upgrade')
      }
    },
  })
}
```

### Optimistic Updates

```typescript
export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
      return data
    },

    onMutate: async (taskId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries(['tasks'])

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(['tasks'])

      // Optimistically update
      queryClient.setQueryData(['tasks'], (old: Task[]) =>
        old.map((task) =>
          task.id === taskId ? { ...task, completed_at: new Date().toISOString() } : task,
        ),
      )

      return { previousTasks }
    },

    onError: (err, taskId, context) => {
      // Rollback on error
      queryClient.setQueryData(['tasks'], context.previousTasks)
    },
  })
}
```

## Authentication Flow

### Supabase Auth with OAuth Only

```typescript
// src/lib/supabase.ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
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

### Auth Provider Pattern

```typescript
// src/providers/AuthProvider.tsx
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        // Initialize RevenueCat with user ID
        initializePurchases(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id);
          await initializePurchases(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## RevenueCat Integration

### Configuration

```typescript
// src/lib/revenueCat.ts
import Purchases from 'react-native-purchases'
import { Platform } from 'react-native'

const REVENUECAT_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!,
})!

export async function initializePurchases(userId: string) {
  await Purchases.configure({
    apiKey: REVENUECAT_API_KEY,
    appUserID: userId,
  })
}

export const ENTITLEMENTS = {
  PREMIUM: 'premium',
  LIFETIME: 'lifetime',
} as const
```

### Purchase Hook

```typescript
// src/hooks/usePurchases.ts
export function usePurchases() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: offerings } = useQuery({
    queryKey: ['offerings'],
    queryFn: async () => {
      const offerings = await Purchases.getOfferings()
      return offerings.current
    },
  })

  const { data: customerInfo } = useQuery({
    queryKey: ['customerInfo', user?.id],
    queryFn: () => Purchases.getCustomerInfo(),
    enabled: !!user,
  })

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(pkg)
      return customerInfo
    },
    onSuccess: async (customerInfo) => {
      // Sync with Supabase
      await syncSubscriptionStatus(customerInfo)
      queryClient.invalidateQueries(['customerInfo'])
    },
  })

  const isPremium = customerInfo
    ? checkEntitlement(customerInfo, ENTITLEMENTS.PREMIUM) ||
      checkEntitlement(customerInfo, ENTITLEMENTS.LIFETIME)
    : false

  return {
    offerings,
    customerInfo,
    isPremium,
    isLifetime: checkEntitlement(customerInfo, ENTITLEMENTS.LIFETIME),
    purchase: purchaseMutation.mutateAsync,
  }
}
```

## State Management Strategy

### Zustand for UI State

```typescript
// src/stores/uiStore.ts
import { create } from 'zustand'

interface UIStore {
  theme: 'light' | 'dark' | 'auto'
  showUpgradePrompt: boolean
  planningDate: Date

  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  toggleUpgradePrompt: (show: boolean) => void
  setPlanningDate: (date: Date) => void
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'auto',
  showUpgradePrompt: false,
  planningDate: new Date(),

  setTheme: (theme) => set({ theme }),
  toggleUpgradePrompt: (show) => set({ showUpgradePrompt: show }),
  setPlanningDate: (date) => set({ planningDate: date }),
}))
```

### React Query for Server State

```typescript
// All server state goes through React Query
// - Plans: usePlans()
// - Tasks: useTasks()
// - Categories: useCategories()
// - Purchases: usePurchases()
// - Profile: useProfile()
```

## Performance Best Practices

### List Optimization

```typescript
// Use FlatList for long lists
import { FlashList } from '@shopify/flash-list';

export const TaskList = ({ tasks }: { tasks: Task[] }) => {
  const renderItem = useCallback(({ item }: { item: Task }) => (
    <TaskCard task={item} />
  ), []);

  return (
    <FlashList
      data={tasks}
      renderItem={renderItem}
      estimatedItemSize={72}
      keyExtractor={(item) => item.id}
    />
  );
};
```

### Image Optimization

```typescript
// Use optimized image component
import { Image } from 'expo-image';

export const OptimizedImage = ({ source, ...props }) => {
  return (
    <Image
      source={source}
      placeholder={blurhash}
      contentFit="cover"
      transition={200}
      {...props}
    />
  );
};
```

### Memoization

```typescript
// Memoize expensive calculations
const sortedTasks = useMemo(() => {
  return tasks.sort((a, b) => a.position - b.position)
}, [tasks])

// Memoize callbacks
const handleTaskPress = useCallback(
  (taskId: string) => {
    navigation.navigate('TaskDetail', { taskId })
  },
  [navigation],
)
```

## Error Handling Patterns

### Error Boundaries

```typescript
// src/components/shared/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error tracking service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorState error={this.state.error} onRetry={() => this.setState({ hasError: false })} />;
    }

    return this.props.children;
  }
}
```

### Query Error Handling

```typescript
// Consistent error handling in hooks
export function useTasks(planId: string) {
  return useQuery({
    queryKey: ['tasks', planId],
    queryFn: fetchTasks,
    onError: (error) => {
      Alert.alert('Error', 'Failed to load tasks. Please try again.')
    },
  })
}
```

## Testing Strategy

### Unit Tests

```typescript
// src/hooks/__tests__/useTasks.test.ts
describe('useTasks', () => {
  it('fetches tasks for a plan', async () => {
    const { result } = renderHook(() => useTasks('plan-123'))

    await waitFor(() => {
      expect(result.current.data).toHaveLength(3)
    })
  })

  it('enforces free tier limit', async () => {
    const { result } = renderHook(() => useCreateTask())

    await act(async () => {
      try {
        await result.current.mutateAsync(newTask)
      } catch (error) {
        expect(error.message).toBe('FREE_TIER_LIMIT')
      }
    })
  })
})
```

### Component Tests

```typescript
// src/components/__tests__/TaskCard.test.tsx
describe('TaskCard', () => {
  it('renders task with MIT badge', () => {
    const task = { ...mockTask, is_mit: true };
    const { getByText } = render(<TaskCard task={task} />);

    expect(getByText('⭐ MIT')).toBeTruthy();
  });

  it('shows completed state', () => {
    const task = { ...mockTask, completed_at: '2025-01-15T10:00:00Z' };
    const { getByText } = render(<TaskCard task={task} variant="completed" />);

    expect(getByText(task.title)).toHaveStyle({ textDecorationLine: 'line-through' });
  });
});
```

## Development Workflow

### Local Development

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Type check
npm run typecheck

# Lint
npm run lint
```

### Building & Deployment

```bash
# Configure EAS
eas build:configure

# Development build
eas build --profile development --platform ios

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Core Principles

1. **Component Reusability**: Build once, use everywhere with variants
2. **Theme First**: Everything uses CSS variables for light/dark mode
3. **Type Safety**: TypeScript strict mode, no `any` types
4. **Performance**: Optimize lists, memoize calculations, lazy load
5. **Consistency**: Use design system tokens (spacing, colors, typography)
6. **Error Handling**: Graceful degradation, clear error states
7. **Accessibility**: Screen reader support, proper contrast, touch targets
8. **Testing**: Unit tests for logic, component tests for UI
9. **Documentation**: Audit every change in `/docs/audits/mobile/`
10. **Code Quality**: No duplication, clear naming, small functions

## Key Metrics to Monitor

- **App Performance**: 60fps animations, <500ms API calls
- **Bundle Size**: Keep under 20MB initial download
- **Crash-Free Rate**: Target 99.5%+
- **Conversion Rate**: Free → Premium
- **Retention**: Day 1 (70%), Day 7 (60%), Day 30 (40%)
- **Task Completion**: Track completion rate by tier
- **Revenue**: MRR growth, LTV/CAC ratio

## Development Mantras

- "Build reusable components, not duplicates"
- "Theme everything with CSS variables"
- "Type everything, fail at compile time"
- "Optimize for performance from day one"
- "Test the critical paths"
- "Document with audit trails"
- "All docs in /docs directory"
- "Mobile-first UX, always"
