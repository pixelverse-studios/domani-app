# Domani Meta Ads Open Decisions Questionnaire

Use this questionnaire to resolve the remaining campaign-foundation, measurement, and launch-readiness decisions. Add answers directly beneath each prompt. Use `unknown` where information still needs to be collected.

## 1. Meta Promotional Offer

### Offer Amount

Is `$9.99` the complete lifetime purchase price offered to Meta-acquired users, or is it a `$9.99` discount from the standard `$34.99` price?

> Add your answer here.

### Offer Delivery

How should eligible users receive the offer?

Possible approaches include:

- Automatic campaign-specific offering
- Promo code entered inside the app
- Store promotional offer
- Another mechanism

> Add your answer here.

### Eligibility

Will every new user acquired through Meta qualify for this offer?

> Add your answer here.

Will existing Domani users qualify?

> Add your answer here.

Will the offer be limited to users who have never purchased lifetime access?

> Add your answer here.

### Offer Duration

Will the offer be available for a fixed campaign period, indefinitely, or until a redemption limit is reached?

> Add your answer here.

If time-limited, what are the intended start and end dates?

> Add your answer here.

If quantity-limited, what is the maximum number of redemptions?

> Add your answer here.

### Offer Presentation

Should advertisements display both the standard `$34.99` price and the promotional `$9.99` price?

> Add your answer here.

Should the advertisement explicitly call the price a Meta launch offer, introductory offer, limited-time offer, or something else?

> Add your answer here.

What exact offer wording feels accurate and appropriate?

> Add your answer here.

### Technical Readiness

Is the intended $9.99 offer already configured and tested on iOS?

> Add your answer here.

Is the intended $9.99 offer already configured and tested on Android?

> Add your answer here.

Can the app currently determine that a user came from the Meta campaign and should receive the offer?

> Add your answer here.

If not, are you comfortable requiring a promo code, or should qualification be automatic?

> Add your answer here.

## 2. Store Commission and Campaign Economics

Is Domani enrolled in Apple's App Store Small Business Program?

> Add your answer here.

What commission percentage currently applies to Domani's iOS purchases?

> Add your answer here.

Is Domani enrolled in Google Play's 15% service-fee tier?

> Add your answer here.

What commission percentage currently applies to Domani's Android purchases?

> Add your answer here.

After store commissions, what is the expected net receipt from a `$9.99` purchase on iOS?

> Add your answer here.

After store commissions, what is the expected net receipt from a `$9.99` purchase on Android?

> Add your answer here.

What portion of each net purchase should remain after advertising costs as contribution margin?

> Add your answer here.

What customer acquisition cost would you consider:

**Excellent:**

> Add your answer here.

**Acceptable:**

> Add your answer here.

**Unprofitable:**

> Add your answer here.

Are you open to testing a higher Meta promotional price, such as `$14.99` or `$19.99`, if `$9.99` does not provide enough acquisition margin?

> Add your answer here.

## 3. Available Test Budget

What amount can Domani comfortably spend today without depending on future income?

Possible starting amounts include `$300`, `$500`, `$750`, or `$1,000`.

> Add your answer here.

What is the maximum acceptable loss for the first learning phase?

> Add your answer here.

Do you approve the provisional staged structure below?

- Stage 1: Up to `$300`
- Stage 2: An additional `$500-700` only if Stage 1 meets continuation thresholds
- Maximum initial commitment: `$800-1,000`

> Add your answer here.

Would spending `$300` on Stage 1 create financial pressure?

> Add your answer here.

If the paid budget is not currently comfortable, are you willing to run an organic creative-validation stage first?

> Add your answer here.

## 4. Definition of a New User

Which event should count as a new user for campaign reporting?

Possible definitions include:

- App installed
- App opened for the first time
- Sign-in completed
- Trial activated
- First plan created

> Add your answer here.

Do you approve this recommended definition?

> A qualified new user is an attributed user who signs in and activates the trial.

> Add your answer here.

Do you approve this recommended activation definition?

> An activated user is a qualified new user who creates their first genuine plan.

> Add your answer here.

Should a tutorial-created or sample plan count as activation?

> Add your answer here.

