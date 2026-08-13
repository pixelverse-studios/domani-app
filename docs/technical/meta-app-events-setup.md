# Meta App Events Setup

Use this document to resume Domani's Meta iOS attribution and App Events implementation.

Search terms: `Meta App Events`, `Facebook SDK`, `Meta SDK`, `Meta App ID`, `Facebook App ID`, `Meta Pixel`.

## Current Status

As of August 13, 2026:

- The Domani Meta developer app has been created.
- The iOS platform has been registered with Meta.
- The Meta app is connected to the Domani ad account in the PixelVerse Studios business portfolio.
- Meta Events Manager recognizes Domani.
- Meta's manual App Events setup was configured to request implementation instructions for `StartTrial`, `Purchase`, and `CompleteRegistration`.
- The Meta/Facebook SDK and App Events calls have **not** been installed in this repository yet.
- Automatic in-app event logging is disabled in Meta.
- The iOS shared-secret field is intentionally blank because Domani does not sell an auto-renewing subscription.

## Meta Asset Identifiers

| Asset | Identifier |
| --- | --- |
| PixelVerse Studios business portfolio | `840721742090338` |
| Domani ad account | `1325069346419325` |
| Domani Meta app | `1378815353582072` |
| iOS bundle ID | `com.baitedz.domani-app` |
| Apple App Store ID | `6755746985` |

The Meta App Secret must not be committed to this repository. Store any server-only secret in the approved secret manager or remote environment if a future server integration requires it.

## Where to Resume

1. Open Meta Events Manager: <https://business.facebook.com/events_manager2/>.
2. Select the PixelVerse Studios portfolio and the Domani app data source.
3. Resume the manual iOS App Events setup.
4. Review Meta's current SDK instructions before choosing the React Native/Expo integration package.
5. Implement and test the SDK through a dedicated code change and new iOS build.

The initial event mapping is:

| Meta event | Domani trigger |
| --- | --- |
| `CompleteRegistration` | First-time account registration completes successfully; never ordinary sign-in |
| `StartTrial` | Backend trial creation succeeds |
| `Purchase` | A new lifetime purchase is verified; never a restored purchase |
| `planning_activated` | First genuine, non-tutorial task for today or tomorrow |

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
