# MVP Checklist

## Epic A — Google Sign-In (Supabase Mobile Auth)

| Task                                                   | Status   | Notes                                                                                                 | Updated    |
| ------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| Configure Supabase OAuth Google provider (mobile-only) | Complete | Sign-in screen, Supabase client, env wiring, and doc guidance for provider + redirect setup delivered | 2025-11-03 |

## Epic B — UI Stability & Polish

| Task                                                                      | Status      | Notes                                                                                                   | Updated    |
| ------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| Replace deprecated SafeAreaView usage with react-native-safe-area-context | Complete    | Screens now import SafeAreaView from react-native-safe-area-context and App wraps with SafeAreaProvider | 2025-11-07 |
| Resolve Expo Go boolean type crash in AppNavigator                        | In Progress | Investigating TypeError triggered when `useAuth` returns stringified loading state inside AppNavigator  | 2025-11-09 |
