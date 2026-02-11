# Task Rollover Feature - Product Requirements Document

**Version:** 1.2
**Last Updated:** February 10, 2026
**Author:** Product Team
**Status:** Draft

## Product overview

### Summary

The Task Rollover feature allows users to selectively carry forward incomplete tasks at two key moments: (1) when they first open the app each morning to address yesterday's incomplete tasks, and (2) during evening planning to clean up today's incomplete tasks before planning tomorrow. Rather than automatically moving all unfinished tasks forward (which creates an overwhelming backlog), users consciously choose which tasks deserve another day of focus.

This feature preserves Domani's core philosophy of **intentional planning**. Users actively decide their daily priorities rather than inheriting unfinished business by default.

### Background

Currently, incomplete tasks from previous days remain orphaned in the past. Users must manually recreate tasks if they want to work on them today, leading to friction and lost context. Task Rollover bridges this gap while maintaining the deliberate nature of evening planning.

## Goals

### Business goals

1. **Increase daily active usage** by providing a compelling reason to open the app each morning
2. **Reduce task abandonment** by surfacing incomplete work in a non-overwhelming way
3. **Improve user retention** by demonstrating the app remembers and respects their priorities
4. **Differentiate from competitors** who either auto-rollover everything or ignore the problem entirely

### User goals

1. **Never lose track of important tasks** that did not get completed
2. **Start each day intentionally** by actively choosing what deserves focus
3. **Avoid backlog anxiety** by having a clean slate option
4. **Preserve task context** including categories, priorities, and reminders

### Non-goals

1. **Auto-rollover all tasks** - This defeats intentional planning and creates backlog anxiety
2. **Roll over tasks older than yesterday** - Stale tasks should be recreated deliberately
3. **Complex scheduling features** - This is not a recurring task system
4. **Bulk task management** - Focus is on yesterday's tasks only

## User personas

### Primary persona: Evening Planner

**Demographics:** Working professional, 25-45, uses the app during evening hours to plan tomorrow

**Behaviors:**

- Plans 2-5 tasks each evening
- Occasionally does not complete all planned tasks
- Values intentional, mindful productivity
- Dislikes cluttered task lists

**Needs from rollover:**

- Quick way to bring forward important incomplete tasks
- Option to start fresh without guilt
- Preservation of task details (category, priority, reminders)

### Secondary persona: Busy Professional

**Demographics:** High-volume task creator, often overcommits

**Behaviors:**

- Frequently has incomplete tasks
- Uses the MIT feature regularly
- Power user with many daily tasks

**Needs from rollover:**

- Easy multi-select for carrying forward multiple tasks
- MIT transfer capability
- Reminder time management

### Access model

All users have full access to the rollover feature. Access requires authentication.

| User Type                 | Access Level                 |
| ------------------------- | ---------------------------- |
| Trial user (14-day trial) | Full rollover access         |
| Purchased user            | Full rollover access         |
| Not signed in             | No access (requires sign in) |

## User experience

### Entry points

1. **App launch (primary)** - Modal appears after sign-in on first open of the day
2. **Background to foreground** - If app was backgrounded overnight, check on resume
3. **Evening planning flow** - When user enters planning for tomorrow and has incomplete tasks from today with reminders before the planning time or no reminders

### Core experience flow

1. User opens Domani for the first time today
2. App detects incomplete tasks from yesterday (only yesterday, not older)
3. Rollover modal slides up over the Today screen
4. User sees yesterday's MIT (if any) prominently displayed with a star icon
5. User sees other incomplete tasks with checkboxes
6. User selects tasks to carry forward
7. User optionally toggles "Make this today's MIT"
8. User chooses reminder preference (keep times or clear)
9. User taps "Carry Forward (N)" or "Start Fresh Instead"
10. Selected tasks appear on today's plan
11. Modal dismisses, will not show again today

### Evening planning flow

When the user enters planning mode for tomorrow and has incomplete tasks from today:

