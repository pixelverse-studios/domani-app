# PRD: Evening Planning Flow Simplification

**Document version:** 1.0
**Date:** February 24, 2026
**Status:** Draft — pending co-founder review
**Product:** Domani (iOS/Android)

---

## Executive summary

Domani is built on a single core behaviour: plan tomorrow's tasks the night before. Today, the app has two separate rollover prompts — one that fires in the evening (when users tap the planning reminder notification) and one that fires the next morning (on first app open). These two moments feel disconnected, serve overlapping purposes, and leave a significant number of users falling through the cracks entirely if they choose not to tap the notification.

This document defines the requirements for consolidating those two moments into one unified evening planning flow. The new experience triggers consistently — whether the user taps their planning notification or simply opens the app after their reminder time — and guides them through a single, coherent sequence: review unfinished tasks, decide what carries to tomorrow, then plan new tasks for tomorrow. The morning rollover is eliminated entirely.

A related improvement is also included in scope: the completion celebration, which currently fires the next morning on app open, will instead fire in real time the moment a user marks their last task complete.

Together, these changes make Domani's core planning loop tighter, more reliable, and more rewarding.

---

## Product overview

### Document information

| Field            | Value                                |
| ---------------- | ------------------------------------ |
| Product name     | Domani                               |
| Feature name     | Evening Planning Flow Simplification |
| Document version | 1.0                                  |
| Author           | Product                              |
| Reviewers        | Co-founder                           |
| Target release   | TBD                                  |

### Product summary

Domani is a daily task planning app grounded in the psychology of intentional planning. Its central premise is that users plan tomorrow's tasks the night before, giving them clarity before the day begins rather than scrambling in the morning. Each day's plan supports up to three tasks (on the free tier), one of which is designated as the Most Important Task (MIT). Users receive a planning reminder notification at a time they set themselves, prompting them to plan for the following day.

The feature described in this document refactors the rollover and planning trigger mechanics to align with that core premise — one planning moment, in the evening, every time.

---

## Goals

### Business goals

- Increase the percentage of users who complete a planning session each day, particularly among those who do not tap the planning reminder notification.
- Reduce friction in the core planning loop so that the experience feels cohesive and intentional, not patched together.
- Strengthen the habit-forming quality of the product by making the planning prompt reliable and consistent regardless of how the user re-enters the app.

### User goals

- Experience a single, unambiguous planning moment each evening that feels like a natural routine.
- See all relevant unfinished tasks from the current day when deciding what to carry forward, without having to hunt for them.
- Receive immediate recognition when all tasks for the day are completed, rather than a delayed acknowledgement the next morning.

### Non-goals

The following items are explicitly out of scope for this release.

- Changes to how planning reminder notifications are scheduled or delivered.
- Per-task reminder behaviour or task-level notification settings.
- Support for multiple planning reminder times within a single account.
- Changes to the experience for users who have set a morning planning reminder time. This use case is noted as a future consideration as the user base grows and usage patterns are better understood.

---

## User personas

### Key user types

**The consistent planner.** Opens Domani most evenings near their reminder time and taps the notification to begin planning. Currently benefits from the evening rollover flow, but is occasionally confused by the separate morning prompt that appears the next day.

**The independent opener.** Has notifications enabled and a reminder time set, but typically opens the app directly rather than tapping the notification. Today, this user never sees the evening rollover and instead encounters an orphaned morning rollover the next day — meaning they are planning tasks for a day that has already started rather than one that hasn't begun yet.

**The task completer.** A user motivated by visible progress who completes tasks throughout the day and expects acknowledgement when they finish their last one. Currently, this user has to wait until the following morning to see the celebration screen, which diminishes the emotional impact of the accomplishment.

### Role-based access

There are no role-based access changes associated with this feature. All behaviour described in this document applies to all authenticated users across both the free and paid tiers.

---

## Functional requirements

The table below lists the functional requirements for this feature, each assigned a priority level.

