# Domani Meta Ads Open Decisions Questionnaire

Use this questionnaire to resolve the remaining campaign-foundation, measurement, and launch-readiness decisions. Add answers directly beneath each prompt. Use `unknown` where information still needs to be collected.

## 1. Meta Promotional Offer

### Offer Amount

Is `$9.99` the complete lifetime purchase price offered to Meta-acquired users, or is it a `$9.99` discount from the standard `$34.99` price?

> 9.99 is the default price of the app through the next few months. We are calling it early adopter sale, but we will be marketing it as a discount down from 34.99 to 9.99 if you purchase when you see the ad. We will likely switch over by October to full price. this is extra context, but not relevant to the immediate scope

### Offer Delivery

How should eligible users receive the offer?

Possible approaches include:

- Automatic campaign-specific offering
- Promo code entered inside the app
- Store promotional offer
- Another mechanism

> The purchase price of the app will be set to 9.99. Users just have to go and purchase inside of the app, no extra steps for this one at all

### Eligibility

Will every new user acquired through Meta qualify for this offer?

> Yes

Will existing Domani users qualify?

> Yes

Will the offer be limited to users who have never purchased lifetime access?

> Yes

### Offer Duration

Will the offer be available for a fixed campaign period, indefinitely, or until a redemption limit is reached?

> Currently between fixed period and redemption limit. We havent decided but the details of this

If time-limited, what are the intended start and end dates?

> lets go with not time limited

If quantity-limited, what is the maximum number of redemptions?

> 200

### Offer Presentation

Should advertisements display both the standard `$34.99` price and the promotional `$9.99` price?

> Yes. we have a video to use, but want to also make it clear the price is discounted

Should the advertisement explicitly call the price a Meta launch offer, introductory offer, limited-time offer, or something else?

> Early adopter offer

What exact offer wording feels accurate and appropriate?

> Early adopter sale (open to suggestions)

### Technical Readiness

Is the intended $9.99 offer already configured and tested on iOS?

> Yes

Is the intended $9.99 offer already configured and tested on Android?

> Yes

Can the app currently determine that a user came from the Meta campaign and should receive the offer?

> Everyone joining will be given the price until we decide to turn it off, or hit the limit of 200. No need to determine where the user came from. but we do want to track campaigns into the app to see how they are performing, so not sure if that is built in or needs to be added to the TODO to confirm and add

If not, are you comfortable requiring a promo code, or should qualification be automatic?

>

## 2. Store Commission and Campaign Economics

Is Domani enrolled in Apple's App Store Small Business Program?

> I believe so but need to confirm, add it to the todo

What commission percentage currently applies to Domani's iOS purchases?

> 20% i believe

Is Domani enrolled in Google Play's 15% service-fee tier?

> I dont think so, but add it to the todo

What commission percentage currently applies to Domani's Android purchases?

> cant remember at this time

After store commissions, what is the expected net receipt from a `$9.99` purchase on iOS?

> 7.99? Are you asking for overhead coverage per purchase as well, or just purely what we expect to get after ios takes its cut?

After store commissions, what is the expected net receipt from a `$9.99` purchase on Android?

> I believe its 0 right now, so 9.99

What portion of each net purchase should remain after advertising costs as contribution margin?

> Unsure and need help understanding how to get this

What customer acquisition cost would you consider:

**Excellent:**

> Unsure, need assistance figuring this out

**Acceptable:**

>Unsure, need assistance figuring this out

**Unprofitable:**

>Unsure, need assistance figuring this out

Are you open to testing a higher Meta promotional price, such as `$14.99` or `$19.99`, if `$9.99` does not provide enough acquisition margin?

> Unsure, need assistance figuring this out

## 3. Available Test Budget

What amount can Domani comfortably spend today without depending on future income?

Possible starting amounts include `$300`, `$500`, `$750`, or `$1,000`.

> Lets start at 300

What is the maximum acceptable loss for the first learning phase?

> 200

Do you approve the provisional staged structure below?

- Stage 1: Up to `$300`
- Stage 2: An additional `$500-700` only if Stage 1 meets continuation thresholds
- Maximum initial commitment: `$800-1,000`

