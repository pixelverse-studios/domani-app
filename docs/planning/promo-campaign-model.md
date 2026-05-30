# Promo Campaign Model And Store Configuration Strategy

> Linear: DEV-846
> Status: Approved implementation model for the 1.1.0 promo-code work
> Last reviewed: 2026-05-19

## Decision Summary

Domani promo codes are eligibility gates, not entitlement grants.

The app may validate a Domani-controlled code, reserve or audit a redemption attempt, and route the user to the right store-backed flow. Lifetime access is granted only after Apple or Google completes a transaction or redemption, RevenueCat recognizes the receipt, and Supabase syncs from RevenueCat.

Initial 1.1.0 campaigns:

| Campaign | User-facing result | Store-backed mechanism | RevenueCat result |
| --- | --- | --- | --- |
| Free lifetime | $0 lifetime access | iOS App Store offer code for the lifetime non-consumable; Android Play promo code for the lifetime one-time product | Active lifetime entitlement |
| 50% off lifetime | Discounted lifetime purchase | Separate discounted lifetime one-time product exposed through a promo-specific RevenueCat offering/package | Active lifetime entitlement after purchase |

Future discount and fixed-price campaigns are added by creating store products or platform offers, mapping them in RevenueCat, and adding Supabase campaign rows. App code should route from campaign metadata and must not hard-code promo code values or discount levels.

## Current Product Baseline

Domani is currently lifetime-first:

- Standard lifetime product ID in code: `domani_lifetime`
- Existing RevenueCat offering identifiers in code:
  - `general`
  - `early_adopter`
  - `friends_family`
- Entitlement IDs are environment-specific:
  - staging/internal: `Domani Staging Lifetime`
  - production: `Domani Lifetime`
- Supabase `profiles.tier = 'lifetime'` is written after RevenueCat confirmation, not directly from a client-entered promo code.
- The RevenueCat webhook currently recognizes these lifetime product IDs:
  - `domani_lifetime`
  - `domani_lifetime_early`
  - `domani_lifetime_friends`

Any discounted lifetime product added for promo campaigns must be mapped to the same RevenueCat lifetime entitlement and added to backend lifetime-product allowlists before launch.

## Supported Campaign Types

### `free_lifetime`

Purpose: Give lifetime access at no charge while still producing a legitimate Apple or Google transaction/receipt.

Required metadata:

- `campaign_type = 'free_lifetime'`
- `discount_kind = 'free'`
- `target_entitlement_id`
- iOS App Store offer identifier and code batch metadata
- Android Play promotion identifier and code batch metadata
- fallback redemption URL templates for each platform
- start/end timestamps and redemption limits

### `percent_discount_lifetime`

Purpose: Sell lifetime access at a percentage discount such as 50%, 30%, or 20%.

Required metadata:

- `campaign_type = 'percent_discount_lifetime'`
- `discount_kind = 'percent'`
- `discount_percent`, for example `50`
- platform product IDs
- RevenueCat offering identifier
- RevenueCat package identifier
- target entitlement ID
- start/end timestamps and redemption limits

Default 1.1.0 decision: use a separate discounted lifetime non-consumable product per durable price point, surfaced through a campaign-specific RevenueCat offering. This keeps Domani code validation separate from purchase authority while preserving a predictable native purchase sheet.

### `fixed_price_lifetime`

Purpose: Sell lifetime access for a fixed price such as `$14.99`, even when that does not cleanly map to a percentage.

Required metadata:

- `campaign_type = 'fixed_price_lifetime'`
- `discount_kind = 'fixed_price'`
- `price_amount`
- `price_currency`
- platform product IDs
- RevenueCat offering identifier
- RevenueCat package identifier
- target entitlement ID
- start/end timestamps and redemption limits

Default decision: same implementation path as percentage discounts. Create one store product per fixed price point, attach it to the lifetime entitlement in RevenueCat, and route eligible users to the matching RevenueCat offering/package.

## Store-Backed Flow Decisions

### Free Lifetime On iOS

Use App Store offer codes for Domani's non-consumable lifetime IAP.

Required path:

1. User enters a Domani promo code in the app.
2. Supabase validates the code, campaign, platform, availability window, and redemption eligibility.
3. App opens the native iOS offer-code redemption sheet in-app.
4. User enters or confirms the Apple offer code through Apple-owned UI.
5. StoreKit emits a successful transaction for the lifetime non-consumable.
6. RevenueCat receives the transaction and activates the lifetime entitlement.
7. App refreshes `Purchases.getCustomerInfo()`.
8. App syncs the active entitlement to Supabase; RevenueCat webhook remains the authoritative backstop.

