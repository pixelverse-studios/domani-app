# Promo Campaign Operations Guide

> Linear: DEV-855
> Last reviewed: 2026-05-24

This guide is the operating checklist for creating, testing, launching, and
supporting Domani promo code campaigns.

Use it with the implementation model in
[`docs/planning/promo-campaign-model.md`](../planning/promo-campaign-model.md).
That model remains the source of truth for the product decision: a Domani promo
code is an eligibility gate, not an entitlement grant. Lifetime access changes
only after Apple or Google completes a transaction, RevenueCat activates the
lifetime entitlement, and Supabase syncs from RevenueCat.

## Operating Rules

- Do not put raw promo codes in app code, committed docs, Linear tickets, or
  support logs.
- Store only normalized hashes in `promo_codes.code_hash`; use
  `code_lookup_hint` for non-secret support lookup.
- Create store and RevenueCat objects before activating Supabase campaign rows.
- Keep new campaigns inactive in Supabase until staging verification passes.
- Treat staging and production as separate setups. Entitlement IDs, store
  products, RevenueCat products, and Supabase rows must be checked per
  environment.
- Discounted campaigns require store-backed products or offers. Do not create a
  database-only discount and expect Apple, Google, or RevenueCat to honor it.

## System Map

1. Apple App Store Connect or Google Play Console owns the purchasable product,
   free offer code, or promo code.
2. RevenueCat maps the platform products to the Domani lifetime entitlement and,
   for discounted campaigns, exposes the product through a campaign offering and
   package.
3. Supabase stores campaign metadata, hashed codes, eligibility limits, platform
   routing, and validation attempts.
4. The app validates a Domani code through Supabase and routes the user to the
   platform-backed flow returned by the validation payload.
5. RevenueCat confirms the store transaction and activates the entitlement.
6. The app and webhook sync the RevenueCat result back to Supabase profile state.

## Campaign Type Decision Table

| Campaign type | User result | Required store setup | Required RevenueCat setup | Supabase setup |
| --- | --- | --- | --- | --- |
| `free_lifetime` | Free lifetime access | Apple offer codes for `domani_lifetime`; Google Play promo codes for the lifetime one-time product | Standard lifetime product mapped to the environment lifetime entitlement | `promo_campaigns` row with `discount_kind = 'free'`, platform strategies, fallback URL templates, and hashed code rows |
| `percent_discount_lifetime` | Lifetime purchase at a percent discount | Separate discounted Apple and Google one-time product for the durable price point unless a platform offer has already been verified end to end | Campaign offering and package pointing at the discounted products; products attached to lifetime entitlement | Campaign row with `discount_percent`, product IDs, offering/package IDs, and hashed code rows |
| `fixed_price_lifetime` | Lifetime purchase at a fixed price | Separate fixed-price Apple and Google one-time product for the durable price point unless a platform offer has already been verified end to end | Campaign offering and package pointing at the fixed-price products; products attached to lifetime entitlement | Campaign row with `price_amount`, `price_currency`, product IDs, offering/package IDs, and hashed code rows |

## Store Change Versus Supabase Metadata Only

Requires a store and RevenueCat setup change:

- a new user-visible price point
- a new discounted lifetime product ID
- a new Apple offer-code offer or Google Play promotion
- changing from free to paid, paid to free, percent discount to fixed price, or
  fixed price to percent discount
- enabling a platform that was not already configured for that campaign
- any product that should grant lifetime access but is not yet mapped to the
  RevenueCat lifetime entitlement
- any new lifetime product ID that the backend webhook does not recognize as a
  lifetime purchase

Can usually be Supabase metadata only after the store and RevenueCat objects
already exist:

- display name, display label, and description changes
- start and end timestamps
- `is_active` toggles
- campaign-level or code-level redemption limits
- adding more hashed code rows for an existing store promotion or existing
  discounted product
- fallback URL template corrections that point to the same platform campaign
- support metadata that does not contain raw codes

If the change affects what Apple, Google, or RevenueCat sells or grants, it is
not Supabase-only.

## Apple Setup

### Free Lifetime Campaigns

Use Apple offer codes for the lifetime non-consumable product. Apple supports
offer codes for all in-app purchase types through StoreKit, with
non-consumables available on iOS 16.3 and later.

