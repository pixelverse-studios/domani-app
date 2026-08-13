# Domani Meta Ads Campaign Plan

**Status:** Draft for final review

**Target launch:** August 11, 2026

**Initial market:** United States, iOS

**Owners:** Phil and Sami

**Last updated:** August 4, 2026

## How to Use This Plan

This document contains the campaign decisions Phil and Sami need for approval and launch. Supporting details are kept in three working documents:

- [Creative brief](./meta-ads-creative-brief.md)
- [Measurement plan](./meta-ads-measurement-plan.md)
- [Launch checklist](./meta-ads-launch-checklist.md)

The campaign should not launch until every item marked `Launch blocker` in the checklist is complete.

## Executive Summary

| Decision | Plan |
| --- | --- |
| Business goal | Learn whether Meta can bring Domani users who start a trial, create a real task, and return to the app |
| Stage 1 purpose | Generate directional conversion and activation signals; it is not expected to prove profitability |
| Campaign | One Meta App Promotion campaign |
| Ad set | One broad US iOS ad set |
| Launch optimization | App installs |
| Placements | Advantage+ placements, using the correct asset for each placement |
| Audience | US, English, ages 25-54, all genders, no interest targeting |
| Stage 1 budget | $20 per day for 10 days, up to $200 |
| Conditional reserve | Up to $100 for five additional days if the continuation rules are met |
| Initial ads | One video concept and two screenshot-led concepts |
| Offer | 14-day free trial, then $9.99 lifetime access during the early-adopter period |
| Target launch | August 11, 2026, subject to launch readiness |
| Review cadence | Phil and Sami check delivery daily and review results together at least twice per week |

## 1. Product and Offer

Domani is a daily-planning app built around one simple habit:

> Plan tomorrow tonight, then start the next day knowing what matters.

Current offer:

- 14-day free trial with no payment method required upfront
- $9.99 early-adopter lifetime purchase
- Available to eligible new and existing users who have not purchased lifetime access
- No subscription
- No continuing free plan after the trial
- Planned standard lifetime price of $34.99 after the early-adopter period

Approved campaign wording:

> Early-adopter lifetime price: $9.99. One payment. No subscription.

The early-adopter offer ends after 200 lifetime purchases or on a date approved by Phil and Sami, whichever happens first. The $34.99 price is planned but has not been Domani's established selling price, so ads must not present it as a former price or use a crossed-out-price treatment.

Phil and Sami will monitor the purchase count together. Before launch, they still need to choose the authoritative purchase-count report, alert points, and price-change procedure.

## 2. Audience and Message

### Initial Customer

The creative is written for a working adult who balances professional and personal responsibilities, starts mornings reactively, and has stopped using productivity tools that require too much upkeep.

This persona guides the message. It is not a narrow Meta targeting profile.

### Lead Message

The campaign will lead with a familiar problem: starting the morning without a clear plan and spending energy deciding what to do first.

Domani's answer is straightforward:

> Decide what matters the night before. Wake up with a plan.

The no-subscription offer supports the product message; it should not replace it.

### Message Priorities

1. Plan tomorrow while the day is quiet.
2. Wake up knowing what matters.
3. Use a focused planning habit instead of maintaining a complicated productivity system.
4. Try the full app for 14 days, then pay once if it works for you.

## 3. Campaign Structure

### Campaign

| Setting | Decision |
| --- | --- |
| Objective | App Promotion |
| Platform | iOS |
| Market | United States |
| Budget control | Ad-set daily budget |
| Stage 1 budget | $20 per day |
| Schedule | August 11-20, 2026 |
| Bid strategy | Highest volume / lowest cost available in the selected App Promotion setup |
| Initial optimization | App installs |

Install optimization is the practical starting point because Domani does not yet have enough Meta-reported trial events for stable downstream optimization. Stage 1 will still be judged on qualified trials and planning activation, not installs alone.

Do not change the optimization event during Stage 1. Changing it would restart delivery learning and make the small test harder to interpret.

Trial-event optimization may be tested in Stage 2 only after:

- Meta is receiving the verified `trial_started` event reliably;
- the event is available as an optimization choice;
- event volume is high enough for Meta to deliver consistently; and
- Phil and Sami approve the change before the Stage 2 budget is released.

