# Interactive Tutorial - Design Proposal

## Why We Need This

During our private beta, **8 out of 15 users didn't know they could create custom categories**. Our current onboarding only covers notification setup, leaving users without guidance on Domani's core features.

---

## Design Approach

**Spotlight overlays** that highlight real UI elements with brief tooltips. Users complete actual actions (creating a real task) rather than watching a simulation.

### Principles
- **Short** - Avoid tutorial fatigue
- **Real** - Users create an actual task, not fake data
- **Skippable** - Exit anytime
- **Replayable** - Available in Settings later

---

## Step-by-Step Flow

### Welcome
**Step 1** - Welcome overlay appears on Planning screen
- Brief intro: "Let's create your first task together"
- Shows what we'll cover
- Skip button visible

### Task Creation

**Step 2** - Spotlight on "Add Task" button
- Tooltip: "Tap here to create a task"
- User taps to open the form

**Step 3** - Spotlight on title input
- Tooltip: "Give your task a name"
- Suggested placeholder: "My first Domani task"
- User types and continues

**Step 4** - Spotlight on category selector
- Tooltip: "Categories help organize your tasks"
- Shows existing categories

**Step 5** - Spotlight on "Create Category" option
- Tooltip: "Create your own categories for anything"
- User creates a custom category (this is the feature they're missing!)

**Step 6** - Spotlight on priority selector
- Tooltip: "Set how important this task is"

**Step 7** - Spotlight on "Top" priority with MIT explanation
- Tooltip: "Top priority = your Most Important Task for the day. You can only have one."
- User selects any priority

**Step 8** - Spotlight on Today/Tomorrow toggle
- Tooltip: "Plan for today or tomorrow"
- Guide to select Today (so they see immediate result)

**Step 9** - Task appears in Planning list
- Tooltip: "Your task is ready! It will appear on your Today screen."

### Today Screen

**Step 10** - Navigate to Today, spotlight on the task
- Tooltip: "Here's your task, ready to complete"
- Shows how Planning → Today works

### Cleanup

**Step 11** - Back to Planning, delete the tutorial task
- Tooltip: "Swipe or tap to delete tasks you don't need"
- Also delete the custom category they created
- Leaves app clean for real use

### Completion

**Step 12** - Completion overlay
- Celebration message
- "You can replay this tutorial anytime in Settings"
- Dismiss to start using the app

---

## Visual Treatment

### Spotlight Style
- Screen dims except for highlighted element
- Highlighted element has subtle glow/border
- Tooltip appears near the element (above/below as space allows)

### Tooltip Design
- Matches our existing card style (rounded corners, subtle shadow)
- Brief text (1-2 sentences max)
- "Next" button to advance
- "Skip Tutorial" link always visible (muted style)

### Transitions
- Smooth fade between steps
- Element highlights animate in
- Natural feel, not jarring

---

## When It Triggers

Tutorial starts **automatically after notification setup completes** for new users.

For existing users or those who skipped: "Replay Tutorial" button in Settings.

---

## Open Questions

1. **Length** - Is 12 steps right, or should we trim further?

2. **Cleanup** - Should deleting the tutorial task/category be required or optional?

3. **Category creation** - Force it during tutorial, or just highlight the option?

4. **Immediate vs. choice** - Start tutorial automatically, or show "Start Tutorial" / "Explore on my own" buttons?

5. **Skip behavior** - Confirm before skipping, or just exit immediately?

---

*Ready for feedback*
