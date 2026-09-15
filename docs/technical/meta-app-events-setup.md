# Meta App Events Setup

Use this document to resume Domani's Meta iOS attribution and App Events implementation.

Search terms: `Meta App Events`, `Facebook SDK`, `Meta SDK`, `Meta App ID`, `Facebook App ID`, `Meta Pixel`.

## Current Status

As of August 16, 2026:

- The Domani Meta developer app has been created.
- The iOS platform has been registered with Meta.
- The Meta app is connected to the Domani ad account in the PixelVerse Studios business portfolio.
- Meta Events Manager recognizes Domani.
- Meta's manual App Events setup was configured to request implementation instructions for `StartTrial`, `Purchase`, and `CompleteRegistration`.
- `react-native-fbsdk-next` and `expo-tracking-transparency` are installed for Expo SDK 54.
- The Expo config plugin supplies the production Meta App ID, display name, URL scheme, privacy flags, ATT copy, and build-time Client Token.
- The SDK initializes once at app startup with advertiser tracking and advertiser-ID collection disabled.
- ATT permission is requested when the user taps **Start 14-Day Free Trial**, immediately before trial creation. A denial, unavailable prompt, or permission error never blocks the trial.
- Manual funnel event calls remain tracked separately in DEV-1109.
- Automatic App Install/App Launch logging is enabled through build configuration; automatic in-app-purchase logging remains disabled in Meta.
- The iOS shared-secret field is intentionally blank because Domani does not sell an auto-renewing subscription.

## Meta Asset Identifiers

| Asset                                 | Identifier               |
| ------------------------------------- | ------------------------ |
| PixelVerse Studios business portfolio | `840721742090338`        |
| Domani ad account                     | `1325069346419325`       |
| Domani Meta app                       | `1378815353582072`       |
| iOS bundle ID                         | `com.baitedz.domani-app` |
| Apple App Store ID                    | `6755746985`             |

The Meta App Secret must not be committed to this repository. Store any server-only secret in the approved secret manager or remote environment if a future server integration requires it.

The Meta Client Token is not the App Secret. Supply it to local/EAS native generation as `META_CLIENT_TOKEN`; do not use `META_APP_SECRET` or expose an App Secret through an `EXPO_PUBLIC_*` variable.

## Build Configuration

The dynamic Expo config accepts:

| Variable                              | Purpose                                                                        | Default                                |
| ------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| `META_CLIENT_TOKEN`                   | Writes Meta's Client Token into generated native configuration                 | Missing; SDK initialization is skipped |
| `META_IOS_TRACKING_USAGE_DESCRIPTION` | Approved `NSUserTrackingUsageDescription` copy                                 | Missing; ATT plugin is omitted         |
| `META_AUTO_LOG_APP_EVENTS_ENABLED`    | Enables automatic App Install/App Launch logging when explicitly set to `true` | `false`                                |

Production EAS config evaluation fails if the Client Token or ATT description is missing. Advertiser-ID collection remains disabled in generated configuration regardless of the automatic-event setting and is enabled at runtime on iOS only after ATT is granted.

Because this repository contains checked-in native directories, app-config changes are not automatically synchronized into those directories. Before any native build—including an EAS build that uses the checked-in projects—supply the build variables and run:

```bash
npx expo prebuild
```

Then rebuild the development client or native app. Expo Go cannot load the Meta native module.

DEV-1108 intentionally does not commit the environment-provided Client Token or ATT wording into the generated native projects. Regenerate the native projects from the approved local/build environment before producing the 1.1.2 release build.

The generated configuration can be inspected without writing native files:

```bash
npx expo config --type introspect --json
```

Keep automatic in-app-purchase logging disabled in Meta. DEV-1109 owns the single manual `Purchase` event after RevenueCat and Supabase verification.

## Where to Resume

1. Open Meta Events Manager: <https://business.facebook.com/events_manager2/>.
2. Select the PixelVerse Studios portfolio and the Domani app data source.
3. Resume the manual iOS App Events setup.
4. Confirm `META_CLIENT_TOKEN`, `META_IOS_TRACKING_USAGE_DESCRIPTION`, and `META_AUTO_LOG_APP_EVENTS_ENABLED` are present in the approved build environment.
5. Complete the privacy/store-disclosure review in DEV-1110.
6. Run Expo prebuild, create new native builds, and verify them on physical devices.

The initial event mapping is:

| Meta event             | Domani trigger                                                                 |
| ---------------------- | ------------------------------------------------------------------------------ |
| `CompleteRegistration` | First-time account registration completes successfully; never ordinary sign-in |
| `StartTrial`           | Backend trial creation succeeds                                                |
| `Purchase`             | A new lifetime purchase is verified; never a restored purchase                 |
| `planning_activated`   | First genuine, non-tutorial task for today or tomorrow                         |

Events must be verified in Meta Events Manager from a physical iPhone. Each event must arrive exactly once. Do not send task titles, task notes, email content, or other user-created planning content to Meta.

PostHog remains the source for detailed product analytics. RevenueCat and Supabase remain authoritative for purchases and access state.

## Meta Pixel vs. Mobile App Events

Do **not** install the Meta Pixel in the React Native mobile app.

- The Meta Pixel is browser JavaScript for activity on a website.
- The Domani iOS app uses Meta App Events through the mobile SDK or an approved server-side App Events integration.
- The existing Domani Website Pixel applies only to the Domani website and should remain separate from the mobile app data source.
- A future Conversions API integration may send selected server-verified app events, but it must use a documented deduplication strategy if the same event can also be sent by the mobile SDK.

Official references:

- Meta Pixel setup: <https://www.facebook.com/help/messenger-app/952192354843755>
- Meta Conversions API overview: <https://www.facebook.com/business/help/AboutConversionsAPI>

## Privacy and Release Gate

Before shipping the Meta SDK:

- Decide whether the final data collection and use require Apple's App Tracking Transparency prompt.
- Update App Store privacy disclosures and Domani's privacy policy if required.
- Confirm automatic Meta event logging remains disabled unless the explicit event design is intentionally changed.
- Confirm purchase, trial, and registration events do not duplicate existing reporting paths.
- Verify the release build in Meta Events Manager before using App Events for campaign reporting or optimization.
