# QA Testing Document — Domani v1.0.24

**Branch:** `dev/public-beta`
**Build Version:** 1.0.24
**Date:** March 3, 2026
**Testers:** Phil, Sami

---

## What's New in This Build

### 1. Unified 24-Hour Rollover Cycle
The evening rollover now works on a continuous 24-hour cycle. If your planning reminder is set to 7 PM, the rollover window runs from 7 PM through 6:59 PM the next day. If you miss the evening prompt, you'll get it the next morning when you open the app.

### 2. Real-Time Completion Celebration
When you complete your last task for the day, the celebration modal fires immediately — no waiting until tomorrow.

### 3. Optional Planning Reminder Notifications
Users can now disable push notifications while still keeping the in-app evening planning prompt.

### 4. Celebration Modal Copy Update
- Body: "You completed everything on your list. That's the power of intentional planning."
- Button: "Keep it up"

### 5. Dev Tools (Internal Testing Only)
Two buttons in Settings to simulate rollover flows without waiting for your reminder time.

---

## Test Scenarios

### A. Evening Rollover — Notification Tap

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Set planning reminder time to a few minutes from now | Reminder time saved in Settings | |
| 2 | Wait for push notification to arrive | Notification appears at set time | |
| 3 | Tap the notification | App opens to Planning tab | |
| 4 | Observe rollover modal (if you have incomplete tasks) | Modal shows with unfinished tasks from today | |
| 5 | Check MIT section at top | Shows your most important task with star icon | |
| 6 | Select some tasks, tap "Carry Forward (X)" | Selected tasks move to tomorrow's plan | |
| 7 | Alternatively, tap "Start Fresh Instead" | Modal dismisses, no tasks carried over | |

### B. Evening Rollover — App Open (No Notification Tap)

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Have incomplete tasks and a planning reminder time set | Precondition | |
| 2 | After your reminder time passes, force-close the app | App fully closed | |
| 3 | Re-open the app (don't tap the notification) | Rollover modal appears automatically | |
| 4 | Same modal behavior as notification tap path | Tasks selectable, carry forward works | |
| 5 | Close and re-open app again | Rollover does NOT show again (already prompted this cycle) | |

### C. Morning Rollover (Missed Evening)

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Have incomplete tasks and reminder set for evening | Precondition | |
| 2 | Don't open the app at all in the evening | Skip the evening entirely | |
| 3 | Open the app the next morning (before reminder time) | Rollover modal appears with yesterday's unfinished tasks | |
| 4 | Modal copy should say "Today's Unfinished Tasks" | Reflects morning context | |
| 5 | Carry forward sends tasks to today's plan (not tomorrow) | Correct plan target for morning mode | |

### D. Completion Celebration

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Have a plan with 1+ tasks for today | Tasks visible on Today screen | |
| 2 | Complete all tasks one by one | Normal checkoff behavior | |
| 3 | When the LAST task is completed | Celebration modal appears immediately | |
| 4 | Modal shows "You did it!" heading | Correct | |
| 5 | Body says "You completed everything on your list..." | No mention of "yesterday" | |
| 6 | Task count badge shows correct number | e.g., "3 tasks completed" | |
| 7 | Tap "Keep it up" | Modal dismisses | |
| 8 | Re-open app later same day | Celebration does NOT fire again | |

### E. Planning Reminder Settings

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Go to Settings > Notifications | Section visible | |
| 2 | Toggle "Planning Reminder Notification" ON | Time picker row appears with editable time | |
| 3 | Edit the time | Time saves correctly | |
| 4 | Toggle notification OFF | Label changes to "Evening Planning Time" with subtitle explaining in-app prompt still works | |
| 5 | With toggle ON, deny notification permissions at OS level | Amber warning banner appears in Settings | |
| 6 | Tap the warning to open OS Settings | Opens iOS/Android notification settings | |

### F. Dev Tools (Internal Only)

| # | Step | Expected Result | Pass? |
|---|------|-----------------|-------|
| 1 | Scroll to bottom of Settings | "DEV TOOLS" section visible | |
| 2 | Tap "Simulate Evening Reminder" | Seeds test tasks, navigates to Planning, rollover modal appears | |
| 3 | Tap "Trigger App-Open Rollover" | Seeds test tasks, rollover modal appears (bypasses time check) | |
| 4 | Both buttons use sage/brand color theme | No purple or off-brand colors | |

---

## Edge Cases to Verify

| Scenario | Expected Behavior |
|----------|-------------------|
| No incomplete tasks at rollover time | Rollover modal skipped entirely |
| No planning reminder time set | No rollover triggers at all |
| Complete all tasks, then add more and complete those | Celebration only fires once per day |
| Sign out and sign in as different user | No leftover data from previous account |
| Tasks with reminder times in rollover | Clock icon + time displayed on task card |
| Tasks without reminder times in rollover | No clock icon shown |
| Multiple MITs from 2-day query | Only most recent MIT featured, others in "Other Tasks" |

---

## Regression Checks

- [ ] Normal daily planning works (add tasks, set MIT, lock plan)
- [ ] Task completion/uncomplete works
- [ ] Task editing works
- [ ] Free tier 3-task limit enforced
- [ ] Profile editing (name, timezone) works
- [ ] Sign out / sign in flow works
- [ ] App navigation between all tabs works

---

## Known Issues / Notes

- Dev Tools section is intentionally visible in this build for internal testing. Will be hidden before public release.
- Subscription UI is shown but RevenueCat is disabled during beta phase.
- If rollover doesn't trigger, check that you have a planning reminder time set in Settings.

---

## How to Report Issues

Note the following when reporting:
1. **What you did** (steps to reproduce)
2. **What you expected**
3. **What actually happened**
4. **Screenshot if possible**
