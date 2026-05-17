# Testing Utilities

Shared Jest helpers live in `src/test/test-utils.tsx`. Import from that file instead of importing React Native Testing Library directly when a test needs app context.

## Rendering Components

Use `renderWithProviders` for components that depend on localization, theme, analytics, or React Query context.

```tsx
import { renderWithProviders, screen } from '~/test/test-utils'

renderWithProviders(<MyComponent />)

expect(screen.getByText('Visible label')).toBeTruthy()
```

Prefer accessibility and visible text queries first: `getByRole`, `getByLabelText`, and `getByText`. Use `testID` only for non-visible stable anchors where a user-facing query is not practical.

## Rendering Hooks

Use `renderHookWithProviders` when a hook depends on React Query or app providers. The test query client disables retries so failures surface immediately.

```tsx
import { renderHookWithProviders } from '~/test/test-utils'

const { result, queryClient } = renderHookWithProviders(() => useMyHook())
```

Use `createTestQueryClient` or `createTestWrapper` directly when a test needs custom cache setup before rendering.

## Factories

The shared factories provide typed defaults for common models:

- `buildTask`
- `buildProfile`
- `buildSystemCategory`
- `buildUserCategory`
- `buildTaskWithCategory`

Override only the fields relevant to the behavior under test.

```tsx
const task = buildTask({ title: 'Plan tomorrow', is_mit: true })
```

## Native And Service Mocks

Global mocks are configured in `jest.setup.js` for native or service integrations that must not make real calls in unit tests, including Expo Router, Supabase, AsyncStorage, Expo Notifications, RevenueCat, PostHog, Sentry, Reanimated, Haptics, and SVG.