1. In App Store Connect, confirm the lifetime non-consumable product exists and
   is approved or otherwise available for the intended environment.
   - Standard production product ID: `domani_lifetime`
   - Discounted products should follow `domani_lifetime_<price_or_discount>`.
2. Create the offer code configuration for the campaign in App Store Connect.
   Use a reference name that matches the Supabase campaign slug when possible.
3. Generate sandbox codes first for staging verification.
4. Generate production one-time-use or custom codes only after staging passes.
5. Capture the operational IDs:
   - Apple product ID
   - Apple offer identifier or reference name
   - code batch label
   - redemption URL format, if using fallback URLs
6. Do not commit the generated codes. Normalize and hash codes before they enter
   Supabase.

Supabase mapping for a free iOS campaign:

- `ios_is_available = true`
- `ios_product_id = 'domani_lifetime'`
- `ios_offer_identifier = '<apple_offer_identifier>'`
- `ios_redemption_strategy = 'offer_code_sheet'`
- `payment_required = false`

### Discounted Lifetime Campaigns

For the 1.1.x implementation, use separate discounted non-consumable lifetime
products rather than database-only discounting.

1. Create the discounted in-app purchase in App Store Connect.
2. Use a durable product ID, for example `domani_lifetime_50` or
   `domani_lifetime_1499`.
3. Confirm the product price, territory availability, review status, and
   product ID before adding it to RevenueCat.
4. Add the product to RevenueCat and attach it to the environment lifetime
   entitlement.
5. Expose it through the campaign RevenueCat offering/package returned by
   Supabase.

Supabase mapping for a discounted iOS campaign:

- `ios_is_available = true`
- `ios_product_id = '<discounted_apple_product_id>'`
- `ios_redemption_strategy = 'revenuecat_purchase_package'`
- `revenuecat_offering_id = '<campaign_offering_id>'`
- `revenuecat_package_id = '<campaign_package_id>'`
- `payment_required = true`

## Google Play Setup

### Free Lifetime Campaigns

Use Google Play promo codes for the lifetime one-time product. Google Play
supports promo codes for paid apps, one-time products, and subscriptions. For
non-subscription promotions, the current Play Console limit is 500 codes per
quarter across paid app and one-time product promotions for the app.

1. In Play Console, confirm the lifetime one-time product exists and is active.
   Promo codes cannot be created for inactive products.
2. Go to `Monetize with Play` -> `Promo codes`.
3. Create a promo code promotion for the lifetime one-time product.
4. Choose the promotion name, start date, end date, promotion type, and number
   of codes.
5. Turn the promotion on only when the campaign is ready.
6. Download the generated code CSV and keep it in private operations storage.
7. Normalize and hash codes before inserting them into Supabase.

Supabase mapping for a free Android campaign:

- `android_is_available = true`
- `android_product_id = 'domani_lifetime'`
- `android_promotion_id = '<play_promotion_id_or_name>'`
- `android_redemption_strategy = 'play_promo_code_flow'`
- `payment_required = false`

### Discounted Lifetime Campaigns

For 1.1.x, use separate discounted one-time products and route them through
RevenueCat packages. Do not rely on a Supabase-only discount.

1. Create or confirm the discounted one-time product in Play Console.
2. Use a durable product ID, for example `domani_lifetime_50` or
   `domani_lifetime_1499`.
3. Confirm the active buy option, price, availability, and testing track access.
4. Add the product to RevenueCat and attach it to the environment lifetime
   entitlement.
5. Expose it through the campaign RevenueCat offering/package returned by
   Supabase.

Supabase mapping for a discounted Android campaign:

- `android_is_available = true`
- `android_product_id = '<discounted_google_product_id>'`
- `android_redemption_strategy = 'revenuecat_purchase_package'`
- `revenuecat_offering_id = '<campaign_offering_id>'`
- `revenuecat_package_id = '<campaign_package_id>'`
- `payment_required = true`

## RevenueCat Setup

RevenueCat products are the platform SKUs users purchase. Entitlements are the
access levels Domani enforces. Offerings organize products and packages for the
app to display or purchase.

1. Confirm the environment lifetime entitlement:
   - staging/internal: `Domani Staging Lifetime`
   - production: `Domani Lifetime`
2. Add every Apple and Google promo product to the RevenueCat product catalog.
3. Attach every lifetime promo product to the lifetime entitlement for that
   environment.
4. For discounted or fixed-price campaigns, create a campaign offering such as
   `promo_lifetime_50`.
