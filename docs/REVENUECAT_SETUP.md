# RevenueCat & In-App Purchase Setup

Complete guide for setting up in-app purchases with RevenueCat and App Store Connect.

## Prerequisites

- Apple Developer account ($99/year)
- App registered in App Store Connect
- RevenueCat account (free tier available)

---

## 1. App Store Connect Setup

### 1.1 Create In-App Purchase Products

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app → **Monetization** → **In-App Purchases**
3. Click **+** to create a new product

For each subscription product:

| Field              | Example Value               |
| ------------------ | --------------------------- |
| Type               | Auto-Renewable Subscription |
| Reference Name     | Domani Pro Monthly          |
| Product ID         | `domani_pro_monthly`        |
| Subscription Group | Domani Pro                  |

4. Add pricing (e.g., $4.99/month, $39.99/year)
5. Add localized display name and description
6. Submit for review (can be done with app submission)

**Product IDs used in this app:**

- `domani_pro_monthly` - Monthly subscription
- `domani_pro_yearly` - Yearly subscription

### 1.2 Create Sandbox Testers

1. App Store Connect → **Users and Access** → **Sandbox** → **Testers**
2. Click **+** to add a tester
3. Fill in details:
   - First/Last Name: Anything
   - Email: Use a fake email (e.g., `test1@domani-test.com`) - doesn't need to be real
   - Password: Remember this for testing
   - Region: Your test region
4. Save

**Note:** Sandbox accounts are completely separate from real Apple IDs.

---

## 2. RevenueCat Setup

### 2.1 Create Project & App

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Create a new project (or use existing)
3. Add a new app:
   - Platform: **iOS**
   - App name: Domani
   - Bundle ID: `com.baitedz.domani-app`

### 2.2 Connect to App Store Connect

1. In RevenueCat, go to your iOS app → **App Store Connect**
2. You need to provide:
   - **App-Specific Shared Secret**:
     - App Store Connect → Your App → General → App Information → App-Specific Shared Secret
     - Click "Manage" and generate if needed
   - **In-App Purchase Key** (for StoreKit 2):
     - App Store Connect → Users and Access → Integrations → In-App Purchase
     - Generate a key, download the `.p8` file
     - Upload to RevenueCat

### 2.3 Add Products

1. RevenueCat → Your App → **Products**
2. Click **+ New**
3. Enter your App Store product IDs:
   - `domani_pro_monthly`
   - `domani_pro_yearly`
4. RevenueCat will fetch product details from App Store Connect

### 2.4 Create Entitlements

Entitlements represent access levels in your app.

1. RevenueCat → Project → **Entitlements**
2. Click **+ New**
3. Create entitlement:
   - Identifier: `premium`
   - Description: Full access to Domani Pro features
4. Attach products:
   - Click into the `premium` entitlement
   - Add both `domani_pro_monthly` and `domani_pro_yearly`

**Used in code as:** `ENTITLEMENT_ID = 'premium'` (see `src/lib/revenuecat.ts`)

### 2.5 Create Offerings

Offerings are the products you display to users. This allows A/B testing different paywalls.

1. RevenueCat → Your App → **Offerings**
2. Click **+ New**
3. Create offering:
   - Identifier: `default` (this is the "current" offering fetched by the app)
4. Add **Packages** to the offering:

   | Package | Type    | Product              |
   | ------- | ------- | -------------------- |
   | Monthly | Monthly | `domani_pro_monthly` |
   | Annual  | Annual  | `domani_pro_yearly`  |

5. Make sure the offering is set as **Current** (star icon)

**How it works in code:**

```typescript
const offerings = await Purchases.getOfferings()
const currentOffering = offerings.current // Gets the "default" offering
const monthlyPackage = currentOffering.monthly
const annualPackage = currentOffering.annual
```

---

## 3. Environment Variables

### 3.1 Get Your API Keys

1. RevenueCat → Project Settings → **API Keys**
2. Copy the **Public App-Specific API Key** for iOS
   - Starts with `appl_`

