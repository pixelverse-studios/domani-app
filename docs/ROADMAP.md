# Domani Post-Launch Roadmap

**Last Updated:** March 31, 2026
**Scope:** 12 months post-launch
**Current Version:** 1.0.31

---

## Vision

Domani's core identity is **"Plan Tomorrow, Tonight"** — calm, reflective evening planning. Every roadmap feature should strengthen that daily ritual, not dilute it into a generic productivity tool.

The strategic goal: evolve Domani from a task planner into a **complete daily ritual system** — evening reflection, tonight's planning, morning intention, daytime execution.

---

## Already Planned

### Nested Checklists / Shopping Lists

**Status:** Planned
**Scope:** 2-3 weeks

Add sub-tasks or checklist items within a task. Covers use cases like grocery lists, multi-step errands, or breaking down a larger task into smaller actions.

- Expandable checklist UI within task cards
- Progress indicator (3/5 items done)
- Completing all sub-items optionally marks parent task complete

### Home Screen Widgets

**Status:** Planned
**Scope:** 2-3 weeks

Native iOS and Android widgets for at-a-glance planning.

Widget ideas:

- **Today's MIT** — single task with completion toggle
- **Today's Plan** — task list with progress ring
- **Streak Counter** — planning + execution streaks
- **Tomorrow Preview** — evening widget showing tomorrow's plan count

---

## Recommended Features (Prioritized)

### 1. Recurring Tasks / Routines

**Priority:** P0 — Build First
**Scope:** 3-4 weeks
**Quarter:** Q2 post-launch

#### What

Tasks that auto-regenerate on a schedule — daily, weekdays, specific days, or weekly. Morning routines, weekly reviews, daily habits.

#### Why It Fits Domani

- Reduces friction in the evening planning flow. Instead of recreating "Take vitamins" every night, routines are pre-populated and the user focuses on what's actually new tomorrow.
- The evening ritual becomes faster and more satisfying.
- Without this, power users churn — it's the #1 requested feature in planning app reviews.
- Routines create daily touchpoints by definition, driving retention.

#### Implementation Notes

- Recurrence rule model: daily / weekdays / weekly / custom
- Generation mechanism during evening rollover or plan creation
- **Key edge case:** What happens when a recurring task isn't completed? Does it roll over AND a new instance generate? Need careful interaction with existing rollover logic.
- UI for setting recurrence when creating/editing a task

#### Monetization Angle

- Gate custom recurrence patterns (e.g., "every 3rd day") behind paid tier
- Or: unlimited routines for paid, capped at 3 for free

---

### 2. Evening Reflection + Morning Intention (The Ritual System)

**Priority:** P0 — Build Together
**Scope:** 3-4 weeks (both combined)
**Quarter:** Q3 post-launch

This is two features that form one coherent product story. They bookend the day and are Domani's biggest differentiator.

#### Evening Reflection

**What:** During the evening planning flow, after rollover and before planning tomorrow, the user spends 60 seconds reflecting.

- 1-2 short prompts: "What went well today?" / "What would you do differently?"
- Quick tap or short text input
- Optional — users can skip
- Reflection history stored and viewable
- Patterns-over-time analysis (later enhancement): word clouds, sentiment trends

**Why It Fits:**

- The app already owns the evening moment. This deepens that ritual without adding friction (15-30 seconds max).
- Creates personal history users become attached to. After 30 days of reflections, the app contains something valuable that increases switching costs.
- Todoist will never do this. Things will never do this. This is opinionated product design that filters for the target user.

**Placement in flow:**

```
Evening notification fires
  -> Open app
  -> Rollover modal (existing)
  -> Evening reflection (NEW - 1-2 prompts)
  -> Planning tomorrow (existing)
```

#### Morning Intention

**What:** A brief morning screen when opening the Today tab:

- Review your MIT and today's plan
- Set a one-line intention ("Today I will stay focused")
- Rate your energy level (1-5)
- 30 seconds max, skippable

**Why It Fits:**

- Completes the loop: "Plan Tomorrow, Tonight" implies "Execute Today, With Intention"
- Creates a **second daily touchpoint** — the app goes from once-daily to twice-daily engagement
- Energy rating creates a data feedback loop: "You complete 40% more tasks on days you rate your energy 4+"
- Transforms the morning experience from passive (looking at a list) to active

**Combined Impact:**

- Morning intention + evening reflection = complete daily ritual system
- No mainstream task app offers this combination
- Positions Domani as a **daily mindset tool**, not just a todo list
- Marketing narrative: "Domani 2.0 — Your Complete Daily Ritual"

#### Monetization Angle

- Reflection/intention history beyond 7 days behind paywall
- Energy-vs-productivity insights as advanced analytics
- "See your last 7 reflections free, unlock full journal with lifetime purchase"

#### Technical Scope

- `reflections` table: user_id, date, prompt, response, energy_level, intention_text
- Evening flow: insert reflection step between rollover and planning
- Morning flow: intention screen on Today tab (show once per day)
- Progress tab: add reflection/energy correlation charts (later phase)

---

### 3. Weekly Planning View

**Priority:** P1 — Build Next
**Scope:** 3-4 weeks
**Quarter:** Q3-Q4 post-launch

#### What

A horizontal week view showing all 7 days at a glance. Move tasks between days. Plan further ahead than just today/tomorrow.

#### Why It Fits Domani

