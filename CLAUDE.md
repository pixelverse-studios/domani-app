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