Required IDs:

- Apple non-consumable product ID: `domani_lifetime`
- App Store offer identifier: `domani_lifetime_free_<campaign_slug>`
- RevenueCat entitlement: environment-specific lifetime entitlement
- Supabase campaign slug: `lifetime_free_<campaign_slug>`

Fallback:

- If the native redemption sheet is unavailable, unsupported, or fails before store confirmation, open the App Store offer-code redemption URL for the same Apple-generated offer code.
- The fallback still must complete through Apple and RevenueCat before access changes.

Platform note:

Apple's current StoreKit documentation says offer codes are available for all in-app purchase types, including non-consumables, with non-consumable support starting on iOS 16.3. Domani should require iOS 16.3+ for native free-lifetime redemption and use the external App Store redemption URL as the fallback for unsupported OS versions.

### Free Lifetime On Android

Use Google Play promo codes for the lifetime one-time product.

Required path:

1. User enters a Domani promo code in the app.
2. Supabase validates the code, campaign, platform, availability window, and redemption eligibility.
3. App starts Google Play's in-app promotion redemption flow for the mapped one-time product where supported.
4. User completes Google-owned promo redemption UI.
5. Google Play records the purchase/redemption for the lifetime one-time product.
6. RevenueCat receives the purchase and activates the lifetime entitlement.
7. App refreshes customer info and syncs Supabase from RevenueCat.

Required IDs:

- Google one-time product ID: `domani_lifetime`
- Play promotion name: `domani_lifetime_free_<campaign_slug>`
- RevenueCat entitlement: environment-specific lifetime entitlement
- Supabase campaign slug: `lifetime_free_<campaign_slug>`

Fallback:

- If native in-app redemption is unavailable, open the Google Play redemption path for the generated Play promo code.
- The fallback still must complete through Google Play and RevenueCat before access changes.

Platform note:

Google Play supports promo codes for one-time products, but non-subscription promo codes have lower quarterly limits than subscription promo codes. Operations must size code batches around the current Play Console limits.

### 50% Off Lifetime On iOS

Use a separate discounted non-consumable lifetime product, not database-only discounting.

Required path:

1. User enters a Domani promo code in the app.
2. Supabase validates eligibility and returns the promo campaign purchase mapping.
3. App fetches the campaign RevenueCat offering.
4. App presents Domani's existing in-app purchase UX for the discounted package.
5. Apple shows the native purchase confirmation sheet for the discounted product.
6. RevenueCat activates the lifetime entitlement after purchase.
7. Supabase syncs from RevenueCat customer info and webhook events.

Required IDs for 1.1.0:

- Apple product ID: `domani_lifetime_50`
- RevenueCat offering ID: `promo_lifetime_50`
- RevenueCat package ID: `lifetime_50`
- RevenueCat entitlement: environment-specific lifetime entitlement
- Supabase campaign slug: `lifetime_50_off_110`

Fallback:

- If the campaign-specific offering cannot be fetched, show a platform-unavailable error and optionally route to support.
- Do not grant access or fall back to a standard-price purchase unless the user explicitly chooses the standard offer.

### 50% Off Lifetime On Android

Preferred 1.1.0 path: use a separate discounted lifetime one-time product exposed through RevenueCat, matching iOS.

Required path:

1. User enters a Domani promo code in the app.
2. Supabase validates eligibility and returns the campaign purchase mapping.
3. App fetches the campaign RevenueCat offering/package.
4. App launches the native Google Play purchase confirmation sheet for the discounted product.
5. RevenueCat activates the lifetime entitlement after purchase.
6. Supabase syncs from RevenueCat customer info and webhook events.

Required IDs for 1.1.0:

- Google product ID: `domani_lifetime_50`
- RevenueCat offering ID: `promo_lifetime_50`
- RevenueCat package ID: `lifetime_50`
- RevenueCat entitlement: environment-specific lifetime entitlement
- Supabase campaign slug: `lifetime_50_off_110`

Future option:

Google Play now supports discount offers for one-time products through modern Play Billing APIs. Domani can adopt those later if RevenueCat exposes the needed offer selection cleanly for React Native. Until verified end to end, separate discounted lifetime products are the cross-platform default because they keep RevenueCat package routing simple and mirror the existing lifetime purchase implementation.

