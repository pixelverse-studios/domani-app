# Domani App

React Native/Expo app with Supabase backend.

## Tech Stack

- Expo SDK 50 with Expo Router
- NativeWind v4 (Tailwind for React Native)
- Supabase (Auth + Database)
- Zustand (State management)

## Supabase Types

TypeScript types are auto-generated from the database schema.

**Regenerate after schema changes:**

```bash
npx supabase gen types typescript --project-id exxnnlhxcjujxnnwwrxv > src/types/supabase.ts
```

Types location: `src/types/supabase.ts`
Convenience aliases: `src/types/index.ts`

## Common Commands

```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run db:types   # Regenerate Supabase types
npm run typecheck  # TypeScript validation
npm run lint       # ESLint
npm run format     # Prettier
```

## Future Work & TODO Tracking

**All future work items go in:** `docs/FUTURE_WORK.md`

When you identify something that should be done later (feature ideas, optimizations, technical debt, nice-to-haves), add it to the appropriate section in that file with:

- Clear title
- **Context**: Why this matters / what problem it solves
- **Scope**: What needs to be built or changed
- **Files**: Which files will be created or modified
- **Dependencies**: Any packages or prerequisites needed

This ensures nothing falls through the cracks between development sessions.

## Pre-Compact Session Recap

**BEFORE any auto-compact or context limit warning occurs**, proactively create/update a session recap file at `.claude/session-recap.md` when you notice the conversation is getting long (roughly 60-70% through available context).

### Recap File Format

```markdown
# Session Recap - [Date/Time]

## Current Objective

[What we're actively working on right now]

## Completed Work (Sequential)

1. [First thing done]
2. [Second thing done]
3. [Continue chronologically...]

## Current State

- **Last file touched:** [path]
- **Last action taken:** [what you just did]
- **Next immediate step:** [what was about to happen]

## Open Issues / Blockers

- [Any problems encountered that aren't resolved]

## Key Decisions Made

- [Important choices that affect future work]

## Files Modified This Session

- [list of files with brief note on what changed]
```

### Instructions

- Update this file incrementally as work progresses, don't wait until the last moment
- After a compact, **immediately read `.claude/session-recap.md`** to restore context
- Keep entries concise but specific enough to resume without confusion
- Delete or archive old recaps when starting genuinely new work

## Project Documentation

- `development-plan.md` - Full project spec, architecture, and business logic
- `docs/FUTURE_WORK.md` - Backlog of planned features and improvements
- `docs/plans/` - Implementation plans for major features
- `docs/audits/mobile/` - Session audit logs (what was built, decisions made)

## Key Architecture Decisions

- **Evening Planning Psychology**: Users plan tomorrow's tasks at night, execute during the day
- **Free Tier**: 3 tasks per day (enforced at database level via RLS)
- **MIT**: Each plan has exactly one Most Important Task
- **Plan Locking**: Locked plans cannot be edited (prevents midnight anxiety)

## Build Preparation

**IMPORTANT:** When the user mentions "preparing for a build", "ready for build", or similar, always:

1. **Increment version numbers** before building:
   - **Android:** Update `versionCode` (integer, must increment) and `versionName` in `android/app/build.gradle`
   - **iOS:** Update via `app.json` or Xcode (EAS handles this automatically with `autoIncrement`)

2. **Version file locations:**
   - `android/app/build.gradle` - lines ~95-96 (`versionCode` and `versionName`)
   - `app.json` - `expo.version` (display version)

3. **Commit the version bump** before building

**Current versions (update after each build):**

- Android versionCode: 18
- Android versionName: 1.0.17
- app.json version: 1.0.17
- iOS uses EAS auto-increment

## Linear Ticket Creation

When creating Linear tickets for this project:

| Field    | Value              |
| -------- | ------------------ |
| Team     | Domani             |
| Assignee | `me`               |
| Project  | Domani Public Beta |
| Priority | Medium (3)         |

**Labels:** Always apply one from each sub-label group:

- **Environment:** `Front End`, `Fullstack`, `Server`
- **Scope:** `Ticket`, `Epic`
- **Task:** `Feature`, `Bug`, `Improvement`, `Refactor`, `Maintenance`, `Research`

**Description format:**

- `## Summary` - what and why
- `## Current State` / `## Target State` - when applicable
- `## Implementation` - files to modify, code snippets
- `## Acceptance Criteria` - checkbox list
