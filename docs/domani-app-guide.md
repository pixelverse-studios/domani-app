# Domani App - Complete Guide

> **Last Updated:** March 26, 2026
> **App Version:** 1.0.31 (Android versionCode 109)
> **Current Phase:** Open Beta

---

## Table of Contents

1. [What is Domani?](#1-what-is-domani)
2. [Platforms & Technical Info](#2-platforms--technical-info)
3. [User Journey (Signup to Daily Use)](#3-user-journey)
4. [Screens & Navigation](#4-screens--navigation)
5. [Task Management](#5-task-management)
6. [Evening Planning & Rollover](#6-evening-planning--rollover)
7. [Notifications & Reminders](#7-notifications--reminders)
8. [Categories](#8-categories)
9. [Analytics / Progress Tab](#9-analytics--progress-tab)
10. [Settings (All Options)](#10-settings-all-options)
11. [Pricing & Subscriptions](#11-pricing--subscriptions)
12. [Account Management](#12-account-management)
13. [Tutorial System](#13-tutorial-system)
14. [Feedback System (Beta)](#14-feedback-system-beta)
15. [Known Limitations & Edge Cases](#15-known-limitations--edge-cases)

---

## 1. What is Domani?

**Domani** is a daily planning app built on the principle: **"Plan Tomorrow, Tonight."**

The core idea is that people make better decisions during calm, reflective evenings rather than rushed mornings. Users plan their next day's tasks at night, then execute during the day.

**Tagline:** "Plan your tomorrow, tonight"

**Key Concepts:**

- **Evening Planning**: Users plan tomorrow's tasks during a nightly routine
- **MIT (Most Important Task)**: Each day has one top-priority task
- **Rollover**: Unfinished tasks can be carried forward to the next day
- **Progress Tracking**: Streaks, completion rates, and weekly summaries

---

## 2. Platforms & Technical Info

| Detail                     | Value                                    |
| -------------------------- | ---------------------------------------- |
| **iOS**                    | Minimum iOS 12.0, portrait + landscape   |
| **Android**                | Portrait only, Hermes JS engine          |
| **Bundle ID (iOS)**        | com.baitedz.domani-app                   |
| **Package Name (Android)** | com.baitedz.domaniapp                    |
| **Auth Providers**         | Google Sign-In, Apple Sign-In (iOS only) |
| **Deep Link Scheme**       | `domani://`                              |
| **Error Tracking**         | Sentry                                   |
| **Analytics**              | PostHog                                  |

---

## 3. User Journey

### Signup Flow

1. **Welcome Screen** - "Plan your tomorrow, tonight" with Sign In / Create Account buttons
2. **Login Screen** - Google Sign-In (both platforms) or Apple Sign-In (iOS only)
3. **Notification Setup** - Toggle planning reminder on/off, set time (default 9 PM), grant notification permissions
4. **Tutorial** - Interactive 8-step walkthrough (can be skipped, replayed later from Settings)

### Tutorial Steps

1. Welcome overlay
2. Day toggle explanation (Today / Tomorrow)
3. Title input (spotlight highlight)
4. Category selection
5. Priority selector
6. Complete form / add task
7. Settings - Categories section
8. Settings - Reminders section

### Daily Usage Pattern

**Morning:**

- Open app -> **Today** tab shows the day's tasks
- MIT (top priority) is highlighted in the Focus Card
- Complete tasks by tapping checkboxes
- When all tasks completed -> Celebration modal appears

**Evening (at planning reminder time, default 9 PM):**

- Notification fires: "Plan Tomorrow"
- Open app -> Rollover Modal appears with unfinished tasks
- Choose which tasks to carry forward to tomorrow
- Optionally set tomorrow's MIT
- Add new tasks for tomorrow on the Planning tab

---

## 4. Screens & Navigation

### Tab Bar (5 Tabs)

#### Tab 1: TODAY (Home)

- **Progress Card**: Circular progress showing completed/total tasks with percentage
- **Focus Card**: Displays the MIT or a daily theme based on task categories
- **Task List**: Incomplete tasks sorted by priority (top > high > medium > low)
- **Completed Section**: Collapsible section at the bottom showing completed tasks
- **Add Task Button**: Fixed footer button to quickly add a task
- **Name Prompt**: One-time modal asking for user's name (first launch)
- Pull-to-refresh supported

#### Tab 2: PLANNING

- **Day Toggle**: Animated pill to switch between "Today" and "Tomorrow"
- **Add Task Form**: Full form with title, category, priority, notes, reminder, day selector
- **Task List**: All tasks for the selected day with edit/delete
- **Task Recap**: Summary text showing task count
- **Planning Tip**: Helpful suggestion (shown contextually)
- **Empty State**: "Plan your day" CTA when no tasks exist

#### Tab 3: FEEDBACK (Beta Only)

- **Category Selection**: Bug Report, Feature Idea, What I Love, General
- **Message Input**: Free-text feedback
- **Info Banner**: "You're a Beta Tester!" message
- **Success State**: Thank you message after submission
- **Submit Another**: Option to send additional feedback

#### Tab 4: PROGRESS (Analytics)

- **7-Day Completion Chart**: Bar chart with daily completion rates
- **Streaks Card**: Planning streak, Execution streak, MIT completion rate
- **Weekly Summary**: Most productive day, consistency score, perfect days
- **Category Breakdown**: Completion rate by category
- Pull-to-refresh, animated number transitions

#### Tab 5: SETTINGS

- See [Section 10](#10-settings-all-options) for full breakdown

### Other Screens

- **Welcome** (`/welcome`) - Landing page
- **Login** (`/login`) - Authentication
- **Notification Setup** (`/notification-setup`) - Post-signup onboarding
- **Contact Support** (`/contact-support`) - Support form
- **Auth Callback** (`/auth/callback`) - OAuth redirect handler

### Modals & Overlays

- **Rollover Modal**: Evening rollover flow (see Section 6)
- **Celebration Modal**: Animated "You did it!" when all tasks completed
- **Delete Task Confirmation**: Confirm before deleting a task
- **Name Edit Modal**: Edit display name
- **Timezone Picker**: Scrollable list of 12+ timezones
- **Planning Time Picker**: Set evening reminder time
- **Smart Categories Info Modal**: Explains auto-sorting
- **Delete Account Modal**: Warning + confirmation
- **Welcome/Tutorial Overlays**: Interactive onboarding

---

## 5. Task Management

### Creating a Task

Fields available when creating or editing a task:

| Field        | Required | Details                                                       |
| ------------ | -------- | ------------------------------------------------------------- |
| **Title**    | Yes      | Text, max 255 characters                                      |
| **Category** | No       | System (Work, Wellness, Personal, Home) or custom             |
| **Priority** | Yes      | Top (MIT), High, Medium, Low - default: Medium                |
| **Notes**    | No       | Expandable text area                                          |
| **Reminder** | No       | Time picker with shortcuts (9 AM, 1 PM, 6 PM) or custom       |
| **Day**      | Auto     | Today or Tomorrow (set via day toggle, editable when editing) |

### Priority System

| Priority   | Color                | Icon  | Behavior                                                                |
| ---------- | -------------------- | ----- | ----------------------------------------------------------------------- |
| **Top**    | Sage green (#7D9B8A) | Crown | Becomes MIT. Max 1 per day. Setting a second demotes the first to High. |
| **High**   | Orange (#D77A61)     | -     | Second highest priority                                                 |
| **Medium** | Gold (#E8B86D)       | -     | Default priority                                                        |
| **Low**    | Blue (#8B9DAF)       | -     | Lowest priority                                                         |

### MIT (Most Important Task) Rules

- Only **one** MIT per day (enforced at database level)
- Set by choosing "Top" priority
- If you set a second task to Top, the previous Top task is automatically demoted to High
- MIT appears prominently in the Focus Card on the Today tab
- MIT can be carried forward during rollover
- Shown with a crown icon on task cards

### Task Lifecycle

1. **Created** -> appears in task list for the chosen day
2. **Reminder scheduled** (optional) -> notification fires at set time
3. **Completed** -> checkbox tapped, moves to completed section, `completed_at` set
4. **Rolled over** (if incomplete at end of day) -> can be carried forward to next day
5. **Deleted** -> confirmation modal, then permanently removed

### Task Card Display

Each task card shows:

- Checkbox (tap to complete/uncomplete)
- Title
- Category badge (color + emoji)
- Priority indicator (left border color)
- Crown icon if MIT
- Bell icon with time if reminder set
- Notes indicator (chevron if notes exist, expandable)
- Edit and delete action buttons

---

## 6. Evening Planning & Rollover

### How Rollover Works

**Trigger:** At the user's planning reminder time (default 9 PM), or when opening the app after that time.

**Two paths to rollover:**

1. **Notification path**: User receives "Plan Tomorrow" notification -> taps it -> opens Planning tab with Rollover Modal
2. **App-open path**: User opens app at/after reminder time -> Rollover Modal appears automatically

### Rollover Modal Contents

- **MIT Section**: Yesterday's MIT shown separately with special styling
  - Toggle: "Make this tomorrow's top priority"
- **Other Tasks**: List of incomplete non-MIT tasks with checkboxes
- **Keep Reminder Times**: Toggle to preserve original reminder times (adjusted to new day)
- **Carry Forward Button**: Moves selected tasks to tomorrow's plan
- **Start Fresh Button**: Discards all unfinished tasks, opens blank planning form

### Rollover Deduplication

- The app tracks whether the user has already been prompted in the current rollover cycle
- Once prompted (regardless of choice), the modal won't appear again until the next cycle
- Cycle resets at the next planning reminder time

### Day Type Inference

Based on task categories (excluding MIT), the app infers a "day type":

- **Work Day**: Majority work tasks
- **Wellness Day**: Majority wellness tasks
- **Personal Day**: Majority personal tasks
- **Learning Day**: Majority learning tasks
- **Balanced Day**: Mixed categories

This affects the Focus Card messaging and visual theme on the Today tab.

---

## 7. Notifications & Reminders

### Planning Reminder (Evening)

- **Default time**: 9:00 PM
- **Configurable**: Yes, via Settings
- **Toggle**: Can be enabled/disabled in Settings
- **Content**: Prompt to plan tomorrow
- **Deep link**: Opens Planning tab with rollover modal
- **Note**: Even if notifications are disabled, the in-app rollover prompt still triggers at this time

### Task Reminders

- **Per-task**: Each task can have its own reminder time
- **Shortcuts**: Quick-select buttons for 9 AM, 1 PM, 6 PM (customizable in Settings)
- **Custom time**: Full time picker for any time
- **Behavior**: Device notification fires at the set time with task title and notes
- **Cancellation**: Automatically cancelled when task is completed or deleted
- **Rollover**: Can optionally preserve reminder times when carrying tasks forward

### Notification Channels (Android)

| Channel            | Importance | Purpose                 |
| ------------------ | ---------- | ----------------------- |
| Planning Reminders | HIGH       | Evening planning prompt |
| Task Reminders     | HIGH       | Individual task alerts  |

Both channels have vibration pattern: [0, 250, 250, 250] ms

### Permission Handling

- Permissions requested during onboarding (Notification Setup screen)
- Settings shows current OS permission status
- If app-level enabled but OS-level denied, a banner guides user to OS settings
- Push tokens stored in user profile for server-side notifications

### Time Format

- Automatically respects device locale (12-hour or 24-hour)
- Not a user-configurable setting; follows device preference

---

## 8. Categories

### System Categories (Built-in)

| Category | Emoji     | Available to All |
| -------- | --------- | ---------------- |
| Work     | Briefcase | Yes              |
| Wellness | Heart     | Yes              |
| Personal | User      | Yes              |
| Home     | Home      | Yes              |

### Custom Categories

- Users can create unlimited custom categories
- Each has: name, emoji, color
- Can be deleted (tasks keep their category until reassigned)
- Usage is tracked for smart sorting

### Favorite Categories

- Up to **4 favorites** pinned to the top of the category picker
- Configured in Settings via drag-to-reorder (with haptic feedback)
- Favorites appear first when creating/editing tasks

### Smart Categories

- **Toggle in Settings** (off by default)
- When ON: Automatically reorders favorites based on usage frequency
- When OFF: Manual ordering via drag-and-drop
- Info modal explains the feature when toggled

---

## 9. Analytics / Progress Tab

### Metrics Tracked

**Daily Completion Rate**

- Percentage of tasks completed each day
- Shown in 7-day bar chart with category color breakdown

**Streaks**
| Streak | Definition |
|--------|-----------|
| Planning Streak | Consecutive days where user created a plan |
| Execution Streak | Consecutive days where user completed all tasks |
| MIT Completion Rate | Percentage of days where the MIT was completed |

**Weekly Summary**

- Most productive day of the week
- Consistency score (how evenly distributed completions are)
- Perfect days count (100% task completion)

### Empty States

- Shows encouraging message when no data exists yet
- Animated numbers on first display

---

## 10. Settings (All Options)

### Profile Section

| Setting    | Type  | Editable     | Details                                       |
| ---------- | ----- | ------------ | --------------------------------------------- |
| Full Name  | Text  | Yes (modal)  | Display name throughout app                   |
| Email      | Text  | Read-only    | From auth provider                            |
| Beta Badge | Badge | Display only | Shows "Beta Tester - Full Access" during beta |

### Preferences Section

| Setting  | Type   | Default       | Details                            |
| -------- | ------ | ------------- | ---------------------------------- |
| Timezone | Picker | Auto-detected | 12+ timezone options (IANA format) |

### Categories Section

| Setting             | Type       | Default         | Details                                |
| ------------------- | ---------- | --------------- | -------------------------------------- |
| Smart Categories    | Toggle     | OFF             | Auto-sort favorites by usage frequency |
| Favorite Categories | Drag list  | System defaults | Up to 4, reorderable                   |
| Custom Categories   | Add/Delete | None            | User-created categories                |

### Notifications & Reminders Section

| Setting                | Type        | Default | Details                                             |
| ---------------------- | ----------- | ------- | --------------------------------------------------- |
| Planning Reminder      | Toggle      | OFF     | Enable evening planning notification                |
| Planning Reminder Time | Time picker | 9:00 PM | When the evening reminder fires                     |
| Reminder Shortcut 1    | Time picker | 9:00 AM | Quick-select for task reminders                     |
| Reminder Shortcut 2    | Time picker | 1:00 PM | Quick-select for task reminders                     |
| Reminder Shortcut 3    | Time picker | 6:00 PM | Quick-select for task reminders                     |
| OS Permission Status   | Display     | -       | Shows whether notifications are allowed at OS level |

### Subscription Section (Hidden During Beta)

| Setting              | Type    | Details                  |
| -------------------- | ------- | ------------------------ |
| Current Plan         | Display | None / Trial / Lifetime  |
| Trial Days Remaining | Display | Countdown during trial   |
| Start Trial          | Button  | Starts 14-day free trial |
| Get Lifetime Access  | Button  | Purchase lifetime plan   |
| Restore Purchases    | Button  | Re-sync from RevenueCat  |

### Support Section

| Setting         | Type   | Details                                |
| --------------- | ------ | -------------------------------------- |
| Replay Tutorial | Button | Resets and replays the 8-step tutorial |
| Contact Support | Button | Opens support form screen              |

### Danger Zone

| Setting         | Type   | Details                                     |
| --------------- | ------ | ------------------------------------------- |
| Delete Account  | Button | Schedules deletion with 30-day grace period |
| Cancel Deletion | Button | Appears if deletion is pending; cancels it  |

---

## 11. Pricing & Subscriptions

### Current Status: Beta (All Features Free)

During the open beta phase, **all users have unlimited access** to all features. The subscription UI is hidden, and task limits are not enforced.

### Pricing Model: One-Time Lifetime Purchase (No Subscription)

| Cohort           | Price  | Who Gets It               |
| ---------------- | ------ | ------------------------- |
| Friends & Family | $4.99  | Closed beta invitees      |
| Early Adopter    | $9.99  | Open beta users (current) |
| General          | $34.99 | Post-beta general public  |

- **No recurring subscription** - one payment, lifetime access
- **Identical pricing on iOS and Android**
- Cohort is permanently assigned at signup based on app phase

### Trial

- **14-day free trial** (no credit card required)
- Started manually from Settings -> Your Plan
- Full access to all features during trial
- After trial: task creation blocked until purchase

### Tier System

| Tier       | Task Limit        | Features                      |
| ---------- | ----------------- | ----------------------------- |
| `none`     | 0 tasks (blocked) | View-only after trial expires |
| `trialing` | Unlimited         | Full access for 14 days       |
| `lifetime` | Unlimited         | Full access forever           |

### Enforcement

- **Database level**: RLS policies prevent task creation for `tier = 'none'`
- **During beta**: `is_beta_phase()` function bypasses all limits
- **RevenueCat**: Handles purchase flow and receipt validation

### Post-Beta Transition

When app phase changes from `open_beta` to `production`:

- RevenueCat activates (purchase flow enabled)
- Task limits enforced via RLS
- Subscription UI shown in Settings
- Users must start trial or purchase to create tasks

---

## 12. Account Management

### Authentication

- **Google Sign-In**: Available on both platforms
- **Apple Sign-In**: iOS only
- Profile auto-created on first sign-in (name extracted from OAuth)

### Account Deletion

1. User taps "Delete Account" in Settings
2. Confirmation modal with warning
3. 30-day grace period begins
4. Email sent confirming scheduled deletion date
5. User can **cancel deletion** by signing in and tapping "Cancel Deletion"
6. After 30 days: account and all data permanently deleted (via cron job)

### Account Reactivation

- If user logs back in during the 30-day grace period
- Deletion is cancelled, all data preserved
- Celebration overlay shown to welcome user back

---

## 13. Tutorial System

### Interactive Onboarding

- 8 steps with spotlight highlighting of UI elements
- Can be skipped at any time
- Tracks completion state in database

### Tutorial State Tracking

- `tutorial_completed_at`: Set when tutorial finishes
- Different messaging shown if user has abandoned tutorial before
- "Replay Tutorial" button in Settings resets and restarts

### Tutorial Steps Detail

1. Welcome overlay introduction
2. Day toggle (Today/Tomorrow switch)
3. Task title input field
4. Category picker
5. Priority selector
6. Add task button / form completion
7. Categories in Settings
8. Reminders in Settings

---

## 14. Feedback System (Beta)

### Feedback Tab (Tab 3)

Only shown during beta phases (`closed_beta` or `open_beta`).

### Feedback Categories

- **Bug Report**: Something isn't working
- **Feature Idea**: Suggestion for improvement
- **What I Love**: Positive feedback
- **General**: Anything else

### Flow

1. Select category
2. Write message
3. Submit
4. See success confirmation
5. Option to submit another

### Storage

Feedback submitted to Supabase database. Slack webhook may notify the team.

---

## 15. Known Limitations & Edge Cases

### Current Limitations

- **Soft lock not implemented**: After trial expires, tasks are immediately blocked (no read-only grace period)
- **No promo codes**: RevenueCat supports them but not integrated in app
- **Beta sunset is manual**: Requires database update to switch from `open_beta` to `production`
- **Theme**: Only "sage" theme available (no dark mode or alternatives)
- **Notifications in Expo Go**: Not supported on Android SDK 53+
- **Web**: Not a primary target; mobile-first design

### Edge Cases to Be Aware Of

- **Midnight boundary**: If app is open across midnight, dates can become stale (fix deployed in 1.0.30)
- **Dual MIT attempt**: Setting a second task to Top priority silently demotes the first to High
- **Notification permissions**: If OS-level denied, app-level toggle still works but no notifications fire; banner guides user to OS settings
- **Rollover timing**: The rollover cycle is 24 hours from planning reminder time, not calendar-day based
- **Token invalidation**: Push tokens can become invalid; tracked via `push_token_invalid_at`

### App Colors Reference

| Element         | Color       | Hex     |
| --------------- | ----------- | ------- |
| Brand Primary   | Sage Green  | #7D9B8A |
| Background      | Off-white   | #FAF8F5 |
| Card            | Light cream | #F5F2ED |
| Text Primary    | Dark sage   | #3D4A44 |
| Text Secondary  | Muted green | #6B7265 |
| Accent (warm)   | Terracotta  | #D77A61 |
| Danger          | Brick       | #C17B6F |
| Top Priority    | Sage        | #7D9B8A |
| High Priority   | Orange      | #D77A61 |
| Medium Priority | Gold        | #E8B86D |
| Low Priority    | Blue        | #8B9DAF |

---

## Quick Reference Card

| Item                       | Value                          |
| -------------------------- | ------------------------------ |
| Default planning time      | 9:00 PM                        |
| Default reminder shortcuts | 9 AM, 1 PM, 6 PM               |
| Max favorites              | 4 categories                   |
| Max MIT per day            | 1                              |
| Trial length               | 14 days                        |
| Deletion grace period      | 30 days                        |
| System categories          | Work, Wellness, Personal, Home |
| Priority levels            | Top, High, Medium, Low         |
| Auth providers             | Google, Apple (iOS only)       |
| Current phase              | Open Beta (all features free)  |