## Naming Conventions

Use names that encode product, discount, and campaign without embedding secret code values.

### Supabase Campaigns

Pattern:

```text
<product>_<discount>_<campaign>
```

Examples:

- `lifetime_free_launch_reviewers`
- `lifetime_50_off_110`
- `lifetime_30_off_black_friday_2026`
- `lifetime_1499_partner_xyz`

### Supabase Code Batches

Pattern:

```text
<campaign_slug>_<platform>_<batch_number>
```

Examples:

- `lifetime_free_launch_reviewers_ios_001`
- `lifetime_free_launch_reviewers_android_001`
- `lifetime_50_off_110_all_001`

### Apple Products And Offer Codes

Products:

- Standard lifetime: `domani_lifetime`
- Discounted products: `domani_lifetime_<price_or_discount>`
- 50% off 1.1.0 product: `domani_lifetime_50`

Offer identifiers:

- Free lifetime: `domani_lifetime_free_<campaign_slug>`

Apple-generated one-time-use offer codes should not be stored in app code. Store hashed or encrypted operational references in Supabase only if needed for assignment, support, and audit.

### Google Products And Promotions

Products:

- Standard lifetime: `domani_lifetime`
- Discounted products: `domani_lifetime_<price_or_discount>`
- 50% off 1.1.0 product: `domani_lifetime_50`

Promotion names:

- Free lifetime: `domani_lifetime_free_<campaign_slug>`

Google-generated one-time-use promo codes should not be stored in app code. Store hashed or encrypted operational references in Supabase only if needed for assignment, support, and audit.

### RevenueCat

Offerings:

- Existing baseline:
  - `general`
  - `early_adopter`
  - `friends_family`
- Promo campaigns:
  - `promo_lifetime_free_<campaign_slug>` only if RevenueCat needs an explicit merchandising surface
  - `promo_lifetime_50`
  - `promo_lifetime_30`
  - `promo_lifetime_1499`

Packages:

- `lifetime`
- `lifetime_50`
- `lifetime_30`
- `lifetime_1499`

Entitlements:

- Keep using the existing environment-specific lifetime entitlement IDs.
- Attach every lifetime promo product to the same lifetime entitlement.

## Supabase Campaign Record Shape

The implementation should use structured campaign metadata rather than app hard-coding.

Minimum table shape:

```sql
create type promo_campaign_type as enum (
  'free_lifetime',
  'percent_discount_lifetime',
  'fixed_price_lifetime'
);

create type promo_discount_kind as enum (
  'free',
  'percent',
  'fixed_price'
);

create table public.promo_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  campaign_type promo_campaign_type not null,
  discount_kind promo_discount_kind not null,
  discount_percent integer,
  price_amount numeric(10, 2),
  price_currency text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  max_redemptions integer,
  max_redemptions_per_user integer not null default 1,
  revenuecat_entitlement_id text not null,
  ios_product_id text,
  android_product_id text,
  ios_offer_identifier text,
  android_promotion_id text,
  revenuecat_offering_id text,
  revenuecat_package_id text,
  ios_fallback_url_template text,
  android_fallback_url_template text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Codes and redemption attempts should be separate tables:

- `promo_codes`: hashed normalized code, campaign ID, batch ID, status, usage limits, assigned user if applicable.
- `promo_redemption_attempts`: user ID, code ID, campaign ID, platform, status, RevenueCat app user ID, store product ID, store transaction ID when known, error reason, timestamps.

Do not store plaintext reusable public codes unless the operational need is explicit. Normalize and hash entered codes for lookup; keep display names and campaign labels separate from secrets.

## App Routing Contract

Promo validation should return a routing payload, not entitlement access:

```ts
type PromoValidationResult =
  | {
      status: 'eligible'
      campaignSlug: string
      campaignType: 'free_lifetime' | 'percent_discount_lifetime' | 'fixed_price_lifetime'
      storeAction: 'ios_offer_code_sheet' | 'android_promo_code_flow' | 'revenuecat_purchase_package'
      revenueCatOfferingId?: string
      revenueCatPackageId?: string
      iosProductId?: string
      androidProductId?: string
      fallbackUrl?: string
    }
  | {
      status:
        | 'invalid'
        | 'expired'
        | 'already_redeemed'
        | 'campaign_inactive'
        | 'platform_unavailable'
        | 'not_eligible'
      messageKey: string
    }