> Theoretically yes, but will need to confirm with my partner

Would spending `$300` on Stage 1 create financial pressure?

> I think we can stomach it

If the paid budget is not currently comfortable, are you willing to run an organic creative-validation stage first?

> I think we are willing to do this in tandem with the ad campaign

## 4. Definition of a New User

Which event should count as a new user for campaign reporting?

Possible definitions include:

- App installed
- App opened for the first time
- Sign-in completed
- Trial activated
- First plan created

> Trial activated

Do you approve this recommended definition?

> A qualified new user is an attributed user who signs in and activates the trial.

> Yes

Do you approve this recommended activation definition?

> An activated user is a qualified new user who creates their first genuine plan.

> Not sure why we are calling these things plans. Is it just a term, or stemming from sort of outdated documentation in the app itself? but yes, an activated user is a qualified user who starts planning, creating a task for today or tomorrow

Should a tutorial-created or sample plan count as activation?

> No

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

> IOS

If iOS and Android appear broadly equal, do you approve starting with iOS for purchase-intent testing?

> Add your answer here.

Would you prefer Android if it offers lower-cost initial learning and cleaner attribution?

> Add your answer here.

## 6. Retention Definitions

Do you approve tracking both general retention and product retention?

> Yes

### General Retention

Should general retention mean that the user returned and opened Domani?

> Sure if we think that is strict enough to make a sample size

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

> What is with this created a plan edited a plan? Create tasks, edit, complete tasks, roll forward, are all valid

Should opening the app without interacting with a plan or task count as product retention?

> At this time, no

### Retention Cohort Start

Which event should begin the campaign retention cohort?

Recommended event: `trial_started`

> Add your answer here.

Do you approve measuring Day 1, Day 7, and Day 14 retention from that event?

> Yes

## 7. Lifetime Access Promise

Do you intend to promise that a lifetime purchaser receives every future Domani feature without exception?

> Yes

Could Domani eventually introduce a separate product, service, AI feature, team product, or paid add-on that would not be included in the original lifetime purchase?

> Potentially, but it would have to be a major shift or different type of supplemental feature

Do you approve using this safer customer-facing language?

> One payment. Lifetime access to Domani. No recurring subscription.

> Yes

Are there any additional lifetime-access promises that must appear in the campaign?

> Add your answer here.

## 8. PostHog Funnel Events

### Install and First Open

Do you approve adding an attributed `first_open` event while using App Store Connect and Google Play Console as the authoritative sources for installs?

> Sure

Should the first-open event include platform, app version, country, source, campaign, ad set, ad, and creative where available?

> sure

### Activated Trials

Do you approve emitting `trial_started` only after the trial is successfully created in the database?

> sure

Should the event include platform, offer, signup cohort, campaign attribution, and trial expiration date?

> sure

### First-Plan Activation

Do you approve emitting `plan_created` when a user creates their first genuine plan?

> Again, what is with the plans? i thought we removed all reference to daily plans from the code base, db, and documentation a while ago, and are just keeping things tied to day -> tasks. correct me if im wrong

Should subsequent plans use the same event with a first-plan property, or should first activation have its own event?

> Add your answer here.

### Paid Users

Do you approve adding a verified `lifetime_purchase_completed` event?

> Sure

Should this event be emitted only after RevenueCat and Supabase confirm lifetime access?

> Yes

Should it include product identifier, store, price, currency, offer, purchase timestamp, and attribution properties?

> yes

### Refunds and Revoked Access

Do you approve tracking verified refunds and revoked access in PostHog?

> Yes

Should restored purchases also be tracked separately from new purchases?

> Yes

### Retention Reporting

Do you approve creating PostHog insights for:

- Day 1 general retention
- Day 1 product retention
- Day 7 general retention
- Day 7 product retention
- Day 14 general retention
- Day 14 product retention

> Yes

Which breakdowns are required?

Recommended breakdowns include platform, campaign, creative, offer, country, and activation status.

> yes

## 9. Attribution and Identity