### Ad Set

| Setting | Decision |
| --- | --- |
| Number of ad sets | One |
| Geography | United States |
| Language | English |
| Age | 25-54 |
| Gender | All |
| Interests | None; keep targeting broad |
| Placements | Advantage+ placements |
| Existing-user exclusion | Exclude known lifetime purchasers when technically reliable; do not delay launch solely for this exclusion |
| Destination | Domani's US App Store product page |

One ad set keeps the limited budget concentrated. Do not split Stage 1 by age, gender, interest, placement, or region.

### Ads

Stage 1 will launch with three ads:

1. **Morning clarity video:** the existing video, with its 9:16, 4:5, and 1:1 layouts assigned to the placements they fit.
2. **Evening habit static:** a screenshot-led ad showing how Domani helps someone plan the next day in a few focused steps.
3. **Pay once/product proof:** a screenshot-led static or carousel that shows the app first and supports it with the 14-day trial and $9.99 lifetime offer.

The three layouts of the existing video count as placement versions of one concept, not three different ads. Production requirements and message direction are in the [creative brief](./meta-ads-creative-brief.md).

Meta may distribute spend unevenly across the ads. Stage 1 is therefore a directional creative test, not a controlled split test.

### Naming

Use names that can be read without opening the setup:

```text
Campaign: 2026-08_US_iOS_AppPromotion_Stage1
Ad set: US_25-54_Broad_Install_20USD
Ads:
  A_MorningClarity_Video
  B_EveningHabit_Static
  C_ProductProof_Offer
```

## 4. Budget and Decision Rules

### Stage 1: Directional Signal Test

- Run August 11-20 at $20 per day.
- Spend no more than $200 without a joint decision from Phil and Sami.
- Check delivery, spend, links, comments, and event receipt daily.
- Avoid major edits during the first three full days unless there is a technical, policy, billing, or message problem.

Stage 1 targets are working decision rules, not industry benchmarks:

| Metric | Minimum signal | Encouraging signal |
| --- | ---: | ---: |
| Cost per install | $9 or less | $6 or less |
| Install-to-qualified-trial rate | 40% | 50% or more |
| Qualified trials from $200 | 12 | 20 or more |
| Trial-to-planning-activation rate | 50% | 60% or more |
| Cost per activated user | $25 or less | $15 or less |
| Day 1 product retention | 20% | 30% or more |
| Day 7 product retention | 15% | 25% or more |

A qualified trial is a new user in the paid-acquisition cohort who installs Domani, signs in, and successfully starts the 14-day trial. An activated user is a qualified trial user who creates a genuine, non-tutorial task for today or tomorrow.

### Immediate Pause Rules

Pause the affected ad or campaign immediately if:

- the App Store link or app experience is broken;
- spend is running materially above the approved daily budget;
- Meta or PostHog events are missing, duplicated, or clearly incorrect;
- an ad is rejected or creates a policy concern;
- the offer or price shown in the ad no longer matches the app;
- comments reveal a repeated, material misunderstanding of the offer; or
- a creative spends $40 without producing an install, unless Phil and Sami explicitly agree to keep observing it.

### Conditional $100 Reserve

Phil and Sami may release the $100 reserve for up to five more days at $20 per day when all of the following are true:

- at least seven full campaign days or $140 in spend have elapsed;
- tracking is working well enough to read the funnel;
- at least eight qualified trials have been recorded;
- at least 50% of those users have activated, or cost per activated user is $25 or less;
- Day 1 product retention is at least 20% among users whose Day 1 window has matured; and
- no unresolved billing, store, policy, privacy, or offer issue remains.

If the campaign narrowly misses one rule but shows a clear positive pattern, Phil and Sami may still release the reserve. The reason should be written in the launch checklist before additional spend begins.

### Stage 2: Funnel Validation

Stage 2 remains provisional:

- Additional budget: $500-$700
- Duration: 14-21 days
- Requires joint approval from Phil and Sami
- Keep the account structure simple
- Pause clearly weak creative and produce variations of the strongest message
- Continue measuring activation, retention, and purchase progression