| ID    | Requirement                                                                                                                                                                                                         | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-01 | When a user opens the app for the first time at or after their planning reminder time, the evening planning flow triggers automatically, regardless of whether they tapped the notification.                        | Critical |
| FR-02 | When a user taps their planning reminder notification, the evening planning flow triggers, consistent with the existing behaviour.                                                                                  | Critical |
| FR-03 | The evening planning flow begins with a rollover prompt if the user has incomplete tasks from the current day. If there are no incomplete tasks, the rollover step is skipped and the planning form opens directly. | Critical |
| FR-04 | The rollover prompt displays all incomplete tasks from the current day. The user selects which tasks (if any) to carry forward.                                                                                     | Critical |
| FR-05 | Tasks carried forward from the rollover prompt are always added to tomorrow's plan — never to today's.                                                                                                              | Critical |
| FR-06 | After completing the rollover step (or skipping it), the planning form opens so the user can add new tasks for tomorrow.                                                                                            | Critical |
| FR-07 | The morning rollover prompt is removed entirely. There is no longer a rollover experience triggered on first app open the following morning.                                                                        | Critical |
| FR-08 | When a user marks their last incomplete task as complete, a celebration screen or animation fires immediately in the app, regardless of which screen they are on.                                                   | High     |
| FR-09 | The evening planning flow does not trigger more than once per planning cycle. If a user has already completed a planning session for tomorrow in the current evening window, they are not prompted again.           | Critical |
| FR-10 | The planning flow trigger window is defined as: at or after the user's planning reminder time on a given day, until the end of that same calendar day.                                                              | High     |

---

## User experience

### Entry points

Users enter the evening planning flow through two paths, both of which produce an identical experience.

The first path is the planning reminder notification. When the notification fires at the user's chosen time and the user taps it, they are taken directly to the Planning tab and the flow begins.

The second path is direct app open. If the user opens Domani for the first time on a given day at or after their planning reminder time — regardless of whether they tapped the notification — the app detects this condition and automatically navigates to the Planning tab to begin the flow.

Both paths are treated as equivalent entry points. There is no difference in what the user sees or does once the flow begins.

### Core experience

The flow proceeds in a consistent sequence.

If the user has incomplete tasks from the current day, they are presented with a rollover prompt. This screen shows the list of those tasks and asks the user to decide which ones, if any, they want to carry into tomorrow's plan. They can select all, some, or none. The framing is forward-looking: the user is not being asked to review failures, but to make an intentional choice about tomorrow. Once they confirm their selection, the rollover step is complete.

If the user has no incomplete tasks, the rollover step is skipped entirely and they move straight to planning.

Following the rollover step (or in its absence), the planning form opens. This is the existing interface for adding tasks to tomorrow's plan, including setting the MIT. No changes are proposed to the planning form itself in this release.

Once planning is complete, the flow ends and the user returns to the normal app experience.

### Real-time task completion celebration

When a user marks their final incomplete task as done, a celebration experience fires immediately within the app. This replaces the current behaviour where the celebration is deferred to the following morning. The celebration should feel earned and in-the-moment — a direct acknowledgement of the user's accomplishment as it happens, not as a historical footnote the next day.

The specific design of the celebration animation or screen is not changed in this release; only its trigger timing is updated.

### UI/UX highlights

The most important design principle for this feature is that the user should experience planning as a single, unified moment — not a series of loosely connected prompts spread across two days. The rollover and planning steps should feel like part of one flow, not two separate interruptions.

The rollover prompt, where it appears, should be presented in a way that feels empowering rather than guilt-inducing. The user is making a choice about tomorrow, not being confronted with yesterday's shortcomings.

---

## Narrative

It is 9:30 in the evening and Maya's planning reminder fires on her phone. She doesn't tap the notification right away — she finishes the chapter she's reading and then opens Domani a few minutes later on her own. Because it's past her reminder time, the app recognises this as her planning moment and takes her directly to the Planning tab. She sees that two of her tasks from today are still marked incomplete. The app asks her which ones she wants to carry into tomorrow, and she selects one of them — the other wasn't important after all. She then plans two new tasks for the next day and sets her MIT. By the time she puts her phone down, tomorrow already has shape and direction. In the morning, she opens the app and her plan is waiting for her, exactly as she left it — no surprise prompt, no decisions to make before her first coffee.

---

## Success metrics

### User-centric metrics

- The percentage of users who complete a planning session on days when they open the app after their reminder time (without tapping the notification) should approach parity with the rate for users who tap the notification.
- Zero users should encounter two separate rollover prompts within a single 24-hour period after the release.
- Completion celebration engagement (taps, shares, or other tracked interactions) should increase as a result of real-time triggering versus deferred triggering.

### Business metrics

- An increase in the daily planning completion rate across all active users, measured as the proportion of users with a reminder set who complete a planning session on any given day.
- A reduction in support queries or negative feedback related to confusing rollover prompts or missed planning moments.

### Technical metrics

- The planning flow trigger fires correctly (and only once) for users who open the app after their reminder time in 100% of qualifying sessions.
- No instances of tasks being incorrectly carried forward to the current day rather than the following day.
- The evening flow trigger does not fire for users whose reminder time has not yet passed on the current day.

---

## Technical considerations

### Integration points

The primary integration points for this feature are the planning reminder system (which determines the trigger time for the evening flow), the task data layer (which provides the list of incomplete tasks for rollover), and the navigation system (which handles routing the user to the Planning tab when the flow triggers). The notification delivery mechanism itself is not being modified.