Should Domani use a mobile measurement partner such as AppsFlyer or Adjust, a direct Meta integration, or another attribution approach?

> Not yet, but if free we can look to add something worth our while

Do you have a preferred attribution vendor?

> Add your answer here.

What is the maximum monthly amount you are willing to spend on attribution tooling?

> 0 for now. we need to make some money before spending a lot of money

Do you approve retaining both first-touch and latest-touch campaign attribution where technically appropriate?

> Sure if financially feasible

Do you approve preserving attribution when an anonymous first-open user later signs in?

> sure

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

> As many as will be helpful. weigh in here

## 10. Meta Business Infrastructure

Does Domani currently have a Meta Business Portfolio?

> Yes

Does Domani currently have an advertising account?

> Yes

Is billing configured and verified?

> I think so but add it to the todo, to work on afterwards

Is there a Facebook Page representing Domani?

> No

Is there an Instagram account representing Domani?

> No. but we have an instagram account, and facebook page for PixelVerse studios

Are the Facebook Page and Instagram account connected to the correct Meta Business Portfolio?

> Connected to the pvs accounts, but named and listed as domani for these specific ad accounts

Are the iOS and Android apps registered with Meta?

> I dont know, add to the todo to verify and complete if needed

Who currently has administrative access to these assets?

> Sami and myself

Are there any known account restrictions, verification problems, or payment issues?

> No

## 11. Privacy and Consent

Are you comfortable integrating advertising attribution if Domani minimizes data collection and respects platform consent requirements?

yes

Has the current iOS App Tracking Transparency behavior been reviewed?

> i think so but add to the todo

Should Domani request ATT permission? If so, at what point in the user experience?

> idk what this is, explain

Has the privacy policy been reviewed for Meta, MMP, attribution, and advertising-event disclosures?

> probably not?

Are there categories of user or event data that must never be shared with Meta or an attribution provider?

> idk i dont think so

Do you approve these default privacy constraints?

- Do not send task titles, task notes, email content, or other user-generated planning content
- Do not send unnecessary personal information
- Do not use advertising tracking to bypass ATT or other consent requirements
- Share only the minimum event and attribution data required for measurement

> Yes

## 12. Store Localization Status

Which localized App Store listings are currently live?

>  https://apps.apple.com/us/app/domani-daily-planner/id6755746985

Which localized Google Play listings are currently live?

>https://play.google.com/store/apps/details?id=com.baitedz.domaniapp

Which localized screenshot sets are currently live on iOS?

> The same screenshots are live on both. you can find them in the store links, or remind me to follow up with them after this is processed

Which localized screenshot sets are currently live on Android?

> Same as above

Do you agree that localization is not a blocker for the first US-English campaign?

> Agree

## 13. Creative and Brand Constraints

Do you approve the current campaign guardrails?

- No fear, shame, or aggressive productivity pressure
- No mental-health diagnosis or sensitive personal-attribute claims
- No guaranteed productivity or therapeutic outcomes
- No fake testimonials or manufactured social proof
- Transparent trial and offer terms
- Minimal advertising-data collection

> Agree

Are there any additional tones, claims, visual styles, or tactics that should never be used?

> Add your answer here.

Are there brands, advertisements, creators, or visual styles that feel directionally right for Domani?

> Add your answer here.

Are there examples that feel wrong for Domani?

> Add your answer here.

## 14. Pre-Launch Readiness

Who will own Meta account setup and campaign management?

> Sami and i will split the responsibilities

Who will produce or appear in UGC-style creative?

> idk what this is

Who will review campaign performance during the test?

> Sami and i

How frequently can campaign results realistically be reviewed?

> Pretty frequently. definitely 2+ times a week

Is there a target launch date or launch window?

> Add your answer here.

Are there product releases, store updates, promotions, or operational constraints that affect the launch date?

> Add your answer here.

## Final Confirmation

What is the most important unresolved concern you want addressed before Domani spends money on Meta advertising?

> Add your answer here.

Is there anything else about the business, product, audience, offer, budget, or brand that should influence the campaign plan?

> Add your answer here.
