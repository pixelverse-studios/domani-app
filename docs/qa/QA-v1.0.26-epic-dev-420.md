# QA Build — Epic DEV-420: Planning Screen UX Cleanup

**Branch:** `epic/dev-420`
**Version:** 1.0.26
**Date:** March 5, 2026
**Testers:** Phil, Sami

---

## What's New in This Build

### Planning Screen Changes

- **Day toggle removed from task form** — Switching between Today/Tomorrow is now done exclusively via the pill toggle at the top of the planning screen. The "Planning for Today/Tomorrow" toggle inside the Add Task form is gone.

- **Planning tips moved below form** — The daily planning tip now appears in a single fixed position below the Add Task button (or below the open form). Previously it could appear in multiple spots.

- **More planning tips** — The tip library expanded from 6 to 21 tips. Tips rotate so you see a new one each day.

- **Inline task count next to date** — The large task recap card is replaced with a simple inline "{n} tasks" display that sits next to the date (e.g., "Wednesday, March 5th — 3 tasks"). Much less visual clutter.

### Bug Fixes

- **Task rollover no longer shows duplicates** — After carrying tasks forward, the source plan (e.g., today) now immediately removes the rolled-over tasks instead of showing them until the cache expires.

- **Task reminder notifications fixed for tasks without notes** — Tasks with no notes were crashing the notification scheduler on iOS. Now works for all tasks.

### Dev Tools Improvements

- **Rollover dev tools now always work** — The "Trigger App-Open Rollover" and "Reset Rollover Flag" buttons now bypass all time/cycle checks, so they work regardless of your planning reminder time or whether you've already been prompted today.

- **Better feedback on dev tool actions** — Each dev tool button now shows an alert confirming what happened (e.g., "Tasks seeded, rollover triggered") instead of silently executing.

---

## Dev Tools Reference

For testing rollover flows, there are 4 buttons in Settings > Dev Tools:

### 1. Simulate Evening Reminder
Mimics tapping the "time to plan tomorrow" push notification.
- Deletes your current tasks and inserts 4 test tasks (with varying reminder times to demo the eligibility filter)
- Navigates you to the planning screen and opens the rollover modal — the same flow a real notification tap would trigger
- **Use when:** You want to test the notification-tap rollover experience end-to-end

### 2. Trigger App-Open Rollover
Mimics opening the app and seeing the rollover prompt automatically.
- Seeds the same 4 test tasks
- Forces the app-open rollover modal to appear immediately, bypassing all time/cycle checks (no planning reminder time needed, no time-of-day requirement)
- The modal appears on whatever screen you're on (it lives at the app level, not just the planning screen)
- **Use when:** You want to test the "open the app and get prompted" flow without worrying about your reminder time or whether you've already been prompted today

### 3. Reset Rollover Flag
Clears the "already prompted" flag and re-triggers rollover with your **real tasks** (no test data).
- Does NOT seed fake tasks — uses whatever incomplete tasks you actually have
- Bypasses time/cycle checks so the modal appears immediately
- **Use when:** You want to test rollover with your own tasks, or you've already been prompted and want to see the modal again

### 4. Preview Task Notification
Fires a sample push notification that arrives in ~1 second.
- Shows what a task reminder looks like with a title and notes body
- Only works on real devices (not simulators on Android)
- **Use when:** You want to preview the notification appearance/sound

> **Note:** Buttons 1 and 2 both warn before running because they delete your current tasks and replace them with test data. Button 3 does not — it works with your existing tasks.

---

## Test Scenarios

### A. Day Toggle Removal (DEV-421)

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Open Planning screen | Header shows Today/Tomorrow pill toggle | |
| 2 | Tap "Tomorrow" pill | Date changes to tomorrow, task list updates | |
| 3 | Tap "Add Task" button | Form opens with no day toggle inside it | |
| 4 | Fill out task and submit | Task appears in tomorrow's list | |
| 5 | Tap "Today" pill while form is open | Form closes, switches to today's tasks | |
| 6 | Open form, tap "Today" pill, then re-open form | Form shows tasks for today | |

### B. Planning Tip Position (DEV-422)

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Open Planning screen (form closed) | Planning tip appears below the "Add Task" button | |
| 2 | Tap "Add Task" to open form | Planning tip appears below the open form | |
| 3 | Close the form | Tip stays in position below the Add Task button | |
| 4 | Scroll down on a screen with tasks | Tip appears once, between form area and task list | |

