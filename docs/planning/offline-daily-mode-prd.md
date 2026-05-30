# Offline Daily Mode PRD

## Summary

Domani should support a focused offline daily mode so previously signed-in users can open the app without cell service, view today's tasks, and continue basic task work without being blocked by indefinite loading states. V1 should not attempt full offline-first coverage across the entire app. Instead, it should detect connectivity, restore today's locally cached task snapshot, allow task actions to be queued while offline, and sync those actions when connectivity returns.

## Problem

The current app is network-first. If a user opens Domani without service, key startup and screen data flows can wait on Supabase-backed auth, profile, subscription, and task queries. This can make the app appear stuck, even when the user's most important offline need is simple: see and manage today's tasks.

## Goals

- Prevent endless loading when a previously signed-in user opens the app offline.
- Show today's tasks from the most recent local snapshot.
- Allow offline create, edit, complete/uncomplete, and delete for today's tasks.
- Queue offline task changes and replay them when connectivity returns.
- Use the user's last-known trial/lifetime access state while offline.
- Keep V1 narrow enough to ship without introducing a heavy local database or broad sync system.

## Non-Goals

- Offline sign-in.
- Offline purchases, restores, or trial start.
- Offline profile/account updates.
- Offline category management.
- Offline analytics delivery guarantees.
- Offline reminder creation or reminder edits.
- Historical offline access beyond today, with tomorrow optional if low effort.
- Conflict resolution UI.

## Product Behavior

When the app opens offline and a valid cached session/access state exists, Domani should render the main app instead of blocking behind a spinner. The Today screen should show cached tasks if available and display an offline banner such as "Offline. Changes will sync when you're back online."

If no cached Today snapshot exists, the app should show a clear offline empty state: "Offline. Today's tasks are not available on this device yet." If no cached session/access state exists, the app should require a connection to sign in.

While offline, users should be able to create, edit, complete/uncomplete, and delete today's tasks. These changes should update the UI immediately, persist locally, survive app restart, and sync automatically after reconnect.

Reminder changes should be disabled offline in V1 with direct copy such as "Reminders need a connection for now."

## Access and Paywall Behavior

Domani is paid-only with a 14-day trial path. Offline access should use the last-known access state:

- Allow access for last-known `trialing`, `lifetime`, `beta`, or `grace_period`.
- Keep users blocked for last-known `expired` or `refunded`.
- Require network if no cached access state exists.
- Respect cached trial expiration dates if the user remains offline past expiration.

## Technical Approach

Add `@react-native-community/netinfo` for connectivity detection and wire it into React Query's online state. Use existing `AsyncStorage` for local task snapshots and a durable offline mutation queue. Avoid adding a heavier local database for V1.

Core pieces:

- `src/lib/network.ts`: connectivity state, NetInfo integration, React Query `onlineManager` bridge.
- `src/lib/offlineTaskStore.ts`: AsyncStorage-backed task snapshots and task operation queue.
- `src/lib/offlineTaskSync.ts`: replay queued operations when online.
- `src/components/shared/OfflineBanner.tsx`: visible offline/syncing state.
- `src/hooks/useTasks.ts`: read local snapshots while offline and route mutations to the queue.
- `src/providers/AuthProvider.tsx`: allow cached signed-in users through when offline and defer server validation until online.
- `src/app/(tabs)/index.tsx`: replace indefinite loading with offline-aware task rendering or offline empty state.
- `src/app/(tabs)/planning.tsx`: allow offline task form usage for today and disable reminder edits offline.

## Offline Data

Persist local data with user-scoped keys:

- `domani:offline:v1:tasks:{userId}:{date}`
- `domani:offline:v1:taskQueue:{userId}`
- `domani:offline:v1:access:{userId}`

Queued task operations should include operation id, operation type, client timestamp, affected date, server task id or local task id, base `updated_at`, and payload/updates.

Offline-created tasks should use a local id such as `local-{uuid}` until the server insert succeeds. After sync, replace the local id with the server id in local snapshots and pending operations.

## Conflict Policy

Use latest-timestamp-wins for V1.

Each queued operation should carry `clientCreatedAt` and, where available, `baseUpdatedAt`. On sync, if the server row changed after the local base version, compare timestamps. Apply the local change if the queued operation is newer. Keep the server version if it is newer. Avoid conflict UI for V1.

## Acceptance Criteria

- Opening the app in airplane mode with a prior valid session does not show endless loading.
- Today renders from cached tasks while offline.
- A visible offline banner appears while offline.
- Users can create, edit, complete/uncomplete, and delete today's tasks offline.
- Offline changes persist across app restart.
- Queued changes replay automatically when network returns.
- Successful sync refreshes server-backed task data.
- Reminder creation/editing is disabled offline in V1.
- If no cached Today data exists, the user sees a clear offline state.
- Paywall gating uses last-known access state while offline.
- Unit tests cover snapshot read/write, queue enqueue, queue replay, local id replacement, and latest-timestamp-wins behavior.

## Delivery Plan

### Phase 1: Offline Read and Startup

- Add NetInfo and network state integration.
- Defer server auth validation when offline and a cached session exists.
- Persist and restore today's task snapshot.
- Add offline banner and offline empty state.
- Ensure Today does not show an indefinite spinner offline.

### Phase 2: Offline Task Mutations

- Add task mutation queue.
- Apply offline task changes immediately to local snapshot.
- Persist queued operations.
- Replay queue on reconnect.
- Replace local ids after successful server creates.
- Add tests for queue ordering, replay, and local cache updates.

### Phase 3: Hardening and Documentation

- Add tomorrow snapshot support if implementation remains low complexity.
- Add visible sync failure/retry state.
- Document offline behavior, sync queue, conflict policy, and known V1 limits.
- Add QA checklist for airplane mode startup, offline edits, reconnect sync, expired trial behavior, and first launch with no cache.

## Risks

- Auth and entitlement logic currently depends on server-backed validation; offline startup must avoid accidentally locking out valid cached users or granting access without any cached access state.
- Offline-created tasks need careful local id replacement after sync.
- Task reminders should stay online-only in V1 to avoid expanding into notification scheduling edge cases.
- Category data may be stale offline; V1 should only support categories already present in the local task/form cache.

## Open Decisions

- Include tomorrow in V1 if the added complexity is minimal, or hold it for Phase 3.
- Decide exact offline banner copy and whether it should appear globally or only on Today/Planning.
- Decide whether offline edits should allow category changes or only preserve existing cached categories.
