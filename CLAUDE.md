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

## Environments

| Environment | Supabase Project | Config | Used For |
|-------------|-----------------|--------|----------|
| **Local dev** | Staging (`ftgltnzejaxasdvfkqut`) | `.env.local` overrides `.env` | Day-to-day development, simulator testing |
| **Internal test builds** | Staging (`ftgltnzejaxasdvfkqut`) | Build with `.env.local` active | QA builds shared with testers |
| **Production builds** | Production (`exxnnlhxcjujxnnwwrxv`) | `.env` only (remove/rename `.env.local`) | Play Store / TestFlight releases |

**Switching environments:**
- `.env.local` is auto-loaded by Expo and overrides `.env` values
- For production builds, temporarily rename `.env.local` → `.env.local.bak` so only `.env` (production) values are used
- Restore `.env.local` after the production build

## Common Commands

```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run db:types   # Regenerate Supabase types (production)
npm run typecheck  # TypeScript validation
npm run lint       # ESLint
npm run format     # Prettier
```

### Database Commands — Staging

```bash
npm run db:staging:push    # Push migrations to staging DB
npm run db:staging:reset   # Reset staging DB with all migrations
npm run db:staging:types   # Generate types from staging schema
```

### Database Commands — Production

```bash
npm run db:push            # Push migrations to production (ONLY after staging verification)
npm run db:types           # Generate types from production schema
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

**IMPORTANT:** When the user mentions "preparing for a build", "ready for build", or similar, **always ask first:** "Is this an **internal/QA build** (staging) or a **production build** (Play Store / TestFlight)?"

### Internal / QA Build (Staging)

1. Ensure `.env.local` is present with staging Supabase values
2. Push any pending migrations to staging: `npm run db:staging:push`
3. Increment version numbers (same as production)
4. Build the app — it will connect to the staging database
5. Distribute to testers

### Production Build

1. **Rename `.env.local`** → `.env.local.bak` so the app uses production Supabase values from `.env`
2. Push any pending migrations to production: `npm run db:push` (only after staging verification)
3. Increment version numbers:
   - **Android:** Update `versionCode` (integer, must increment) and `versionName` in `android/app/build.gradle`
   - **iOS:** Update via `app.json` or Xcode (EAS handles this automatically with `autoIncrement`)
4. Commit the version bump before building
5. Build the app
6. **Restore `.env.local`** from `.env.local.bak` after building

### Version File Locations

- `android/app/build.gradle` - lines ~95-96 (`versionCode` and `versionName`)
- `app.json` - `expo.version` (display version)

**Current versions (update after each build):**

- Android versionCode: 112
- Android versionName: 1.0.34
- app.json version: 1.0.34
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
