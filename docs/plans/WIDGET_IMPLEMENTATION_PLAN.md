# Domani Home Screen Widget Implementation Plan

## Overview

Add interactive home screen widgets for iOS and Android that display today's tasks and allow users to complete them directly from the widget without opening the app.

### Goals

- Display today's tasks with MIT highlighted
- Show completion progress
- Allow interactive task completion (iOS 17+ / Android 12+)
- Support Small, Medium, and Large widget sizes
- Support iOS Lock Screen widgets

### Non-Goals (v1)

- Offline-first widget caching (future enhancement)
- Quick-add task from widget
- Widget configuration (selecting different lists/filters)

---

## Platform Comparison

| Aspect            | iOS                       | Android                       |
| ----------------- | ------------------------- | ----------------------------- |
| **Library**       | `@bacons/apple-targets`   | `react-native-android-widget` |
| **UI Language**   | SwiftUI (native)          | React Native/JSX              |
| **Interactivity** | iOS 17+ (AppIntents)      | Android 12+                   |
| **Data Sharing**  | App Groups + UserDefaults | SharedPreferences             |
| **Complexity**    | Higher                    | Lower                         |
| **Lock Screen**   | Yes (iOS 16+)             | No                            |

---

## Data Architecture

### Shared Data Format

Both platforms will use the same JSON structure stored in platform-specific shared storage:

```typescript
interface WidgetData {
  tasks: WidgetTask[]
  planId: string | null
  planDate: string // YYYY-MM-DD
  lastUpdated: string // ISO timestamp
  progress: {
    completed: number
    total: number
  }
}

interface WidgetTask {
  id: string
  title: string
  isMit: boolean // priority === 'high'
  isCompleted: boolean // completed_at !== null
  categoryName: string | null
  categoryColor: string | null
  position: number
}
```

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   React Native  │────▶│  Shared Storage  │◀────│   Widget    │
│       App       │     │  (UserDefaults/  │     │   (Native)  │
│                 │     │  SharedPrefs)    │     │             │
└────────┬────────┘     └──────────────────┘     └──────┬──────┘
         │                                              │
         │         ┌──────────────────┐                 │
         └────────▶│    Supabase      │◀────────────────┘
                   │   (REST API)     │   (for task completion)
                   └──────────────────┘
```

### Sync Strategy

1. **App → Widget**: App writes to shared storage on:
   - Task list change (create, update, delete, reorder)
   - Task completion toggle
   - App foreground/background transitions
   - Plan day change

2. **Widget → App**: Widget triggers app update on:
   - Task completion (calls Supabase directly, updates shared storage)
   - Widget requests timeline refresh

---

## iOS Implementation

### Technology Stack

- **@bacons/apple-targets** - Expo config plugin for Apple extensions
- **SwiftUI** - Widget UI
- **WidgetKit** - iOS widget framework
- **AppIntents** - Interactive widget actions (iOS 17+)

### Widget Sizes

| Size       | Dimensions | Content                                 |
| ---------- | ---------- | --------------------------------------- |
| **Small**  | ~169×169pt | MIT task OR progress ring               |
| **Medium** | ~360×169pt | 3-4 tasks with checkboxes + progress    |
| **Large**  | ~360×376pt | 5-7 tasks with checkboxes + MIT section |

### Lock Screen Widgets (iOS 16+)

| Family                 | Content                         |
| ---------------------- | ------------------------------- |
| `accessoryCircular`    | Progress ring (completed/total) |
| `accessoryRectangular` | MIT task title + checkbox       |

### File Structure

```
/targets/
  widget/
    Widget.swift           # Main widget entry
    WidgetViews.swift      # SwiftUI views
    TaskIntent.swift       # AppIntent for completion
    WidgetDataProvider.swift # Timeline provider
    Assets.xcassets/       # Widget icons
    Info.plist
```

### iOS Tickets (Incremental)

See Linear tickets below.

---

## Android Implementation

### Technology Stack

- **react-native-android-widget** - Widget framework
- **FlexWidget, TextWidget, etc.** - JSX widget components
- **SharedPreferences** - Data sharing

### Widget Sizes

| Size       | Grid | Content                                 |
| ---------- | ---- | --------------------------------------- |
| **Small**  | 2×2  | MIT task OR progress ring               |
| **Medium** | 4×2  | 3-4 tasks with checkboxes + progress    |
| **Large**  | 4×4  | 5-7 tasks with checkboxes + MIT section |

### File Structure

```
/src/widgets/
  android/
    TodayWidget.tsx        # Widget UI component
    widgetTaskHandler.ts   # Click action handler
    types.ts               # Widget-specific types
```

### Android Tickets (Incremental)

See Linear tickets below.

---

## Shared React Native Code

### New Files

```
/src/lib/
  widgetBridge.ts          # Platform-agnostic widget data sync

/src/hooks/
  useWidgetSync.ts         # Hook to sync data on changes
```

### Widget Bridge API

```typescript
// src/lib/widgetBridge.ts