### Data storage and privacy

No new data types are introduced by this feature. The existing task and plan data structures are sufficient to support the rollover and planning steps. A lightweight record of whether the user has completed a planning session in the current evening window is needed to prevent the flow from triggering more than once; this can be stored locally or in the existing user session data without any new personally identifiable information being collected.

### Scalability and performance

This feature does not introduce meaningful scalability concerns. The trigger logic runs on the client side at app open and does not require new server-side infrastructure.

### Potential challenges

The most nuanced aspect of this feature is defining the trigger window precisely. The system must distinguish between a user who opens the app before their reminder time (no flow should trigger), a user who opens it after their reminder time for the first time that day (flow should trigger), and a user who opens it after already having completed a planning session that evening (flow should not trigger again). Getting these conditions right is essential to the feature feeling reliable rather than erratic.

Care should also be taken to ensure the flow does not trigger in edge cases such as when a user changes their reminder time mid-day, reinstalls the app, or has no reminder time set at all.

---

## Milestones and sequencing

### Project estimate

This is a medium-scoped refactor. The core logic changes are contained, but they touch several parts of the app — the rollover prompt, the planning trigger, the navigation layer, and the completion celebration — each of which requires its own testing.

### Team size

One to two engineers, with product and design review at the rollover prompt step.

### Suggested phases

**Phase 1 — Unified trigger logic.** Implement the condition that fires the evening planning flow when the user opens the app at or after their reminder time, in addition to the existing notification tap path. Ensure the flow does not fire more than once per planning window.

**Phase 2 — Rollover consolidation.** Update the rollover prompt to show all incomplete tasks from the current day (not a filtered subset), carry selected tasks to tomorrow, and skip the step entirely when there are no incomplete tasks. Remove the morning rollover prompt.

**Phase 3 — Real-time celebration.** Update the task completion logic so that the celebration fires immediately when the last task is marked complete, rather than being deferred to the following morning.

**Phase 4 — QA and edge case validation.** Test all entry points, trigger conditions, and edge cases (no reminder set, reminder time changed same day, reinstall, no incomplete tasks, planning already completed). Verify zero instances of duplicate rollover prompts.

---

## User stories

### US-001 — Evening flow triggers on notification tap

**Title:** Evening planning flow launches when user taps the planning reminder notification.

**Description:** As a user who taps my planning reminder notification, I want to be taken directly into the evening planning flow so that I can review unfinished tasks and plan for tomorrow.

**Acceptance criteria:**

- Tapping the planning reminder notification navigates the user to the Planning tab.
- If the user has incomplete tasks from the current day, the rollover prompt is displayed.
- If the user has no incomplete tasks from the current day, the planning form opens directly.
- The flow does not trigger again that evening if the user has already completed a planning session.

### US-002 — Evening flow triggers on direct app open after reminder time

**Title:** Evening planning flow launches when user opens the app after their reminder time without tapping the notification.

**Description:** As a user who opens Domani after my planning reminder time without tapping the notification, I want the same planning flow to start automatically so that I don't miss the opportunity to plan tomorrow.

**Acceptance criteria:**

- If the user opens the app for the first time on a given day at or after their planning reminder time, the app navigates to the Planning tab and begins the evening planning flow.
- The flow follows the same sequence as when triggered by a notification tap: rollover prompt (if applicable), then planning form.
- The flow does not trigger if the user opens the app before their reminder time.
- The flow does not trigger if the user has already completed a planning session that evening.

### US-003 — Rollover prompt displays all incomplete tasks

**Title:** Rollover prompt shows all of the current day's incomplete tasks.

**Description:** As a user entering the evening planning flow with incomplete tasks, I want to see all of my unfinished tasks from today so that I can make a deliberate choice about what to carry into tomorrow.

**Acceptance criteria:**

- The rollover prompt displays every task from the current day's plan that has not been marked complete.
- No tasks are filtered out or hidden based on time of day or reminder time.
- Each task is shown with enough detail for the user to identify and evaluate it.
- The user can select any combination of tasks to carry forward, including all or none.

### US-004 — Selected tasks carry forward to tomorrow

**Title:** Rollover tasks are added to tomorrow's plan, not today's.

**Description:** As a user completing the rollover step, I want the tasks I select to be scheduled for tomorrow so that I am planning ahead rather than catching up.

**Acceptance criteria:**

- Tasks selected in the rollover prompt are added to tomorrow's plan (the next calendar day).
- No tasks are ever added to the current day's plan as a result of the rollover step.
- If tomorrow's plan already has tasks, the carried-forward tasks are added alongside them, subject to the plan's task limit.
- The user receives feedback confirming which tasks have been carried forward.