Stage 2 should proceed only if Stage 1 produces at least 12 qualified trials, at least six activated users, a trial-to-activation rate of at least 50%, and no major measurement or store-conversion problem. Day 1 product retention should be at least 20% among users whose Day 1 window has matured.

Stage 1 is too small to prove purchase profitability. Purchase results should still be recorded and followed through the complete evaluation window.

## 5. Measurement and Evaluation

### Primary Stage 1 Decision Metric

The primary Stage 1 metric is **cost per activated user**.

Supporting metrics are:

- Cost per install
- Install-to-qualified-trial rate
- Trial-to-planning-activation rate
- Day 1, Day 7, and Day 14 general and product retention
- Trial-to-lifetime-purchase rate
- Purchase CAC
- Gross and net return on ad spend

The exact event definitions, attribution windows, and retention windows are in the [measurement plan](./meta-ads-measurement-plan.md).

### Purchase Economics

Until the store fee is confirmed, the plan assumes approximately $8.49 in proceeds from a $9.99 purchase after a 15% store fee.

| Purchase CAC | Interpretation |
| ---: | --- |
| $4 or less | Strong enough to consider careful scaling |
| $4.01-$6 | Potentially workable before other variable costs |
| $6.01-$8.49 | Little room for refunds or other costs |
| Above $8.49 | Media cost exceeds estimated store proceeds |

These numbers must be recalculated using actual fees, taxes, refunds, and conversion data. Gross ROAS and net-proceeds ROAS must be reported separately.

The acceptable cost per trial depends on trial-to-purchase conversion. At a $6 purchase CAC:

| Trial-to-purchase rate | Maximum cost per trial |
| ---: | ---: |
| 10% | $0.60 |
| 20% | $1.20 |
| 30% | $1.80 |

This table is an economics check, not a Stage 1 performance requirement.

## 6. App Store Alignment

The App Store page must continue the promise made by the ads. Before launch, Phil and Sami will compare the live listing with the three ad concepts and complete the [store-alignment checklist](./meta-ads-creative-brief.md#app-store-alignment-checklist).

The minimum standard is:

- The first screenshot communicates evening planning or waking up with a clear plan.
- The first three screenshots show the planning flow, the most important task, and the morning outcome.
- The visible interface matches the current app.
- The description accurately explains the 14-day trial, $9.99 lifetime price, and no-subscription model.
- The listing does not present $34.99 as a former selling price.
- The app opens, sign-in works, the trial starts correctly, and the in-app price matches the ad.

Custom Product Pages can be considered after Stage 1. The first test does not need separate store pages for each concept; it needs one clear page that supports all three.

## 7. Brand, Privacy, and Offer Rules

- Do not use fear, shame, or aggressive productivity pressure.
- Do not diagnose viewers or imply knowledge of a sensitive personal condition.
- Do not promise guaranteed productivity or mental-health outcomes.
- Do not use fake testimonials or manufactured social proof.
- Explain the trial, promotional price, and lifetime offer plainly.
- Do not send task titles, task notes, email content, or other user-created planning content to Meta or an attribution provider.
- Collect only the event and attribution data needed to measure the campaign.
- Do not divide Stage 1 across multiple countries or platforms.

## 8. Ownership and Review Rhythm

Phil and Sami jointly own campaign approval, spend, monitoring, creative, measurement, store alignment, offer operations, and final decisions.

During Stage 1 they will:

- check spend, delivery, links, event receipt, and comments every day;
- review the full funnel together at least twice per week;
- record reserve, pause, or Stage 2 decisions in the launch checklist; and
- avoid judging purchase conversion until the relevant cohort has completed its purchase window.

## 9. Open Decisions

The remaining decisions are tracked in the [launch checklist](./meta-ads-launch-checklist.md). The most important open items are:

- Final early-adopter calendar end date
- Authoritative source and alert process for the 200-purchase limit
- Direct Meta app-event and iOS attribution implementation
- ATT, privacy policy, and App Store privacy review
- Live App Store message and screenshot approval
- Final creative files and ad copy
- Billing, app registration, and event QA

Once every launch blocker is complete, Phil and Sami can change the status of this document to `Approved for launch`.
