# Domani Meta Ads Measurement Plan

**Status:** Implementation and QA required

**Owners:** Phil and Sami

**Campaign:** Stage 1 US iOS Meta test

## Purpose

This document defines how Domani will measure the first paid Meta test. It keeps the technical event details out of the main campaign plan while giving everyone one set of reporting rules.

## Funnel Definitions

| Stage | Definition |
| --- | --- |
| Install | A first install reported by the selected iOS and Meta measurement setup |
| First open | The first successful app open recorded for that installation |
| Completed sign-in | The user finishes authentication and reaches the signed-in app experience |
| Qualified trial | A new user in the paid-acquisition cohort signs in and successfully starts the 14-day trial |
| Activated user | A qualified trial user creates the first genuine, non-tutorial task for today or tomorrow |
| Lifetime purchaser | RevenueCat and Supabase confirm new lifetime access from a purchase; restorations do not count as new purchases |

Tutorial and sample tasks do not count as activation.

## Required Events

| Event | Trigger | Required before launch |
| --- | --- | --- |
| `first_open` | First successful app open | Yes |
| `sign_in_completed` | Authentication finishes successfully | Yes |
| `trial_started` | Trial creation succeeds in the database | Yes |
| `task_created` | A task is saved successfully | Yes |
| `planning_activated` | First genuine task for today or tomorrow | Yes |
| `app_opened` | Signed-in or attributable app session begins | Yes |
| `task_edited` | Existing task is updated successfully | Yes for product retention |
| `task_completed` | Task is completed successfully | Yes for product retention |
| `task_rolled_forward` | Task is intentionally moved to a later day | Yes for product retention |
| `lifetime_purchase_completed` | RevenueCat and Supabase verify new lifetime access | Yes |
| `purchase_restored` | Existing access is restored | Yes; keep separate from purchase |
| `access_revoked` | Verified refund or access revocation | Can follow after launch if purchase reporting clearly notes the gap |

The former `plans` table and `plan_id` model are no longer part of the app. Do not create a `plan_created` event or use plan-based language in campaign reporting.

## Event Properties

Use only properties that the selected integration can provide reliably:

- platform;
- country;
- offer;
- campaign, ad-set, ad, and creative identifiers;
- attribution method and timestamp;
- product identifier;
- store;
- localized price and currency; and
- purchase timestamp.

Do not send task titles, task notes, email content, or other user-created planning content to Meta or an attribution provider.

## Attribution Rules

### Media Reporting

- Use Meta Ads Manager to report spend, impressions, reach, clicks, and Meta-attributed installs.
- Use a 7-day click window as the primary paid-attribution view when the selected iOS setup makes it available.
- Report 1-day view-through results separately. Do not combine them with click-attributed results when deciding whether acquisition economics work.
- Record the attribution setting shown in Ads Manager at launch. If iOS privacy reporting overrides or limits that setting, note the limitation in every report.

### Product Reporting

- Use PostHog to report sign-in, trial, activation, retention, and product behavior.
- Use RevenueCat and Supabase confirmation to report new lifetime purchases, restorations, refunds, and access state.
- Preserve campaign identifiers from first open through sign-in only when the implementation can do so accurately and within privacy requirements.
- If campaign or creative identifiers are unavailable in PostHog, report product outcomes for the paid acquisition period as campaign-level cohort results. Do not claim user-level or creative-level attribution that the implementation cannot support.
- Calculate install-to-qualified-trial rate with attributable first opens as the denominator when available. If Meta-reported installs must be used instead, label the result directional because the numerator and denominator come from different reporting systems.
- If paid and organic new users cannot be separated reliably, compare the campaign-period cohort with the pre-campaign baseline and label the limitation in the report.

### Purchase Window

- Primary purchase conversion: a verified lifetime purchase within 21 days of `trial_started`.
- Secondary purchase conversion: a verified lifetime purchase within 30 days of `trial_started`.
- A purchase after 30 days remains valid revenue but is not included in the primary campaign-conversion calculation.
- Restored purchases are reported separately and do not count as newly acquired customers.

The 21-day window gives a trial user the full 14 days plus seven additional days to make a purchase decision.

## Retention Rules

The retention cohort begins at `trial_started`.

Use exact rolling windows so results do not depend on a user's timezone or the time of day they started:

| Measure | Window after `trial_started` |
| --- | --- |
| Day 1 | 24-48 hours |
| Day 7 | 168-192 hours |
| Day 14 | 336-360 hours |

### General Retention

The user records at least one `app_opened` event during the window.

### Product Retention

The user creates, edits, completes, or rolls forward at least one task during the window. Opening the app without interacting with a task does not count.

Report the numerator, denominator, and rate. Do not treat a percentage based on fewer than 10 matured users as a firm decision signal.

## Reporting Views

### Daily Health Check

- Spend versus budget
- Delivery and rejected ads
- App Store link and app availability
- Event receipt and obvious duplication
- Installs and CPI
- Comments or user confusion

### Twice-Weekly Decision Report

- Spend
- Installs and CPI
- Qualified trials and cost per qualified trial
- Install-to-qualified-trial rate
- Activated users and cost per activated user
- Trial-to-activation rate
- Matured Day 1 retention
- Matured Day 7 retention when available
- Purchases, with cohort maturity clearly labeled
- Results by ad only where attribution supports the comparison

### Final Stage 1 Readout

Prepare two readouts:

1. **Activation readout:** after Stage 1 spend ends and the immediate funnel has settled.
2. **Cohort readout:** after the final acquired user completes the 21-day purchase window.

If Stage 1 ends August 20, the primary cohort readout should not be finalized before September 10, 2026.

## Pre-Launch Measurement QA

- [ ] Confirm the iOS app is registered correctly in Meta.
- [ ] Select and document the direct Meta app-event and iOS attribution approach.
- [ ] Determine whether ATT permission is required and verify the consent flow when applicable.
- [ ] Confirm every required event fires once at the correct point.
- [ ] Confirm trial and purchase events fire only after backend success.
- [ ] Confirm purchase restoration does not count as a new purchase.
- [ ] Confirm event names and properties in production PostHog.
- [ ] Confirm Meta receives the events required for reporting and future optimization.
- [ ] Record the exact Ads Manager attribution setting.
- [ ] Review the privacy policy and App Store privacy disclosures.