- The current today/tomorrow toggle is great for the core loop, but users naturally need to plan ahead: "Call the dentist Thursday" or "Grocery shopping is a Saturday thing."
- The evening ritual becomes richer: glance at the week, redistribute load. "Wednesday looks heavy, let me move something to Thursday."
- Enables a **Sunday Evening Weekly Review** — a natural weekly ritual on top of the daily one.
- Still daily tasks, not project management. Keeps Domani simple.
- The `scheduled_date` column already exists from DEV-581, so this is primarily a UI feature.

#### Implementation Notes

- New view accessible from Planning tab (swipe up, or tab within tab)
- Day columns showing task count + MIT indicator
- Tap a day to see/edit tasks
- Move tasks between days (drag-and-drop or "move to" action menu)
- Drag-and-drop on React Native is the main technical risk

#### Monetization Angle

- Weekly view can support the paid lifetime product without introducing a separate tier

---

### 4. Focus Timer (Paired with MIT)

**Priority:** P2 — Build Later
**Scope:** 2-3 weeks
**Quarter:** Q4 post-launch

#### What

A simple focus/pomodoro timer that launches from any task, with special emphasis on the MIT. Track total focus time per task and per day.

#### Why It Fits

- The MIT concept is Domani's signature. A focus timer makes it _actionable_: "This is your most important task. Let's focus on it now."
- Focus time data enriches the Progress tab: "You focused 2.5 hours today"
- Trending in social media productivity culture — "study with me," deep work, etc.
- Pairs naturally with Wellness category (meditation timer, workout timer)

#### Counterargument (Worth Considering)

This is a **daytime execution** feature, not a planning feature. It pulls the app slightly away from its evening planning identity. Dozens of excellent Pomodoro apps already exist. If Domani's identity is the ritual (plan, reflect, intend), a timer might dilute the brand. Consider whether this strengthens the product story or adds feature bloat.

#### Implementation Notes

- Start simple: countdown timer on task detail screen
- Track focus sessions: task_id, duration, completed_at
- Progress tab integration: daily focus time chart
- Later: Pomodoro intervals (25/5 pattern), break reminders

---

## Deprioritized (Not Recommended for Year 1)

### Calendar Integration

**Verdict:** Defer to Year 2
**Reason:** High technical effort (OAuth for Google Calendar, EventKit for Apple, ongoing sync, timezone handling) for a commodity feature that doesn't strengthen the evening ritual. Every productivity app does this. Build it when users explicitly demand it.

### Collaborative Planning

**Verdict:** Cut
**Reason:** Changes the product identity from solo reflection to shared planning. Enormous scope (real-time sync, sharing permissions, conflict resolution). This is a different product.

### Habit Tracking

**Verdict:** Defer — Evaluate After Recurring Tasks
**Reason:** Wait to see if users treat recurring tasks as habits naturally. If they do, a dedicated habit tracker would be redundant. If they don't, revisit. Risk of scope creep into a different app category (Streaks, Habitica).

### AI Daily Summary / Insights

**Verdict:** Defer to Year 2
**Reason:** Needs sufficient user data to be meaningful. Nice-to-have enhancement to the Progress tab, but not retention-driving on its own. Add after the ritual system is established and there's enough reflection/intention data to generate interesting insights.

### Time Blocking / Schedule View

**Verdict:** Defer
**Reason:** Pushes toward "schedule manager" territory and away from Domani's simplicity. Only revisit if calendar integration ships and users request it.

---

## Suggested Build Sequence

| Phase       | Timeline           | Features                                      | Theme             |
| ----------- | ------------------ | --------------------------------------------- | ----------------- |
| **Phase 1** | Q2 (Months 1-3)    | Nested Checklists + Widgets + Recurring Tasks | Core Utility      |
| **Phase 2** | Q3 (Months 4-6)    | Evening Reflection + Morning Intention        | The Ritual System |
| **Phase 3** | Q3-Q4 (Months 6-9) | Weekly Planning View                          | Planning Horizon  |
| **Phase 4** | Q4 (Months 9-12)   | Focus Timer                                   | Execution Tools   |

### Phase 1: Core Utility

Ship the most-requested practical features. Reduce churn from missing basics. Recurring tasks alone could significantly improve retention.

### Phase 2: The Ritual System

The biggest product differentiation moment. This is the update that makes Domani different from every other task app. Launch as a cohesive "Domani 2.0" update with a clear narrative.

### Phase 3: Planning Horizon

Natural evolution from daily to weekly planning. Low-risk, builds on existing infrastructure (`scheduled_date` column).

### Phase 4: Execution Tools

Enhance the daytime experience. Only build if the ritual system is working and users want more from the "execute" phase of their day.

---

## Strategic Notes

### The Moat

The top features (recurring tasks, reflection, morning intention) together create a moat that isn't technical but **psychological**. Any app can copy a feature list. What's hard to copy is a coherent daily ritual that users build their identity around.

**"I'm a Domani user" should mean: "I'm someone who plans intentionally, reflects daily, and starts each morning with purpose."**

### Feature Filter

Before adding any feature, ask:

1. Does it strengthen the evening planning ritual?
2. Does it bring users back daily?
3. Does it set Domani apart from Todoist/Things/etc?
4. Can it be built in 2-4 weeks?
5. Could it justify the lifetime purchase?

If it doesn't pass at least 3 of these, it probably doesn't belong in Domani.

### Avoiding Scope Creep

Domani is NOT trying to be:

- A project management tool (use Linear, Asana)
- A calendar app (use Google Calendar, Fantastical)
- A note-taking app (use Notion, Bear)
- A habit tracker (use Streaks, Habitica)

Domani IS:

- A daily ritual system for intentional living
- Evening reflection + planning + morning intention + focused execution
- Simple, calm, opinionated
