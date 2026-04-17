# Audit Log - Mobile App - 2026-04-17 16:11:25

## Prompt Summary

Investigated a failed Android EAS development build and fixed the Gradle configuration issue blocking the local Android dev build.

## Actions Taken

1. Pulled the EAS build metadata and failing `Run gradlew` phase logs.
2. Identified the actual Gradle failure in `android/app/build.gradle` at the Hermes dependency selection block.
3. Updated the build script to read `hermesEnabled` via `findProperty(...)` instead of relying on an undefined bare variable inside the dependencies block.
4. Reviewed additional EAS warnings to separate the blocking error from non-blocking configuration issues.

## Files Changed

- `android/app/build.gradle` - Fixed Hermes dependency selection so remote EAS Android builds can evaluate the Gradle script successfully.

## Components/Features Affected

- Android native build configuration
- EAS development build pipeline
- Expo/React Native Hermes runtime selection

## Testing Considerations

- Re-run `npm run android:build` and confirm the previous Gradle evaluation failure no longer occurs.
- If the build proceeds further, install the resulting dev client on a physical Android device.
- Verify the app launches and connects to Metro via `npx expo start --dev-client --tunnel --clear`.
- After install, verify RevenueCat initializes on Android and offerings load.

## Performance Impact

- No runtime performance impact.
- Build-time only configuration fix.

## Next Steps

- Re-run the Android EAS development build.
- If EAS still warns about missing app assets in `app.json`, confirm the referenced icon files exist with the expected names and casing.
- Optionally add `cli.appVersionSource` to `eas.json` to remove the future warning.

## Notes

- The blocking EAS error was: `Could not get unknown property 'hermesEnabled' for object of type org.gradle.api.internal.artifacts.dsl.dependencies.DefaultDependencyHandler.`
- EAS also reported non-blocking Expo Doctor warnings about asset file paths and app config/native folder sync expectations for a non-CNG project.

## Timestamp

Created: 2026-04-17 16:11:25
Feature Area: billing