### 3.2 Add to Project

Add to your `.env` file:

```bash
# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_your_key_here
```

**Note:** These are public keys safe to include in your app bundle. They can only be used to make purchases, not access sensitive data.

---

## 4. Testing In-App Purchases

### 4.1 Build to Physical Device

Sandbox purchases do NOT work on the iOS Simulator. You must use a real device.

```bash
# Connect your iPhone via USB, then:
npx expo run:ios --device
```

### 4.2 Prepare Your Device

1. **Sign out** of your real Apple ID:
   - Settings → App Store → Sign Out
   - (Don't sign into sandbox here - wait for purchase prompt)

2. **Enable Sandbox Testing** (iOS 14+):
   - Settings → App Store → Sandbox Account
   - You can sign into your sandbox account here for easier testing

### 4.3 Test Purchase Flow

1. Open your app on the device
2. Navigate to subscription/paywall screen
3. Tap a purchase button
4. When prompted, sign in with your **sandbox tester** credentials
5. Complete the purchase (it's free in sandbox)
6. Verify the entitlement is active in your app

### 4.4 Verify in RevenueCat

1. RevenueCat Dashboard → **Customers**
2. Search for your test user (by Supabase user ID or RevenueCat anonymous ID)
3. Verify:
   - Purchase appears in history
   - `premium` entitlement is active

### 4.5 Testing Subscription Scenarios

Sandbox subscriptions renew on an accelerated schedule:

| Real Duration | Sandbox Duration |
| ------------- | ---------------- |
| 1 week        | 3 minutes        |
| 1 month       | 5 minutes        |
| 2 months      | 10 minutes       |
| 3 months      | 15 minutes       |
| 6 months      | 30 minutes       |
| 1 year        | 1 hour           |

Subscriptions auto-renew up to 6 times in sandbox, then cancel.

**Test scenarios:**

- New purchase
- Restore purchases (Settings → App Store → sign into different sandbox account)
- Subscription expiration (wait for sandbox renewal period)
- Cancellation (manage in Settings → App Store → Subscriptions on device)

---

## 5. Code Reference

Key files:

- `src/lib/revenuecat.ts` - RevenueCat SDK wrapper
- `src/hooks/useSubscription.ts` - React hook for subscription state

### Initialize on App Start

```typescript
import { initializeRevenueCat } from '@/lib/revenuecat'

// After user auth:
await initializeRevenueCat(user.id)
```

### Check Premium Access

```typescript
import { checkPremiumAccess } from '@/lib/revenuecat'

const { hasPremium, isTrialing, expirationDate } = await checkPremiumAccess()
```

### Make a Purchase

```typescript
import { getOfferings, purchasePackage } from '@/lib/revenuecat'

const offering = await getOfferings()
if (offering?.monthly) {
  await purchasePackage(offering.monthly)
}
```

---

## 6. Troubleshooting

### "No offerings available"

- Check RevenueCat dashboard: Is an offering set as Current?
- Check products are attached to packages in the offering
- Verify API key is correct in `.env`

### "Invalid product" error

- Product ID in RevenueCat must exactly match App Store Connect
- Product must be in "Ready to Submit" or "Approved" status
- App Store Connect may take up to 24 hours to propagate new products

### Purchase completes but entitlement not active

- Verify product is attached to the `premium` entitlement in RevenueCat
- Check RevenueCat logs for webhook errors
- Ensure App-Specific Shared Secret is correctly configured

### Sandbox sign-in not appearing

- Make sure you're signed out of real Apple ID on device
- Try Settings → App Store → Sandbox Account (iOS 14+)
- Restart the app

---

## 7. Going to Production

Before submitting to App Store:

1. [ ] All products approved in App Store Connect
2. [ ] Tested full purchase flow in sandbox
3. [ ] Tested restore purchases
4. [ ] Production API key in environment (same key works for both)
5. [ ] App submitted for review with in-app purchases

**Note:** Apple reviews in-app purchases as part of your app review. First submission may take longer.