## 5. Initial Platform Selection

### App Store Connect Baseline

What date range do the available iOS numbers cover?

> Add your answer here.

**Store impressions:**

> Add your answer here.

**Product-page views:**

> Add your answer here.

**Store conversion rate:**

> Add your answer here.

**First-time downloads:**

> Add your answer here.

**Completed sign-ins:**

> Add your answer here.

**Trial activations:**

> Add your answer here.

**Lifetime purchases:**

> Add your answer here.

**Refunds:**

> Add your answer here.

**Current rating and review count:**

> Add your answer here.

### Google Play Baseline

What date range do the available Android numbers cover?

> Add your answer here.

**Store-listing visitors:**

> Add your answer here.

**Store conversion rate:**

> Add your answer here.

**First-time installers:**

> Add your answer here.

**Completed sign-ins:**

> Add your answer here.

**Trial activations:**

> Add your answer here.

**Lifetime purchases:**

> Add your answer here.

**Refunds:**

> Add your answer here.

**Current rating and review count:**

> Add your answer here.

### Platform Decision

Based on the available evidence, which platform do you currently prefer for the first campaign?

> Add your answer here.

If iOS and Android appear broadly equal, do you approve starting with iOS for purchase-intent testing?

> Add your answer here.

Would you prefer Android if it offers lower-cost initial learning and cleaner attribution?

> Add your answer here.

## 6. Retention Definitions

Do you approve tracking both general retention and product retention?

> Add your answer here.

### General Retention

Should general retention mean that the user returned and opened Domani?

> Add your answer here.

Should another event define general retention instead?

> Add your answer here.

### Product Retention

Which actions should qualify as meaningful retained product activity?

Possible actions include:

- Viewed the Planning screen
- Viewed the Today screen
- Created a plan
- Updated an existing plan
- Created a task
- Completed a task
- Rolled a task forward
- Performed any planning or task action

> Add your answer here.

Should opening the app without interacting with a plan or task count as product retention?

> Add your answer here.

### Retention Cohort Start

Which event should begin the campaign retention cohort?

Recommended event: `trial_started`

> Add your answer here.

Do you approve measuring Day 1, Day 7, and Day 14 retention from that event?

> Add your answer here.

## 7. Lifetime Access Promise

Do you intend to promise that a lifetime purchaser receives every future Domani feature without exception?

> Add your answer here.

Could Domani eventually introduce a separate product, service, AI feature, team product, or paid add-on that would not be included in the original lifetime purchase?

> Add your answer here.

Do you approve using this safer customer-facing language?

> One payment. Lifetime access to Domani. No recurring subscription.

> Add your answer here.

Are there any additional lifetime-access promises that must appear in the campaign?

> Add your answer here.

## 8. PostHog Funnel Events

### Install and First Open

Do you approve adding an attributed `first_open` event while using App Store Connect and Google Play Console as the authoritative sources for installs?

> Add your answer here.

Should the first-open event include platform, app version, country, source, campaign, ad set, ad, and creative where available?

> Add your answer here.

### Activated Trials

Do you approve emitting `trial_started` only after the trial is successfully created in the database?

> Add your answer here.

Should the event include platform, offer, signup cohort, campaign attribution, and trial expiration date?

> Add your answer here.

### First-Plan Activation

Do you approve emitting `plan_created` when a user creates their first genuine plan?

> Add your answer here.

Should subsequent plans use the same event with a first-plan property, or should first activation have its own event?

> Add your answer here.

### Paid Users

Do you approve adding a verified `lifetime_purchase_completed` event?

> Add your answer here.

Should this event be emitted only after RevenueCat and Supabase confirm lifetime access?

> Add your answer here.

Should it include product identifier, store, price, currency, offer, purchase timestamp, and attribution properties?

> Add your answer here.

### Refunds and Revoked Access

Do you approve tracking verified refunds and revoked access in PostHog?

> Add your answer here.

Should restored purchases also be tracked separately from new purchases?

> Add your answer here.

### Retention Reporting

Do you approve creating PostHog insights for:

- Day 1 general retention
- Day 1 product retention
- Day 7 general retention
- Day 7 product retention
- Day 14 general retention
- Day 14 product retention