5. Add the campaign package such as `lifetime_50` or `lifetime_1499`.
6. Verify that the offering identifier and package identifier exactly match the
   Supabase campaign row.
7. For any new lifetime product ID, update backend lifetime-product allowlists
   before launch so the RevenueCat webhook treats the product as lifetime.
8. In staging, complete a test redemption or purchase and verify
   `Purchases.getCustomerInfo()` reports the active lifetime entitlement.

## Supabase Setup

Create campaign and code rows after the store and RevenueCat objects exist.
Keep `is_active = false` until verification passes.

### Free Lifetime Campaign Template

```sql
insert into public.promo_campaigns (
  slug,
  campaign_type,
  discount_kind,
  display_name,
  display_label,
  description,
  is_active,
  starts_at,
  ends_at,
  max_redemptions,
  max_redemptions_per_user,
  payment_required,
  revenuecat_entitlement_id,
  ios_is_available,
  ios_product_id,
  ios_offer_identifier,
  ios_redemption_strategy,
  ios_fallback_url_template,
  android_is_available,
  android_product_id,
  android_promotion_id,
  android_redemption_strategy,
  android_fallback_url_template,
  metadata
) values (
  'lifetime_free_<campaign>',
  'free_lifetime',
  'free',
  'Free lifetime campaign',
  'Free lifetime',
  'Store-backed free lifetime campaign.',
  false,
  '<starts_at>',
  '<ends_at>',
  <campaign_limit>,
  1,
  false,
  '<environment_lifetime_entitlement>',
  true,
  'domani_lifetime',
  '<apple_offer_identifier>',
  'offer_code_sheet',
  '<apple_redemption_url_template>',
  true,
  'domani_lifetime',
  '<google_play_promotion_id>',
  'play_promo_code_flow',
  '<google_play_redemption_url_template>',
  '{"owner":"ops","source":"store-backed"}'::jsonb
);
```

### Discounted Campaign Template

```sql
insert into public.promo_campaigns (
  slug,
  campaign_type,
  discount_kind,
  display_name,
  display_label,
  description,
  is_active,
  starts_at,
  ends_at,
  max_redemptions,
  max_redemptions_per_user,
  discount_percent,
  payment_required,
  revenuecat_entitlement_id,
  revenuecat_offering_id,
  revenuecat_package_id,
  ios_is_available,
  ios_product_id,
  ios_redemption_strategy,
  android_is_available,
  android_product_id,
  android_redemption_strategy,
  metadata
) values (
  'lifetime_50_off_<campaign>',
  'percent_discount_lifetime',
  'percent',
  '50% off lifetime',
  '50% off',
  'Store-backed discounted lifetime campaign.',
  false,
  '<starts_at>',
  '<ends_at>',
  <campaign_limit>,
  1,
  50,
  true,
  '<environment_lifetime_entitlement>',
  'promo_lifetime_50',
  'lifetime_50',
  true,
  'domani_lifetime_50',
  'revenuecat_purchase_package',
  true,
  'domani_lifetime_50',
  'revenuecat_purchase_package',
  '{"owner":"ops","source":"store-backed"}'::jsonb
);
```

For fixed-price campaigns, use:

- `campaign_type = 'fixed_price_lifetime'`
- `discount_kind = 'fixed_price'`
- `price_amount = <amount>`
- `price_currency = '<ISO_CURRENCY>'`
- `discount_percent = null`

### Code Rows

Normalize each code the same way the app and `hash_promo_code` RPC expect,
then insert only the hash.

```sql
insert into public.promo_codes (
  campaign_id,
  code_hash,
  code_lookup_hint,
  batch_slug,
  status,
  starts_at,
  ends_at,
  max_redemptions,
  max_redemptions_per_user,
  metadata
)
select
  c.id,
  public.hash_promo_code('<normalized_code>'),
  '<last_four_or_batch_hint>',
  '<campaign_slug>_<platform>_001',
  'active',
  c.starts_at,
  c.ends_at,
  1,
  1,
  '{"source":"store_export"}'::jsonb
from public.promo_campaigns c
where c.slug = '<campaign_slug>';
```

When bulk-loading codes:

- keep the raw store export outside the repository
- hash codes before or during insertion
- verify row counts against the store export
- verify that `code_lookup_hint` is not enough to reconstruct the raw code
- keep `promo_campaigns.is_active = false` until all checks pass