### US-005 — Rollover step skipped when no incomplete tasks exist

**Title:** Planning form opens directly when there are no incomplete tasks to roll over.

**Description:** As a user with no unfinished tasks from today, I want to go straight to the planning form without an extra step so that my experience is efficient and uncluttered.

**Acceptance criteria:**

- If the user has no incomplete tasks on the current day's plan when the evening flow triggers, the rollover prompt is not shown.
- The planning form opens immediately as the first step of the flow.
- The user is not shown an empty rollover screen or any intermediate message indicating there is nothing to roll over.

### US-006 — Planning form opens after rollover step

**Title:** Planning form opens immediately after the rollover step is completed.

**Description:** As a user who has just finished the rollover step, I want the planning form for tomorrow to open next so that I can add new tasks without any extra navigation.

**Acceptance criteria:**

- After the user confirms their rollover selection (or skips rollover), the planning form for tomorrow's plan opens automatically.
- The planning form is pre-populated with any tasks carried forward from the rollover step.
- The user can add new tasks, set the MIT, and complete their plan from this screen.
- Completing the planning form ends the evening planning flow and returns the user to the normal app experience.

### US-007 — Morning rollover is removed

**Title:** No rollover prompt appears on first app open the following morning.

**Description:** As a user opening Domani the morning after an evening planning session, I want to go directly to my plan for today without being shown a rollover prompt.

**Acceptance criteria:**

- The morning rollover prompt no longer appears under any circumstances.
- Opening the app the morning after an evening planning session takes the user directly to their plan for today.
- No tasks are silently or automatically carried forward at the time of morning app open.
- Users who did not complete an evening planning session the prior evening also do not see a morning rollover prompt.

### US-008 — Flow does not trigger more than once per evening

**Title:** Evening planning flow triggers only once per planning window.

**Description:** As a user who has already completed my planning session this evening, I want the planning flow not to interrupt me again if I re-open the app.

**Acceptance criteria:**

- Once a user has completed a planning session in the current evening window, the flow does not trigger again on subsequent app opens within the same day.
- The planning window is defined as the period from the user's reminder time until the end of the current calendar day.
- If a user dismisses the flow without completing it, the system behaves consistently — either re-triggering or not — based on a clearly defined rule. (Recommend: not re-triggering, to avoid perceived pestering.)

### US-009 — Flow does not trigger if no reminder time is set

**Title:** Evening planning flow does not trigger for users with no reminder time configured.

**Description:** As a user who has not set a planning reminder time, I want to use the app normally without an unexpected planning flow appearing.

**Acceptance criteria:**

- If the user has not configured a planning reminder time, the automatic trigger (US-002) does not fire on app open.
- Users without a reminder time can still access the planning flow manually by navigating to the Planning tab.
- No errors or unexpected states occur for users with no reminder time set.

### US-010 — Real-time task completion celebration

**Title:** Celebration fires immediately when the user completes their last task.

**Description:** As a user who just marked my last task for the day as complete, I want to see a celebration in the moment so that my accomplishment feels recognised right away.

**Acceptance criteria:**

- When the user marks the final incomplete task on their current day's plan as complete, a celebration experience (animation or screen) fires immediately.
- The celebration fires regardless of which screen or tab the user is currently on within the app.
- The celebration does not fire when tasks are completed with others still remaining on the plan.
- The deferred morning celebration that previously appeared on next-day app open no longer fires.

### US-011 — Flow handles reminder time change gracefully

**Title:** Evening planning flow responds correctly when the user has changed their reminder time on the same day.

**Description:** As a user who changed my planning reminder time today, I want the trigger logic to use my updated time so that the flow fires at the right moment.

**Acceptance criteria:**

- If the user changes their reminder time to an earlier time that has already passed, the system applies a clearly defined rule (recommend: treat as if the window has opened, trigger on next app open if a session has not already been completed).
- If the user changes their reminder time to a later time that has not yet passed, the flow does not trigger until that time is reached.
- No unexpected errors or duplicate flow triggers occur as a result of a same-day reminder time change.

### US-012 — Flow handles reinstall or first-launch edge case

**Title:** Evening planning flow does not fire unexpectedly after a fresh install or reinstall.

**Description:** As a user who has just installed or reinstalled Domani, I want the app to onboard me normally without jumping into a planning flow before I have set up my account and reminder.

**Acceptance criteria:**

- The evening planning flow does not trigger during the onboarding sequence.
- The flow does not trigger on first app open after a reinstall until the user has set a planning reminder time and completed initial setup.
- Any local state used to track whether a planning session has been completed resets cleanly on reinstall without causing unexpected trigger conditions.