1. User navigates to planning screen for tomorrow (triggered by planning reminder or manual navigation)
2. App detects incomplete tasks from **today** that should be considered for rollover:
   - Tasks with reminders **before** the current time (e.g., 4pm task when it's now 6pm)
   - Tasks with **no reminders** set (unscheduled tasks)
3. Rollover modal slides up over the Planning screen
4. Modal shows "Clean up today before planning tomorrow" or similar supportive header
5. User sees today's incomplete MIT (if any) prominently displayed with a star icon
6. User sees other incomplete tasks that meet the criteria (reminder before now, or no reminder)
7. User selects tasks to carry forward to tomorrow's plan
8. User optionally toggles "Make this tomorrow's MIT"
9. User chooses reminder preference (keep times or clear)
10. User taps "Carry Forward (N)" or "Start Fresh Instead"
11. Selected tasks appear on tomorrow's plan
12. Modal dismisses and user continues planning tomorrow

**Key differences from morning flow:**

- Filters out tasks with reminders in the future (e.g., 7pm task when planning at 6pm)
- Carries forward to **tomorrow** instead of today
- Appears in planning context, not at app launch
- Only shows once per planning session

### UI/UX highlights

- **No guilt trip**: Copy is supportive ("Pick up where you left off") not accusatory ("You didn't finish these")
- **MIT prominence**: Yesterday's Most Important Task is visually distinct with star icon
- **Quick dismiss**: "Start Fresh Instead" is easily accessible but not the visual focus
- **Task count feedback**: Primary button shows exactly how many tasks will be carried
- **Calm aesthetics**: Modal uses app's calming color palette, no urgent red or warning colors

### Advanced features

- **Select all**: Quick way to carry forward all tasks
- **Reminder preservation**: Keep original reminder times adjusted to today
- **MIT promotion**: Option to make yesterday's incomplete MIT today's MIT

## States and scenarios

This section describes every state the designer needs to account for when creating the rollover experience.

### Loading state

**When it occurs:** User opens the app and the system is checking for yesterday's incomplete tasks.

**Expected behavior:**

- This check should feel nearly instant (under 200ms)
- The Today screen loads normally in the background
- No visible loading indicator is needed unless the check takes longer than expected
- If loading takes more than 1 second, show a subtle activity indicator

**Design consideration:** Users should not perceive any delay. The modal should appear smoothly without the user noticing a "checking" phase.

### Error state: Fetch failed

**When it occurs:** Network error when trying to load yesterday's tasks.

**Expected behavior:**

- Skip the rollover prompt silently
- Do not block app launch or show an error message
- User proceeds directly to their Today screen
- Do not mark the user as "prompted" so they can see the prompt later when connectivity returns

**Rationale:** A failed fetch should never prevent users from using the app. The rollover is a convenience feature, not critical functionality.

### Error state: Creation failed

**When it occurs:** Network drops or server error while creating the carried-forward tasks.

**Expected behavior:**

- Use an all-or-nothing approach: if any task fails to create, roll back all created tasks
- Show an error message within the modal
- Keep the modal open with the user's selections intact
- Provide a "Try Again" button
- User can also choose to dismiss and start fresh

**Design consideration:** The user should not end up in a partial state where some tasks were created and others were not. This prevents confusion about which tasks made it to today's plan.

### Success state

**When it occurs:** All selected tasks were successfully carried forward.

**Expected behavior:**

- Brief success feedback (subtle animation or checkmark)
- Modal slides down and dismisses
- Today screen refreshes to show the new tasks
- User is marked as "prompted" for today so they won't see the modal again

**Design consideration:** The success feedback should be brief (under 500ms) so the user can quickly get to their tasks.

### Celebration state (all tasks completed)

**When it occurs:** User opens the app for the first time today, had tasks planned for yesterday, and completed all of them.

**Expected behavior:**

- A celebratory modal appears (same style as rollover modal)
- Modal congratulates the user for completing everything
- Supportive, encouraging tone - reinforce the positive behavior
- Single dismiss button to continue to Today screen
- User is marked as "prompted" for today so they won't see it again

**Trigger conditions:**

- First app open of the day
- User had at least one task planned for yesterday
- All of yesterday's tasks were marked complete
- User hasn't been prompted today

**Design consideration:** This should feel like a genuine celebration, not an interruption. Keep it brief and warm. The goal is to reinforce the habit of completing tasks and make the user feel good about their productivity.

### Start Fresh confirmation dialog

**When it occurs:** User taps "Start Fresh Instead" in the rollover modal.

**Purpose:** Prevent accidental dismissal of the rollover prompt.

**Expected behavior:**

1. Confirmation dialog appears explaining what will happen
2. User sees two options: "Yes, Start Fresh" and "Go Back"
3. If confirmed, modal dismisses and user is marked as prompted
4. If canceled, user returns to rollover modal with selections intact

**Design consideration:** Keep the confirmation concise and non-judgmental. This is a valid choice, not a warning.

### MIT conflict dialog

**When it occurs:** User toggles "Make this today's MIT" but today already has an MIT assigned.

**Trigger:** The toggle is switched on while an existing MIT exists for today.

**Expected behavior:**

1. A confirmation dialog appears asking the user to choose
2. Dialog explains the conflict clearly
3. User chooses between keeping the existing MIT or replacing it
4. If user chooses "Replace," the existing MIT is demoted to High priority
5. If user chooses "Keep existing," the rollover task is created with High priority instead of MIT status

**Design consideration:** This should be a clear, simple choice. The dialog should not feel like an error—it's a normal decision point.

## Content and copy

All text strings for the rollover experience. These serve as a starting point and can be adjusted during design review.

### Modal content

**Morning flow:**

| Element         | Text                                              |
| --------------- | ------------------------------------------------- |
| Modal header    | Pick up where you left off                        |
| Modal subheader | From [Yesterday's date, e.g., Monday, January 26] |

**Evening planning flow:**

| Element         | Text                                                 |
| --------------- | ---------------------------------------------------- |
| Modal header    | Clean up today before planning tomorrow              |
| Modal subheader | From today, [Today's date, e.g., Monday, January 26] |

**Shared elements:**

| Element                        | Text                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| MIT section label              | Your Most Important Task                                                                    |
| Other tasks section label      | Other incomplete tasks                                                                      |
| MIT toggle label               | Make this today's MIT                                                                       |
| Reminder option 1 (default)    | Keep original reminder times                                                                |
| Reminder option 2              | Clear reminders                                                                             |
| Primary button                 | Carry Forward (N)                                                                           |
| Secondary action               | Start Fresh Instead                                                                         |
| Start Fresh confirmation title | Start with a clean slate?                                                                   |
| Start Fresh confirmation body  | These tasks will stay in yesterday's plan. You can always recreate them manually if needed. |
| Start Fresh confirm button     | Yes, Start Fresh                                                                            |
| Start Fresh cancel button      | Go Back                                                                                     |
| Select all label               | Select All                                                                                  |
| More tasks note                | and X more in yesterday's plan                                                              |

### Celebration modal content

| Element        | Text                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| Modal header   | You did it!                                                                         |
| Modal body     | You completed everything you planned for yesterday. Keep that momentum going today. |
| Dismiss button | Start Today                                                                         |

### Error and dialog content

| Element                   | Text                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Creation error message    | Couldn't save your tasks. Please try again.                                                            |
| Error retry button        | Try Again                                                                                              |
| MIT conflict dialog title | You already have an MIT for today                                                                      |
| MIT conflict dialog body  | Would you like to keep "[existing MIT title]" as your MIT, or replace it with "[rollover task title]"? |
| MIT conflict option 1     | Keep existing                                                                                          |
| MIT conflict option 2     | Replace                                                                                                |

### Tone guidelines

- Use supportive, encouraging language
- Avoid guilt-inducing phrases like "You didn't finish" or "Overdue tasks"
- Frame incomplete tasks as opportunities, not failures
- Keep copy concise—users want to make decisions quickly

## Edge cases

| Scenario                                                            | Expected Behavior                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Only 1 incomplete task (not MIT)                                    | Modal shows with just "Other incomplete tasks" section; MIT section is hidden                                |
| Only MIT incomplete                                                 | Modal shows with just MIT section; "Other incomplete tasks" section is hidden                                |
| All reminders have passed                                           | Reminders are automatically cleared regardless of user's selection; no special messaging needed              |
| User already created tasks today                                    | Rollover still shows; new tasks are added alongside existing tasks                                           |
| User is in active tutorial                                          | Rollover is deferred until tutorial completes                                                                |
| User dismisses via back gesture                                     | Shows Start Fresh confirmation dialog (same as tapping "Start Fresh Instead")                                |
| User force-closes app during rollover                               | No tasks are created; prompt shows again on next app open                                                    |
| User had tasks yesterday and completed all                          | Celebration modal appears congratulating them                                                                |
| User had no tasks planned yesterday                                 | No modal appears; user goes directly to Today screen                                                         |
| User was already prompted today                                     | Modal does not appear; user goes directly to Today screen                                                    |
| User is offline                                                     | Modal does not appear; user is not marked as prompted so they can see it when back online                    |
| User has more than 10 incomplete tasks                              | Show top 10 by priority with note "and X more in yesterday's plan"; remaining tasks stay in yesterday's plan |
| Yesterday's MIT was completed                                       | MIT section not shown; only other incomplete tasks appear                                                    |
| All yesterday's tasks were completed                                | Celebration modal appears (see "Celebration state" above)                                                    |
| User enters evening planning with tasks that have future reminders  | Tasks with reminders after current time are excluded from rollover prompt                                    |
| User enters evening planning at 6pm with 4pm and 7pm tasks          | Only 4pm task shown (missed), 7pm task excluded (still scheduled)                                            |
| User enters evening planning with only unscheduled incomplete tasks | All unscheduled incomplete tasks shown in prompt                                                             |
| User already saw rollover during morning, then plans in evening     | Evening planning rollover shows separately (different context)                                               |
| All today's eligible tasks completed when entering evening planning | No rollover modal; user proceeds directly to planning tomorrow                                               |

## Accessibility considerations

### Touch targets

- All interactive elements (checkboxes, buttons, toggles) must have a minimum touch target size of 44x44 points
- Task rows should be tappable across their full width to toggle selection

### Focus management

- Modal should trap focus when open (prevent interaction with content behind it)
- Screen reader should announce the modal title when it opens
- Focus should move to the first interactive element when modal opens
- When modal closes, focus should return to the appropriate element on the Today screen

### Screen reader support

- Checkboxes should be clearly labeled (e.g., "Select [task title] for carry forward, checkbox, unchecked")
- The "Carry Forward" button should announce the count (e.g., "Carry Forward, 3 tasks selected")
- State changes should be announced (e.g., "Task selected" when checkbox is toggled)

### Visual accessibility

- Color should not be the only indicator of state—use icons and text alongside color
- Selected tasks should have a visible checkmark icon, not just a color change
- MIT star icon should be accompanied by the "Your Most Important Task" label
- Sufficient color contrast for all text and interactive elements

### Dismissal

- Dismiss actions ("Start Fresh Instead," close gesture) should be reachable without scrolling
- Support standard iOS/Android back gestures for dismissal

## Animation and transitions

### Modal entrance

- Modal slides up from the bottom of the screen
- Overlays the Today screen with a semi-transparent backdrop
- Animation should feel smooth and natural (approximately 300ms duration)
- Today screen content should dim slightly when modal is present

### Modal exit: Success

- Brief success feedback (subtle checkmark or green flash)
- Modal slides down and off screen
- Backdrop fades out simultaneously
- Total exit animation approximately 400ms

### Modal exit: Start fresh

- Modal slides down immediately without success feedback
- Faster exit than success state (approximately 250ms)
- Clean, decisive feel

### Modal exit: Celebration dismissed

- Modal slides down smoothly
- Similar timing to success state (approximately 300ms)
- Warm, positive feel to match the celebratory content

### Checkbox selection

- Immediate visual feedback when tapped
- Checkmark appears with a subtle scale or fade animation
- No delay between tap and visual response

### Button state updates

- "Carry Forward" button count updates in real-time as selections change
- Subtle pulse or highlight when count changes
- Button should feel responsive and alive

### Error state

- Subtle shake animation on error message to draw attention
- Error message fades in, does not abruptly appear
- "Try Again" button should be clearly highlighted

## Functional requirements

### FR-1: Detect incomplete tasks

**Priority:** P0 - Critical

| Requirement                                      | Behavior                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Find yesterday's incomplete tasks (morning flow) | Only look at tasks from yesterday (not older days) that were not marked complete                                                                  |
| Find today's incomplete tasks (evening flow)     | Look at today's incomplete tasks where: (1) reminder is before current time, OR (2) task has no reminder set. Exclude tasks with future reminders |
| Separate MIT from other tasks                    | Show the day's Most Important Task separately from other incomplete tasks                                                                         |
| Determine if prompt should show                  | Show prompt when: user hasn't seen it in current context, has incomplete tasks that meet criteria, and is online                                  |
| Handle loading gracefully                        | Check should feel instant; show screen normally if check takes too long                                                                           |

### FR-2: Display celebration modal (all tasks completed)

**Priority:** P1 - High

| Requirement                  | Behavior                                                 |
| ---------------------------- | -------------------------------------------------------- |
| Detect all-complete scenario | User had tasks yesterday and completed all of them       |
| Show celebration modal       | Same modal style as rollover, with encouraging message   |
| Single dismiss action        | "Start Today" button closes modal and shows Today screen |
| Mark as prompted             | User won't see celebration or rollover again today       |

### FR-3: Display rollover modal

**Priority:** P0 - Critical

| Requirement                         | Behavior                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Show MIT section prominently        | Star icon, visual emphasis, own checkbox for selection                                                |
| Show "Make this today's MIT" toggle | Visible when any task is selected (not just MIT); off by default; only one task can have this enabled |
| Show other tasks with multi-select  | Checkboxes for each task, select all option available                                                 |
| Order tasks by priority             | Show tasks in priority order (High → Medium → Low) within the other tasks section                     |
| Limit displayed tasks               | Show maximum 10 tasks; if more exist, show "and X more in yesterday's plan" note                      |
| Show reminder preference            | Two options: "Keep original reminder times" (default) or "Clear reminders"                            |
| Show task count on button           | Primary button displays count of selected tasks                                                       |
| Support starting fresh              | Secondary action dismisses without creating any tasks                                                 |
| Use positive, welcoming tone        | No guilt-inducing language                                                                            |

### FR-4: Create carried-forward tasks

**Priority:** P0 - Critical

| Requirement                  | Behavior                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Copy selected tasks to today | New tasks created with same title, priority, category, and reminder time; descriptions and attachments are NOT copied (they stay with the original task) |
| Handle MIT transfer          | If toggle is on and today has no MIT, make the task today's MIT                                                                                          |
| Handle MIT conflict          | If today already has an MIT, show confirmation dialog                                                                                                    |
| Adjust reminder times        | If keeping reminders, change date to today but keep same time                                                                                            |
| Clear past reminders         | If the reminder time has already passed today, clear it automatically                                                                                    |
| All-or-nothing creation      | If any task fails to create, roll back all and show error                                                                                                |

### FR-5: Integrate with app launch

**Priority:** P0 - Critical

| Requirement                       | Behavior                                                          |
| --------------------------------- | ----------------------------------------------------------------- |
| Show on first app open of day     | After user is signed in                                           |
| Do not block app loading          | Today screen loads in background while modal shows                |
| Wait for tutorial completion      | If user is in tutorial, defer rollover until tutorial ends        |
| Skip if offline                   | Do not show prompt when network is unavailable; allow retry later |
| Refresh tasks after carry forward | Today's task list updates immediately to show new tasks           |

### FR-6: Track analytics

**Priority:** P1 - High

| Requirement                    | Behavior                                                            |
| ------------------------------ | ------------------------------------------------------------------- |
| Track when prompt is shown     | Record number of tasks available and whether an MIT was present     |
| Track successful carry forward | Record number of tasks carried, MIT status, and reminder preference |
| Track start fresh              | Record number of tasks that could have been carried                 |

## Success metrics

### User-centric metrics

| Metric                 | Target                               | How to Measure                                                            |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| Prompt engagement rate | More than 70% interact (vs. dismiss) | Users who carry forward at least one task divided by users who see prompt |
| Average tasks carried  | 1.5-2.5 per prompt                   | Average number of tasks in successful carry forwards                      |
| MIT carry rate         | More than 50% when MIT available     | Users who carry MIT divided by users who see prompt with MIT              |

### Business metrics

| Metric                 | Target                       | How to Measure                                            |
| ---------------------- | ---------------------------- | --------------------------------------------------------- |
| Day 1 retention lift   | +5% for users who see prompt | Compare retention of users with/without rollover          |
| Morning session length | +2 minutes                   | Time in app on days with rollover vs. without             |
| Task completion rate   | +10% for rolled-over tasks   | Completion rate of rolled tasks vs. freshly created tasks |

### Technical metrics

| Metric             | Target      | How to Measure                                     |
| ------------------ | ----------- | -------------------------------------------------- |
| Modal load time    | Under 200ms | Time from sign-in confirmed to modal visible       |
| Task creation time | Under 500ms | Time to create all selected tasks                  |
| Error rate         | Under 0.1%  | Failed rollover attempts divided by total attempts |

## Milestones and sequencing

### Project estimate

**Total estimated effort:** 3-4 engineering days
**Recommended team size:** 1 developer

### Suggested phases

#### Phase 1: Foundation (1-1.5 days)

| Task                                                               | Estimate |
| ------------------------------------------------------------------ | -------- |
| Create prompt state tracking (remember if user was prompted today) | 2 hours  |
| Create data hook for fetching yesterday's incomplete tasks         | 4 hours  |

**Deliverable:** System that can fetch incomplete tasks and track whether user saw the prompt

#### Phase 2: UI and service (1.5 days)

| Task                            | Estimate |
| ------------------------------- | -------- |
| Build rollover modal component  | 6 hours  |
| Implement task creation service | 4 hours  |

**Deliverable:** Functional modal that displays tasks and creates rolled-over tasks

#### Phase 3: Integration and polish (1 day)

| Task                           | Estimate |
| ------------------------------ | -------- |
| Integrate into app launch flow | 4 hours  |
| Add analytics tracking         | 2 hours  |
| Edge case testing and polish   | 2 hours  |

**Deliverable:** Feature complete and ready for QA

## User stories

### US-001: View rollover prompt on app launch

**Description:** As a user, I want to see a prompt about yesterday's incomplete tasks when I first open the app each day, so that I can decide whether to continue working on them.

**Acceptance criteria:**

- [ ] Modal appears after I sign in
- [ ] Modal only appears on my first app open of the current day
- [ ] Modal does not appear if I have no incomplete tasks from yesterday
- [ ] Modal does not appear if I already saw it today
- [ ] Today screen loads in background while modal is displayed

### US-002: View MIT prominently in rollover prompt

**Description:** As a user, I want to see yesterday's Most Important Task displayed prominently in the rollover prompt, so that I can quickly decide whether to continue prioritizing it.

**Acceptance criteria:**

- [ ] MIT section appears at top of task list in modal
- [ ] MIT is visually distinguished with a star icon
- [ ] MIT has its own checkbox for selection
- [ ] If no MIT exists from yesterday, MIT section is not displayed

### US-003: Select tasks to carry forward

**Description:** As a user, I want to select which incomplete tasks to carry forward to today, so that I only commit to tasks I intend to complete.

**Acceptance criteria:**

- [ ] Each task has a checkbox for selection
- [ ] Tapping a task row toggles its selection
- [ ] Selected task count is reflected in the primary button text
- [ ] I can select zero, some, or all tasks

### US-004: Carry forward selected tasks

**Description:** As a user, I want to carry forward my selected tasks to today's plan, so that I can continue working on them without recreating them.

**Acceptance criteria:**

- [ ] Tapping "Carry Forward (N)" creates new tasks for today
- [ ] New tasks keep their original title, priority, category, and reminder time
- [ ] Descriptions and attachments are NOT copied (they remain with the original task)
- [ ] New tasks appear in today's task list immediately
- [ ] Modal dismisses after successful carry forward
- [ ] Rollover prompt will not appear again today

### US-005: Start fresh instead of carrying forward

**Description:** As a user, I want to start fresh without carrying forward any tasks, so that I can begin the day with a clean slate.

**Acceptance criteria:**

- [ ] "Start Fresh Instead" link is visible in modal
- [ ] Tapping it shows a confirmation dialog to prevent accidental dismissal
- [ ] Confirmation explains tasks will stay in yesterday's plan
- [ ] "Yes, Start Fresh" confirms and dismisses modal without creating any tasks
- [ ] "Go Back" returns to rollover modal with selections intact
- [ ] Rollover prompt will not appear again today after confirming

### US-006: Transfer MIT status to today

**Description:** As a user, I want to make any carried task my MIT for today, so that I can prioritize what matters most.

**Acceptance criteria:**

- [ ] "Make this today's MIT" toggle appears when any task is selected (not just yesterday's MIT)
- [ ] Only one task can have this toggle enabled at a time
- [ ] Toggle is off by default
- [ ] When enabled, carried task becomes today's MIT
- [ ] If today already has an MIT, I see a dialog asking me to choose (see US-007)

### US-007: Resolve MIT conflict

**Description:** As a user who already has an MIT for today, I want to choose whether to keep my existing MIT or replace it with the rolled-over task.

**Acceptance criteria:**

- [ ] Dialog appears when I try to make a rolled-over task my MIT but today already has one
- [ ] Dialog shows the titles of both the existing MIT and the rollover task
- [ ] I can choose "Keep existing" to keep my current MIT (rollover task becomes High priority)
- [ ] I can choose "Replace" to make the rollover task my MIT (existing MIT becomes High priority)
- [ ] My choice is respected and the rollover completes

### US-008: Preserve reminder times

**Description:** As a user, I want to keep my original reminder times when carrying tasks forward, so that I get reminded at the same time of day.

**Acceptance criteria:**

- [ ] Reminder preference section shows two options
- [ ] "Keep original reminder times" (default) adjusts the reminder to today at the same time
- [ ] "Clear reminders" removes reminders from the new tasks
- [ ] If a reminder time has already passed today, it is automatically cleared regardless of my selection

### US-009: Skip rollover when offline

**Description:** As a user without network connectivity, I want the rollover prompt to be skipped, so that I am not shown tasks that cannot be saved.

**Acceptance criteria:**

- [ ] Offline state is detected before showing prompt
- [ ] No modal appears when offline
- [ ] I am not marked as "prompted" so I can see the prompt later when connectivity returns
- [ ] Prompt appears normally when I am back online

### US-010: Coordinate with tutorial flow

**Description:** As a new user going through the tutorial, I want the rollover prompt to wait until I finish the tutorial, so that I am not overwhelmed with multiple modals.

**Acceptance criteria:**

- [ ] Rollover prompt is deferred until tutorial is complete
- [ ] Once tutorial completes, rollover prompt appears if I have incomplete tasks
- [ ] Users who completed the tutorial previously see rollover prompt normally

### US-011: Handle creation error gracefully

**Description:** As a user, I want clear feedback if something goes wrong when carrying forward tasks, so that I can try again without losing my selections.

**Acceptance criteria:**

- [ ] If task creation fails, all partially created tasks are rolled back
- [ ] Error message appears within the modal: "Couldn't save your tasks. Please try again."
- [ ] My selections remain intact
- [ ] "Try Again" button is available
- [ ] I can also choose to start fresh instead

### US-012: Refresh task list after rollover

**Description:** As a user, I want my Today screen to immediately reflect carried-forward tasks, so that I can see my updated task list.

**Acceptance criteria:**

- [ ] Today's task list updates immediately after successful rollover
- [ ] New tasks appear without requiring me to manually refresh
- [ ] Loading state is handled gracefully during refresh

### US-013: Display task categories in rollover modal

**Description:** As a user, I want to see the category of each task in the rollover prompt, so that I can make informed decisions about which tasks to carry forward.

**Acceptance criteria:**

- [ ] Each task row displays its category with appropriate color or emoji
- [ ] Tasks without categories display cleanly without a category indicator
- [ ] Category information is preserved when task is carried forward

### US-014: Handle empty task selection

**Description:** As a user, I want clear feedback when I try to carry forward with no tasks selected, so that I understand nothing will be created.

**Acceptance criteria:**

- [ ] "Carry Forward (0)" button is disabled when no tasks are selected
- [ ] I cannot accidentally trigger an empty rollover

### US-015: Support select all functionality

**Description:** As a user with multiple incomplete tasks, I want to quickly select all tasks for carry forward, so that I do not have to tap each one individually.

**Acceptance criteria:**

- [ ] "Select All" option available in the other tasks section
- [ ] Tapping it selects all non-MIT tasks
- [ ] Tapping again deselects all
- [ ] MIT selection is independent of "Select All"

### US-016: Show yesterday's date context

**Description:** As a user, I want to see which date these incomplete tasks are from, so that I have context about when I originally planned them.

**Acceptance criteria:**

- [ ] Modal subheader shows "From [day], [date]" (e.g., "From Monday, January 26")
- [ ] Date formatting is user-friendly
- [ ] Context helps me recall why tasks were not completed

### US-017: Handle rapid app opens gracefully

**Description:** As a user who opens the app multiple times quickly, I want the rollover system to handle this gracefully, so that I do not see duplicate prompts or errors.

**Acceptance criteria:**

- [ ] I am marked as "prompted" before modal displays to prevent duplicates
- [ ] No duplicate tasks are created if I somehow trigger rollover twice
- [ ] System handles quick open/close cycles without issues

### US-018: See celebration when all tasks completed

**Description:** As a user who completed all my tasks yesterday, I want to see a celebratory message when I open the app, so that I feel encouraged and recognized for my productivity.

**Acceptance criteria:**

- [ ] Celebration modal appears if I had tasks yesterday and completed all of them
- [ ] Modal has a warm, encouraging message
- [ ] Single button dismisses the modal and takes me to Today screen
- [ ] Modal does not appear if I had no tasks planned yesterday
- [ ] Modal does not appear again if I already saw it today

### US-019: Handle many incomplete tasks gracefully

**Description:** As a user with many incomplete tasks, I want the rollover modal to remain manageable and not overwhelming.

**Acceptance criteria:**

- [ ] Modal shows maximum 10 tasks (excluding MIT which shows separately)
- [ ] Tasks are ordered by priority (High → Medium → Low)
- [ ] If more than 10 tasks exist, modal shows "and X more in yesterday's plan" note
- [ ] Remaining tasks stay in yesterday's plan and are not lost
- [ ] User can manually recreate any tasks not shown in the modal

### US-020: Track rollover analytics

**Description:** As a product team member, I want analytics on rollover usage, so that I can measure feature adoption and optimize the experience.

**Acceptance criteria:**

- [ ] Event fires when rollover prompt is shown (includes task count, whether MIT present)
- [ ] Event fires on successful carry forward (includes task count, MIT carried, reminder preference)
- [ ] Event fires when user chooses start fresh (includes count of tasks that could have been carried)

### US-021: View rollover prompt during evening planning

**Description:** As a user planning tomorrow's tasks in the evening, I want to see a prompt about today's incomplete tasks that I should address, so that I can decide whether to carry them forward to tomorrow before finalizing my plan.

**Acceptance criteria:**

- [ ] Modal appears when I enter planning mode for tomorrow
- [ ] Modal only shows tasks from today that have either: (1) reminders before the current time, or (2) no reminders set
- [ ] Modal does NOT show tasks with reminders still in the future (e.g., 7pm task when it's 6pm)
- [ ] Modal does not appear if I have no incomplete tasks that meet the criteria
- [ ] Modal does not appear if I already saw it during this planning session
- [ ] Tasks are carried forward to **tomorrow's** plan, not today
- [ ] Copy reflects the evening planning context (e.g., "Clean up today before planning tomorrow")

## Appendix: Technical implementation notes

This section contains implementation details for the development team. Designers can skip this section.

### Integration points

| System               | Purpose                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| AsyncStorage         | Store the date when user was last prompted (key: `rollover_prompted_date`) |
| Supabase             | Query tasks and create new tasks                                           |
| React Query          | Cache invalidation after rollover (invalidate today's task list)           |
| PostHog              | Analytics event tracking                                                   |
| Tutorial store       | Check if tutorial is complete before showing rollover                      |
| Notification service | Reschedule reminders when carrying forward                                 |

### Data storage and privacy

- No new database tables required; feature uses existing `tasks` and `plans` tables
- Prompt state stored locally only (not synced to server)
- Analytics events contain counts and booleans only—no task titles or personal data

### Performance considerations

- Yesterday's tasks query is bounded (single day, single user)
- Batch create all selected tasks in a single transaction where possible
- Invalidate only today's task cache, not the entire task cache

### Technical edge cases

| Case                                | Handling                                                |
| ----------------------------------- | ------------------------------------------------------- |
| Race condition from rapid app opens | Check prompted state immediately before showing modal   |
| Offline detection timing            | Use React Query's online manager for accurate state     |
| Tutorial conflict                   | Check tutorial completion state before showing rollover |
| Timezone edge cases                 | Use consistent date formatting (yyyy-MM-dd)             |

### Dependency cleanup (technical debt)

As part of this feature, remove the unused plan locking system:

- Remove lock-related functions from notifications utility
- Remove lock mutation from plans hook
- Remove lock-related analytics events
- Database migration to remove the lock column from plans table
- Regenerate database types after migration

## Narratives

### Morning rollover

Sarah opens Domani on Tuesday morning while drinking her coffee. Yesterday was hectic, and she did not finish writing the quarterly report or calling her dentist. A gentle modal slides up: "Pick up where you left off." She sees the quarterly report highlighted as yesterday's MIT with a star icon. Below it, the dentist call and two other tasks she had planned. Sarah checks the quarterly report and the dentist call, leaves "Make this today's MIT" toggled on for the report, and taps "Carry Forward (2)." The tasks appear on her Today screen, the report already marked as her MIT. She is ready to tackle the day with intention, not drowning in yesterday's leftovers.

### Evening planning rollover

It's 6pm on Tuesday and Sarah's planning reminder goes off. She opens Domani to plan Wednesday's tasks. Before she starts planning, a modal appears: "Clean up today before planning tomorrow." She sees the dentist call she scheduled for 4pm—clearly she didn't get to it. Her 7pm meditation reminder isn't shown because that's still scheduled for later tonight. She also sees "organize desk drawer" with no reminder, something she added this morning but never got around to. Sarah checks the dentist call (she'll handle it tomorrow) and leaves the desk drawer task unchecked (it wasn't that important anyway). She taps "Carry Forward (1)" and the dentist call appears in tomorrow's plan. Now she can focus on planning the rest of Wednesday with a clear head.