## Pre-Launch Verification

Complete this checklist in staging before production.

### Store Verification

- Apple free lifetime campaign has a sandbox offer code batch.
- Apple discounted campaign has an approved or sandbox-testable discounted
  product.
- Google free lifetime campaign has an active Play promotion for the correct
  one-time product.
- Google discounted campaign has an active discounted one-time product.
- Platform start and end dates match the Supabase window.
- Promotion terms are clear anywhere codes are distributed.

### RevenueCat Verification

- Every campaign product exists in the correct RevenueCat project.
- Apple and Google product IDs match the store console exactly.
- Every lifetime promo product maps to the environment lifetime entitlement.
- Campaign offering ID and package ID match Supabase exactly.
- Test `Purchases.getOfferings(<campaign_offering_id>)` returns the expected
  package.
- A completed test redemption or purchase activates the lifetime entitlement in
  RevenueCat customer info.

### Supabase Verification

- `promo_campaigns.is_active = false` during setup.
- Campaign shape matches the constraint for `free`, `percent`, or
  `fixed_price`.
- Platform availability flags match the actual store setup.
- Product IDs, offering IDs, package IDs, offer identifiers, and promotion IDs
  match the store and RevenueCat dashboards.
- Code rows contain hashes, not raw code values.
- `validate_promo_code` returns the expected `storeAction` on iOS and Android.
- Invalid, inactive, expired, already-redeemed, over-limit, and
  platform-unavailable paths produce support-readable
  `promo_redemption_attempts` rows.

### App QA

