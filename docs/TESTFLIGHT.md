# TestFlight Beta Test Documentation

> **For:** Domani - Evening Planning Productivity App
> **Version:** 1.0.0 Beta
> **Last Updated:** December 2025

---

## Table of Contents

1. [What to Test (TestFlight Notes)](#what-to-test-testflight-notes)
2. [Beta App Description](#beta-app-description)
3. [Feedback Configuration](#feedback-configuration)
4. [Test Account Credentials](#test-account-credentials)
5. [App Store Connect Setup Checklist](#app-store-connect-setup-checklist)

---

## What to Test (TestFlight Notes)

**Copy this section directly into the "What to Test" field in App Store Connect.**

```
Welcome to the Domani beta! We appreciate your help testing our evening planning productivity app.

Domani is built on the principle of "Plan Tomorrow Tonight" - helping you make better decisions about your day when you're calm in the evening, not rushed in the morning.

===================
KEY FEATURES TO TEST
===================

1. ONBOARDING & SIGN IN
   - Launch the app and complete the welcome screen
   - Sign in with Apple (recommended) or Google
   - Verify your account is created successfully
   - Check that you're taken to the main app after sign-in

2. EVENING PLANNING (Primary Feature)
   - Tap the "Planning" tab to create tomorrow's tasks
   - Add up to 3 tasks (free tier limit)
   - Mark ONE task as your Most Important Task (MIT) by setting it to HIGH priority
   - Note: Only one HIGH priority task is allowed - this is your MIT
   - Try assigning different categories to each task
   - Test creating tasks with just titles, and with descriptions
   - Lock your plan when you're satisfied with it

3. TODAY'S FOCUS (Execution)
   - Check the "Today" tab to view your planned tasks
   - Your MIT should be displayed prominently at the top with category theming
   - Complete tasks by tapping the checkbox
   - Watch the progress update as you complete tasks
   - Check the "Completed" section for finished tasks

4. CATEGORIES
   - When adding tasks, explore the category selector
   - View the available system categories (Work, Personal, Health, etc.)
   - Try creating a custom category with your own icon and color
   - Mark categories as favorites for quick access
   - Notice how category colors theme your MIT on the Today screen

5. SETTINGS
   - Navigate to the Settings tab
   - Review your profile information
   - Test notification preferences:
     * Planning reminder (evening notification)
     * Execution reminder (morning notification)
   - Toggle theme settings (light/dark mode)
   - Test "Sign Out" and sign back in

6. FEEDBACK & SUPPORT
   - Test the Feedback tab with different feedback types:
     * Bug report
     * Feature request
     * Love note
     * General feedback
   - Note: Device info is automatically included with submissions
   - Try the "Contact Support" option

===================
EDGE CASES TO TRY
===================

- Create a task, then immediately delete it
- Try to add a 4th task (should see free tier limit message)
- Lock a plan, then try to edit it (should be prevented)
- Set a HIGH priority task, then try to set another as HIGH
- Use the app at midnight to test timezone handling
- Background the app during task creation, then return
- Deny notification permissions when prompted, then enable later in Settings

===================
FEEDBACK WE NEED
===================

We're especially interested in your thoughts on:

- Is the evening planning flow intuitive?
- Does the MIT (Most Important Task) concept make sense?
- Are the animations smooth and satisfying?
- Is the category system useful?
- Any crashes, bugs, or unexpected behavior?
- What features would make Domani more useful for you?

===================
HOW TO SUBMIT FEEDBACK
===================

1. In-App: Use the Feedback tab for structured feedback
2. TestFlight: Shake your device or take a screenshot to submit feedback
3. Email: phil@pixelversestudios.io

Thank you for helping us improve Domani!
```

---

## Beta App Description

**Copy this section into the "Beta App Description" field in App Store Connect (4000 character limit).**

```
Domani helps you plan tomorrow's priorities tonight, when you're calm and reflective - not tomorrow morning when you're rushed and reactive.

THE SCIENCE BEHIND DOMANI
Research shows we make better decisions in the evening when cognitive load is lower and we can think strategically. Domani leverages this by encouraging you to plan tomorrow's tasks at night, then simply execute in the morning without decision fatigue.

HOW IT WORKS
1. Each evening, open Domani and add up to 3 tasks for tomorrow
2. Choose your Most Important Task (MIT) - the one thing that will make tomorrow successful
3. Assign categories to track different areas of your life
4. Lock your plan to prevent midnight anxiety editing
5. In the morning, open Domani and focus on executing your pre-planned tasks
6. Complete tasks and watch your progress throughout the day

KEY FEATURES
- Evening Planning: Add tasks for tomorrow with titles, descriptions, and categories
- MIT Focus: Designate one High-priority task as your Most Important Task
- Category System: Organize tasks with customizable categories, icons, and colors
- Plan Locking: Lock your plan to commit to your decisions
- Today View: Clean execution interface with your MIT prominently displayed
- Progress Tracking: Satisfying completion animations and progress indicators
- Dark Mode: Full dark mode support for evening planning sessions

FREE TIER INCLUDES
- 3 tasks per day (enough for focused productivity)
- System categories (Work, Personal, Health, and more)
- MIT designation
- Plan locking
- Full Today view functionality

WHAT WE'RE TESTING
This beta focuses on the core planning and execution experience. We're gathering feedback on:
- User flow intuitiveness
- Visual design and animations
- Task management features
- Category system usability
- Overall app stability

KNOWN LIMITATIONS
- Subscription features are not yet active
- Some analytics features are coming soon
- Push notifications require iOS permission

FEEDBACK WELCOME
We actively read all feedback! Use the in-app Feedback tab, shake your device in TestFlight, or email us directly at phil@pixelversestudios.io.

Thank you for being part of the Domani beta!
```

**Character count:** ~1,950 characters (well under 4,000 limit)

---

## Feedback Configuration

### TestFlight Feedback Email

**Email:** `phil@pixelversestudios.io`

Configure in App Store Connect:
1. Go to your app in App Store Connect
2. Select "TestFlight" tab
3. Under "Test Information", find "Beta App Review Information"
4. Enter feedback email: `phil@pixelversestudios.io`

### In-App Feedback

The app has a built-in Feedback tab that allows users to submit:
- Bug reports
- Feature requests
- Love notes (positive feedback)
- General feedback

Feedback submissions automatically include:
- Device model
- iOS version
- App version
- User metadata (anonymous)

---

## Test Account Credentials

**For Apple Review and Internal Testing**

### Primary Test Account

Use this account for Apple App Review submission and internal testing:

| Field | Value |
|-------|-------|
| Provider | Apple Sign-In |
| Email | `testuser@domaniapp.com` |
| Password | N/A (Apple Sign-In uses Apple ID) |
| Notes | Standard free tier user |

### Alternative: Google Sign-In Test Account

| Field | Value |
|-------|-------|
| Provider | Google |
| Email | `tester.domani@gmail.com` |
| Password | `DomaniB3ta2025!` |
| Notes | For testing Google OAuth flow |

### Sandbox Testing Notes

For testing in-app purchases (when enabled):
1. Use Apple Sandbox tester accounts created in App Store Connect
2. See `docs/APP_STORE_CONNECT_SETUP.md` for sandbox tester setup
3. Sign out of personal Apple ID before testing purchases

### Demo User State

To set up a test account with pre-populated data:

```sql
-- Run in Supabase SQL Editor to create demo tasks for a test user
-- Replace USER_ID with actual user UUID after sign-in

-- Create a plan for tomorrow
INSERT INTO plans (user_id, planned_for, locked_at)
VALUES ('USER_ID', CURRENT_DATE + 1, NULL);

-- Add sample tasks
INSERT INTO tasks (plan_id, title, description, is_mit, position)
SELECT
  p.id,
  'Review quarterly report',
  'Go through Q4 numbers and prepare summary for team meeting',
  true,
  0
FROM plans p WHERE p.user_id = 'USER_ID' AND p.planned_for = CURRENT_DATE + 1;

INSERT INTO tasks (plan_id, title, description, is_mit, position)
SELECT
  p.id,
  'Call mom',
  'Weekly check-in call',
  false,
  1
FROM plans p WHERE p.user_id = 'USER_ID' AND p.planned_for = CURRENT_DATE + 1;

INSERT INTO tasks (plan_id, title, description, is_mit, position)
SELECT
  p.id,
  '30 minute workout',
  'Morning cardio session',
  false,
  2
FROM plans p WHERE p.user_id = 'USER_ID' AND p.planned_for = CURRENT_DATE + 1;
```

---

## App Store Connect Setup Checklist

Before submitting to TestFlight External Beta:

### Required Information

- [ ] **Beta App Description** - Copy from section above
- [ ] **What to Test** - Copy from section above
- [ ] **Feedback Email** - `phil@pixelversestudios.io`
- [ ] **Marketing URL** - `https://www.domani-app.com`
- [ ] **Privacy Policy URL** - `https://www.domani-app.com/terms`
- [ ] **Beta App Review Contact Info** - Your contact details

### Test Account for Review

- [ ] Demo account credentials provided in App Review Information
- [ ] Account works and provides representative app experience
- [ ] Any special instructions documented

### Build Requirements

- [ ] Build uploaded via EAS or Xcode
- [ ] Build is not expired (90 days from upload)
- [ ] Export compliance information completed
- [ ] Encryption documentation provided (if using custom encryption)

### External Testing Groups

- [ ] External testing group created
- [ ] Testers added to group (up to 10,000 for external beta)
- [ ] Group assigned to build

### Review Submission

- [ ] Submit build for Beta App Review
- [ ] Wait for approval (typically 24-48 hours for first submission)
- [ ] Once approved, enable build for external testers

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | December 2025 | Initial beta release - Core planning & execution features |

---

_This document should be updated with each TestFlight release._