### C. Expanded Planning Tips (DEV-423)

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Open Planning screen | A planning tip is shown | |
| 2 | Close and reopen the app on a different day | A different tip should appear | |
| 3 | Check tip content | Tips are practical planning advice, clearly written | |

### D. Inline Task Count (DEV-430)

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Open Planning screen with 0 tasks | No task count shown next to date | |
| 2 | Add 1 task | Date row shows "1 task" (singular) in brand color | |
| 3 | Add 2 more tasks | Date row shows "3 tasks" (plural) | |
| 4 | Switch to Tomorrow | Task count updates to reflect tomorrow's tasks | |
| 5 | Delete all tasks | Task count disappears from date row | |

### E. Task Rollover (DEV-432)

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Go to Settings > Dev Tools | Dev Tools section is visible | |
| 2 | Tap "Trigger App-Open Rollover" | Confirmation dialog warns about replacing tasks | |
| 3 | Tap "Continue" | Alert says "Rollover Triggered", then rollover modal appears | |
| 4 | In the modal, select tasks to carry forward | Checkboxes toggle correctly | |
| 5 | Tap "Carry Forward" | Modal closes, tasks appear on tomorrow's plan | |
| 6 | Switch to today | Rolled-over tasks are gone (not showing duplicates) | |

### F. Rollover — Notification-Tap Flow

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Tap "Simulate Evening Reminder" in Dev Tools | Confirmation dialog, then alert confirming seed | |
| 2 | Tap OK on the alert | Navigates to planning screen, rollover modal appears | |
| 3 | Review tasks in modal | Shows 3 eligible tasks (MIT + 2 afternoon tasks). The 11pm task may be filtered. | |
| 4 | Tap "Start Fresh" | Modal closes, Add Task form opens for tomorrow | |

### G. Rollover — Reset Flag (Real Tasks)

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Create 2-3 tasks on today's plan (don't complete them) | Tasks visible on planning screen | |
| 2 | Tap "Reset Rollover Flag" in Dev Tools | Alert confirms flag cleared | |
| 3 | Wait a moment | Rollover modal appears with your real tasks | |
| 4 | Carry forward or start fresh | Flow works same as other rollover paths | |

### H. Task Notification Fix

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Create a task with a reminder time but NO notes | Task saves successfully | |
| 2 | Wait for the reminder time to arrive | Notification appears without crashing | |
| 3 | Create a task with a reminder time AND notes | Notification shows title and notes body | |
| 4 | Tap "Preview Task Notification" in Dev Tools | Sample notification arrives in ~1 second | |

---

## Edge Cases to Verify

| Scenario | Expected Behavior |
|----------|-------------------|
| Switch days rapidly while form is open | Form closes cleanly on each switch |
| Add 10+ tasks, check inline count | Count displays correctly, no overflow |
| Carry forward tasks, then immediately add a new task | New task appears only on the target plan |
| Trigger rollover when you have 0 incomplete tasks | Modal should not appear (nothing to carry) |
| Tap "Trigger App-Open Rollover" twice quickly | Only one modal appears |
| Task with very long title in inline count | Count stays aligned, title doesn't affect it |
| Planning tip on first ever app open | Tip displays normally |

---

## Regression Checks

- [ ] Can create, edit, and delete tasks
- [ ] Task priority (MIT, high, medium, low) works correctly
- [ ] Category selection works in task form
- [ ] Task reminder scheduling works
- [ ] Today screen shows today's tasks
- [ ] Settings screen loads without errors
- [ ] Sign out and sign in works
- [ ] App handles no internet gracefully

---

## Known Issues / Notes

- Dev Tools are visible to all users during beta — they will be hidden before public release
- The "Preview Task Notification" button only works on real devices, not Android simulators
- Planning tips are date-based — you'll see the same tip all day, a new one tomorrow

---

## How to Report Issues

When you find a bug, include:
1. **Steps to reproduce** — What did you tap/do, in order?
2. **Expected** — What should have happened?
3. **Actual** — What happened instead?
4. **Screenshot or screen recording** if possible
5. **Device** — iPhone/Android, model, OS version