Run the real-device QA ticket for promo redemption before publishing a campaign:
[DEV-854](https://linear.app/pixelverse-studios/issue/DEV-854/test-qa-validate-promo-code-redemption-on-ios-and-android).

Minimum campaign QA:

- iOS free lifetime through native offer-code sheet or fallback URL.
- Android free lifetime through Google Play promo redemption or fallback URL.
- iOS discounted lifetime through RevenueCat campaign package.
- Android discounted lifetime through RevenueCat campaign package.
- Invalid code, expired code, inactive campaign, already-used code, over-limit
  campaign, and platform-unavailable states.
- Abandoned flow creates an audit trail but does not grant access.
- Failed store handoff records a support-safe failure event.
- Confirmed flow activates RevenueCat entitlement and updates Supabase profile
  state.

## Launch Procedure

1. Confirm staging QA is complete and any required fixes have shipped.
2. Confirm production `.env` values and remote secrets point at the intended
   production Supabase, RevenueCat, Apple, and Google configuration.
3. Confirm store products, offers, promotions, and RevenueCat mappings exist in
   production.
4. Insert or update production Supabase campaign and code rows with
   `is_active = false`.
5. Run one production smoke test with an internal code if the campaign type
   supports it.
6. Set `promo_campaigns.is_active = true`.
7. Distribute codes only after the active campaign validates on the intended
   platform.
8. Monitor `promo_redemption_attempts`, RevenueCat customer events, and webhook
   rows during the first wave.

## Support Debugging Flow

When a user says a code did not work, collect:

- user email or Supabase user ID
- platform and app version
- campaign name, if known
- approximate redemption time
- code lookup hint or batch source
- screenshot of the user-facing error, if available

Avoid asking the user to paste the raw code into Linear or public logs. If a raw
code is needed, normalize and hash it in a private operator context, then use
the hash for lookup.

### Step 1: Find The Validation Attempt

```sql
select
  id,
  user_id,
  campaign_id,
  code_id,
  platform,
  app_version,
  status,
  store_product_id,
  revenuecat_offering_id,
  revenuecat_package_id,
  error_code,
  error_message,
  created_at,
  confirmed_at,
  response_payload
from public.promo_redemption_attempts
where user_id = '<user_id>'
order by created_at desc
limit 20;
```

Use `status` to choose the next check:

- `invalid`: hash did not match an active code row.
- `inactive`: campaign or code was inactive.
- `expired`: campaign or code window was outside the current time.
- `over_limit`: campaign or code redemption limit was exhausted.
- `already_redeemed`: user or code had already reached its limit.
- `platform_unavailable`: campaign was not configured for that platform.
- `valid`: Supabase accepted the code, so continue to store and RevenueCat
  checks.
- `failed` or `abandoned`: inspect audit events in `response_payload`.
- `confirmed`: Supabase saw RevenueCat-backed success; inspect profile state if
  the app still looks locked.

### Step 2: Verify Campaign And Code Rows

```sql
select
  c.slug,
  c.is_active,
  c.starts_at,
  c.ends_at,
  c.redemption_count,
  c.max_redemptions,
  c.revenuecat_entitlement_id,
  c.revenuecat_offering_id,
  c.revenuecat_package_id,
  c.ios_is_available,
  c.ios_product_id,
  c.ios_redemption_strategy,
  c.android_is_available,
  c.android_product_id,
  c.android_redemption_strategy,
  pc.status as code_status,
  pc.redemption_count as code_redemption_count,
  pc.max_redemptions as code_max_redemptions
from public.promo_campaigns c
left join public.promo_codes pc on pc.campaign_id = c.id
where c.id = '<campaign_id>'
  and pc.id = '<code_id>';
```

Check whether the campaign was active, platform-enabled, inside its window, and
pointing at the expected product and RevenueCat identifiers.

### Step 3: Verify RevenueCat

In RevenueCat, find the customer by app user ID and confirm:

- the transaction exists
- the purchased product ID matches the campaign product ID
- the lifetime entitlement is active
- subscriber attributes include promo context where available
- webhook delivery occurred, if expected

If RevenueCat has the entitlement but Supabase does not, trigger or inspect the
existing subscription sync path and webhook events.

### Step 4: Verify Profile State

```sql
select
  id,
  tier,
  purchased_at,
  refunded_at,
  revenuecat_app_user_id,
  updated_at
from public.profiles
where id = '<user_id>';
```

Expected success state:

- `tier = 'lifetime'`
- `purchased_at is not null`
- `refunded_at is null`
- RevenueCat customer info shows the active environment lifetime entitlement

### Common Resolutions

- Code is invalid: confirm the entered code came from the right campaign and
  batch, then compare the private normalized hash to `promo_codes.code_hash`.
- Campaign inactive: activate only after confirming store and RevenueCat setup.
- Platform unavailable: either enable that platform with real store setup or
  tell the user the campaign is not supported on their platform.
- RevenueCat package missing: fix the offering/package ID or RevenueCat
  product attachment, then retest before reactivating.
- Store product unavailable: check App Store Connect or Play Console product
  status, territory, track, and test account access.
- Entitlement active in RevenueCat but not Supabase: run the sync path and
  inspect webhook processing.
- Supabase shows lifetime but app still locked: refresh customer info, log out
  and back in if needed, and inspect app-side subscription state.

## Known Limitations And Caveats

- Automated tests cannot fully verify Apple or Google owned redemption UI,
  sandbox account behavior, or Play/TestFlight distribution. DEV-854 remains
  required for real-device validation.
- Apple non-consumable offer-code redemption requires iOS 16.3 or later for
  non-consumable products. Use fallback redemption URLs for unsupported cases.
- Apple and Google store dashboards can take time to propagate product,
  promotion, or offer changes.
- Google non-subscription promo codes have quarterly limits and unused codes do
  not carry over to the next quarter.
- Google custom promo codes are subscription-only, so they are not the default
  for Domani lifetime one-time products.
- App Store and Play test accounts may have different eligibility rules from
  production users.
- RevenueCat entitlement activation is authoritative for app access; Supabase
  campaign validation alone must never unlock lifetime.
- Store-specific refunds, reversals, and purchase ownership edge cases still
  flow through the existing RevenueCat and Supabase subscription sync paths.

## References

- [Domani promo campaign model](../planning/promo-campaign-model.md)
- [Apple: Supporting offer codes in your app](https://developer.apple.com/documentation/storekit/supporting-offer-codes-in-your-app)
- [Apple: Set up offer codes](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-offer-codes)
- [Google Play: Create promotions](https://support.google.com/googleplay/android-developer/answer/6321495)
- [Google Play: Create a one-time product](https://support.google.com/googleplay/android-developer/answer/1153481)
- [RevenueCat: Product configuration](https://www.revenuecat.com/docs/offerings/products-overview)
- [RevenueCat: Offerings](https://www.revenuecat.com/docs/offerings/overview)
- [RevenueCat: Entitlements](https://www.revenuecat.com/docs/entitlements)
- [Linear QA ticket DEV-854](https://linear.app/pixelverse-studios/issue/DEV-854/test-qa-validate-promo-code-redemption-on-ios-and-android)