> Add your answer here.

Which breakdowns are required?

Recommended breakdowns include platform, campaign, creative, offer, country, and activation status.

> Add your answer here.

## 9. Attribution and Identity

Should Domani use a mobile measurement partner such as AppsFlyer or Adjust, a direct Meta integration, or another attribution approach?

> Add your answer here.

Do you have a preferred attribution vendor?

> Add your answer here.

What is the maximum monthly amount you are willing to spend on attribution tooling?

> Add your answer here.

Do you approve retaining both first-touch and latest-touch campaign attribution where technically appropriate?

> Add your answer here.

Do you approve preserving attribution when an anonymous first-open user later signs in?

> Add your answer here.

Which campaign properties should be stored or sent to PostHog?

Recommended properties:

- Source
- Campaign
- Ad set
- Ad
- Creative
- Platform
- Country
- Offer
- Attribution timestamp

> Add your answer here.

## 10. Meta Business Infrastructure

Does Domani currently have a Meta Business Portfolio?

> Add your answer here.

Does Domani currently have an advertising account?

> Add your answer here.

Is billing configured and verified?

> Add your answer here.

Is there a Facebook Page representing Domani?

> Add your answer here.

Is there an Instagram account representing Domani?

> Add your answer here.

Are the Facebook Page and Instagram account connected to the correct Meta Business Portfolio?

> Add your answer here.

Are the iOS and Android apps registered with Meta?

> Add your answer here.

Who currently has administrative access to these assets?

> Add your answer here.

Are there any known account restrictions, verification problems, or payment issues?

> Add your answer here.

## 11. Privacy and Consent

Are you comfortable integrating advertising attribution if Domani minimizes data collection and respects platform consent requirements?

> Add your answer here.

Has the current iOS App Tracking Transparency behavior been reviewed?

> Add your answer here.

Should Domani request ATT permission? If so, at what point in the user experience?

> Add your answer here.

Has the privacy policy been reviewed for Meta, MMP, attribution, and advertising-event disclosures?

> Add your answer here.

Are there categories of user or event data that must never be shared with Meta or an attribution provider?

> Add your answer here.

Do you approve these default privacy constraints?

- Do not send task titles, task notes, email content, or other user-generated planning content
- Do not send unnecessary personal information
- Do not use advertising tracking to bypass ATT or other consent requirements
- Share only the minimum event and attribution data required for measurement

> Add your answer here.

## 12. Store Localization Status

Which localized App Store listings are currently live?

> Add your answer here.

Which localized Google Play listings are currently live?

> Add your answer here.

Which localized screenshot sets are currently live on iOS?

> Add your answer here.

Which localized screenshot sets are currently live on Android?

> Add your answer here.

Do you agree that localization is not a blocker for the first US-English campaign?

> Add your answer here.

## 13. Creative and Brand Constraints

Do you approve the current campaign guardrails?

- No fear, shame, or aggressive productivity pressure
- No mental-health diagnosis or sensitive personal-attribute claims
- No guaranteed productivity or therapeutic outcomes
- No fake testimonials or manufactured social proof
- Transparent trial and offer terms
- Minimal advertising-data collection

> Add your answer here.

Are there any additional tones, claims, visual styles, or tactics that should never be used?

> Add your answer here.

Are there brands, advertisements, creators, or visual styles that feel directionally right for Domani?

> Add your answer here.

Are there examples that feel wrong for Domani?

> Add your answer here.

## 14. Pre-Launch Readiness

Who will own Meta account setup and campaign management?

> Add your answer here.

Who will produce or appear in UGC-style creative?

> Add your answer here.

Who will review campaign performance during the test?

> Add your answer here.

How frequently can campaign results realistically be reviewed?

> Add your answer here.

Is there a target launch date or launch window?

> Add your answer here.

Are there product releases, store updates, promotions, or operational constraints that affect the launch date?

> Add your answer here.

## Final Confirmation

What is the most important unresolved concern you want addressed before Domani spends money on Meta advertising?

> Add your answer here.

Is there anything else about the business, product, audience, offer, budget, or brand that should influence the campaign plan?

> Add your answer here.