export const WidgetBridge = {
  // Update widget data
  async syncTasks(tasks: Task[], plan: Plan): Promise<void>

  // Trigger widget refresh
  async refreshWidget(): Promise<void>

  // Complete task from widget (called by native code)
  async completeTask(taskId: string): Promise<boolean>

  // Get current widget data (for debugging)
  async getWidgetData(): Promise<WidgetData | null>
}
```

---

## Design Specifications

### Visual Design

#### Color Palette (matches app theme)

- **MIT highlight**: `#7c3aed` (violet-600) - left border accent
- **Checkbox unchecked**: 30% opacity system gray
- **Checkbox checked**: `#7c3aed` with white checkmark
- **Progress ring track**: 15% opacity accent
- **Progress ring fill**: `#7c3aed`
- **Background**: System widget background (supports vibrancy)

#### Typography

- **Task title**: 15pt system font, primary color
- **MIT title**: 17pt system font medium, primary color
- **Category label**: 11pt system font, secondary color
- **Progress count**: 24pt system font bold (small widget)

#### Layout Guidelines

- **Outer padding**: 16pt
- **Row height**: 44pt minimum (touch target)
- **Row spacing**: 8pt
- **Checkbox size**: 24pt visual, 44pt touch target

### Widget Mockups

#### Small Widget - Progress

```
┌─────────────────────┐
│                     │
│      ◐             │  <- Progress ring (65%)
│     2/3            │  <- Count
│                     │
│    Today           │  <- Label
└─────────────────────┘
```

#### Small Widget - MIT Focus

```
┌─────────────────────┐
│                     │
│  ☐ Write Q1 report │  <- MIT with checkbox
│                     │
│    MIT for Today   │
└─────────────────────┘
```

#### Medium Widget

```
┌───────────────────────────────────────────┐
│  Today                          ◐ 2/3    │
├───────────────────────────────────────────┤
│  ☐ Write Q1 report              🟣 MIT   │
│  ☐ Review pull requests         Work     │
│  ☑ Morning standup             Meeting   │
└───────────────────────────────────────────┘
```

#### Large Widget

```
┌───────────────────────────────────────────┐
│  Today                          ◐ 2/5    │
├───────────────────────────────────────────┤
│  YOUR MIT                                │
│  ☐ Write Q1 report                       │
├───────────────────────────────────────────┤
│  OTHER TASKS                             │
│  ☐ Review pull requests         Work     │
│  ☐ Call dentist                Personal  │
│  ☑ Morning standup             Meeting   │
│  ☑ Reply to emails              Work     │
└───────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests

- Widget data transformation (Task → WidgetTask)
- Progress calculation
- Date handling (timezone edge cases)

### Integration Tests

- Shared storage read/write
- Widget refresh triggers
- Task completion flow

### Manual Testing Checklist

- [ ] Widget displays correct tasks for today
- [ ] MIT is visually highlighted
- [ ] Tapping checkbox completes task
- [ ] Widget updates after app changes
- [ ] Dark mode displays correctly
- [ ] Different widget sizes render correctly
- [ ] Lock screen widgets work (iOS)
- [ ] Widget survives app kill
- [ ] Widget handles no tasks state
- [ ] Widget handles no plan state

---

## Rollout Plan

### Phase 1: iOS Foundation

1. Setup @bacons/apple-targets
2. Create basic widget showing static data
3. Implement App Groups data sharing

### Phase 2: iOS Interactivity

4. Add task completion via AppIntents
5. Implement timeline provider for updates
6. Add all widget sizes

### Phase 3: iOS Polish

7. Add lock screen widgets
8. Add animations and transitions
9. Testing and bug fixes

### Phase 4: Android Foundation

10. Setup react-native-android-widget
11. Create basic widget UI
12. Implement SharedPreferences bridge

### Phase 5: Android Interactivity

13. Add click handlers for completion
14. Implement widget refresh
15. Add all widget sizes

### Phase 6: Android Polish

16. Testing and bug fixes
17. Performance optimization

---

## Risks and Mitigations

| Risk                          | Likelihood | Impact | Mitigation                                  |
| ----------------------------- | ---------- | ------ | ------------------------------------------- |
| SwiftUI learning curve        | Medium     | Medium | Use templates, reference Things 3/Reminders |
| Widget memory limits (16MB)   | Low        | High   | Keep data minimal, lazy load                |
| iOS widget refresh throttling | Medium     | Medium | Optimize timeline entries                   |
| Auth token in widget          | Medium     | High   | Use short-lived tokens, handle expiry       |
| Expo prebuild compatibility   | Low        | High   | Test frequently, pin versions               |

---

## Future Enhancements (v2+)

- [ ] Widget configuration (select list/filter)
- [ ] Quick-add task from widget
- [ ] Offline caching with sync queue
- [ ] Watch app integration (Apple Watch)
- [ ] Live Activities for active task timer
- [ ] Glanceable widget (iOS 18)

---

## References

- [@bacons/apple-targets](https://github.com/EvanBacon/expo-apple-targets)
- [react-native-android-widget](https://saleksovski.github.io/react-native-android-widget/)
- [Apple WidgetKit](https://developer.apple.com/documentation/widgetkit)
- [Apple Human Interface Guidelines - Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets)
- [Interactive Widgets iOS 17](https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities)