```

The app then performs the store action and refreshes RevenueCat customer info. A successful validation response must never directly set local lifetime state.

## Post-Confirmation Sync

After any free redemption or discounted purchase:

1. Call `Purchases.getCustomerInfo()` or use the `purchasePackage` result.
2. Confirm the active lifetime entitlement is present.
3. Call the existing Supabase sync path to update `profiles.tier`, `purchased_at`, and RevenueCat identity fields.
4. Let the RevenueCat webhook process the same event idempotently as the authoritative server-side backstop.
5. Mark the promo redemption attempt as `confirmed` only after RevenueCat entitlement confirmation.

For abandoned flows:

- Keep validation/reservation attempts time-bound.
- Release unconfirmed single-use Domani code reservations after a short timeout if no RevenueCat entitlement appears.
- Do not mark a code as consumed permanently until store-backed confirmation is observed, unless the underlying Apple/Google code was already irreversibly redeemed.

## Platform Constraints And Operational Requirements

### Apple

- Offer codes are configured in App Store Connect.
- Offer codes can be redeemed in-app through StoreKit APIs or through App Store redemption URLs.
- Non-consumable offer-code support requires iOS 16.3+.
- Free lifetime should use App Store offer codes for `domani_lifetime`.
- Discounted lifetime should use separate discounted products for 1.1.0.
- RevenueCat must be configured with App Store Connect and In-App Purchase keys so StoreKit 2 transactions are processed correctly.

### Google Play

- Promo codes can provide a free one-time product or subscription.
- One-time-use promo codes can be redeemed in Google Play or in-app.
- Custom promo codes are subscription-only, so they are not the default for Domani lifetime one-time products.
- Non-subscription promo codes have quarterly limits that are much lower than subscription promo-code limits.
- Discounted lifetime should use separate one-time products for 1.1.0 unless RevenueCat + Play one-time-product discount offers are verified end to end first.

### RevenueCat

- All promo lifetime products must attach to the same lifetime entitlement.
- Campaign-specific offerings should be fetched by identifier from Supabase campaign metadata.
- App code should not need a release when a new campaign reuses an already-supported `storeAction`.
- The webhook lifetime-product allowlist must include every discounted product that should grant lifetime access.

## Implementation Ticket Breakdown

The following tickets can proceed without re-deciding the product model.

1. Supabase campaign schema and validation API
   - Add `promo_campaigns`, `promo_codes`, and `promo_redemption_attempts`.
   - Add an authenticated validation endpoint or RPC.
   - Return a routing payload and never update `profiles.tier` from validation alone.

2. RevenueCat and store configuration
   - Add `domani_lifetime_50` in Apple and Google.
   - Attach `domani_lifetime_50` to the lifetime entitlement in RevenueCat.
   - Add RevenueCat offering `promo_lifetime_50` with package `lifetime_50`.
   - Create App Store free-lifetime offer-code campaigns for `domani_lifetime`.
   - Create Google Play free-lifetime promo-code promotions for `domani_lifetime`.

3. App promo-code entry UX
   - Add code entry on paywall and Settings.
   - Validate code through Supabase.
   - Route free codes to native redemption flows.
   - Route discounted codes to campaign-specific RevenueCat purchase packages.
   - Show explicit invalid, expired, already-used, abandoned, and platform-unavailable states.

4. RevenueCat sync hardening
   - Add discounted lifetime product IDs to webhook allowlists.
   - Ensure app-side sync and webhook processing are idempotent.
   - Record transaction IDs and product IDs against redemption attempts when available.

5. QA and observability
   - Add analytics for validate, eligible, store-sheet-opened, purchase-started, confirmed, abandoned, and failed states.
   - Test on real iOS and Android devices with sandbox/store-backed flows.
   - Verify RevenueCat entitlement activation and Supabase profile updates after each flow.

## Source References

- Apple StoreKit: [Supporting offer codes in your app](https://developer.apple.com/documentation/storekit/supporting-subscription-offer-codes-in-your-app)
- Google Play Console Help: [Create promotions](https://support.google.com/googleplay/android-developer/answer/6321495)
- Android Developers: [Multiple purchase options and offers for one-time products](https://developer.android.com/google/play/billing/one-time-product-multi-purchase-options-offers)
- RevenueCat: [Supporting offers](https://www.revenuecat.com/docs/tools/paywalls/creating-paywalls/supporting-offers)
