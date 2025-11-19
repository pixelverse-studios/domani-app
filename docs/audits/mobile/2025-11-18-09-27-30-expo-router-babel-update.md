# Audit Log - Mobile App - 2025-11-18 09:27:30

## Prompt Summary
Address the new Expo Router bundling failure complaining that `expo-router/babel` is deprecated on SDK 50.

## Actions Taken
1. Updated `babel.config.js` to remove the deprecated `expo-router/babel` plugin.
2. Kept `babel-preset-expo` as the sole preset and retained the required `nativewind/babel` and `react-native-reanimated/plugin` entries in the plugins array (Reanimated last).

## Files Changed
- `babel.config.js` - Removed the deprecated Expo Router plugin.

## Components/Features Affected
- Metro/Babel build pipeline
- Expo Router + NativeWind integration

## Testing Considerations
- Restart Metro or run `npx expo start -c` so the updated Babel config takes effect.
- Verify bundling succeeds on iOS and Android.

## Performance Impact
- None; build configuration only.

## Next Steps
- After Metro restarts, confirm the app loads to catch any remaining runtime errors (e.g., navigation context warning if still present).

## Notes
- Expo SDK 50 already includes the router transforms via `babel-preset-expo`, so the explicit plugin must be removed.

## Timestamp
Created: 2025-11-18 09:27:30
Feature Area: technical
