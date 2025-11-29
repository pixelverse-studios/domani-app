# App Store Connect Setup Guide for Domani

> **Progress Note (2024-11-25):** Completed steps 1-5. Currently on step 6 (App Store Connect keys for RevenueCat).

---

## 1. Create the "Domani" app in App Store Connect

Skip this if the app already exists with the correct bundle ID.

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to **Apps** (or "My Apps") in the top navigation
3. Click the **"+" → New App** button
4. Fill out:
   - **Platform:** iOS
   - **Name:** Domani (or "Domani – Task Planner" if just "Domani" is taken)
   - **Primary language:** English (or your preference)
   - **Bundle ID:** `com.baitedz.domani-app` (must match Apple Developer portal and Expo config)
   - **SKU:** `domani-ios-001` (internal only)
   - **User Access:** typically "Full Access"
5. Click **Create**

> **Key constraint:** Once created, the bundle ID cannot be changed, so make sure it matches your actual build config.

---

## 2. Paid Apps Agreement, Banking, and Tax Setup

You cannot offer paid subscriptions until this is active.

1. In App Store Connect, go to **Agreements, Tax, and Banking**
2. Under **Agreements**, locate **Paid Apps** and click **Set Up / Request**
3. Accept the legal agreement
4. Under **Banking:**
   - Click **Add Bank Account**
   - Enter account holder name, bank name, IBAN/account number, routing/BIC, and address
5. Under **Tax:**
   - Fill out required tax forms (e.g., W-9 for US entities, W-8BEN/W-8BEN-E for non-US)
6. Wait until the Paid Apps agreement status shows as **Active** (can take up to ~48 hours)

> **Important:** Do this early; if this agreement isn't active, your subscriptions will not be purchasable even if configured.

---

## 3. Create a Subscription Group for "Domani Pro"

Apple requires every auto-renewable subscription to belong to a subscription group.

1. In **Apps**, open your Domani app
2. In the left sidebar, under **Monetization**, click **Subscriptions**
3. Click the **"+"** button to create a new group
4. Enter:
   - **Reference Name:** `Domani Pro` (internal, not user-facing in most places)
   - **Subscription Group Display Name:** `Domani Pro` (shows in "Manage Subscriptions" on user devices)
5. Save the group

You'll put both `domani_pro_monthly` and `domani_pro_yearly` into this same group (same benefits, different billing periods).

---

## 4. Create the Two Subscription Products

You're creating auto-renewable subscriptions within that group. Each product has:

- A unique **Product ID** (used in your app and in RevenueCat)
- **Duration** (1 month / 1 year)
- **Pricing**
- Localized **name + description**

### 4.1 Shared Considerations for Both Products

For both subscriptions:

- **Type:** Auto-Renewable Subscription
- **Group:** Domani Pro
- **Level:** Give both the same Level (e.g., Level 1) since they unlock the same "Pro" entitlement
- **Status:** Ensure **Cleared for Sale** is checked and product is at least in "Ready to Submit"

#### Pricing Tiers

Apple gives you a list of price points/tiers. For subscriptions you select:

- Base storefront (e.g., United States)
- A price point, and Apple maps it to all other countries/regions

Typical SaaS pricing pattern:

- **Monthly:** baseline (e.g., $4.99 USD)
- **Yearly:** ~8-10× monthly (e.g., $39.99 USD) to offer a discount vs 12× monthly

To configure pricing:

1. In the subscription detail screen, go to **Subscription Prices**
2. Click **Add Subscription Price**
3. Pick country/region and price; confirm

### 4.2 Monthly Subscription: `domani_pro_monthly`

1. In **Subscriptions**, click the **Domani Pro** group
2. Click **Create** (or "+" if there are already products)
3. Choose **Auto-Renewable Subscription**
4. Fill in:
   - **Reference Name:** `Domani Pro Monthly` (internal)
   - **Product ID:** `domani_pro_monthly` (exactly this; cannot be changed later)
5. Set **Duration** to **1 Month**
6. Add **Subscription Prices** as described above
7. Under **Localizations**, add at least your primary language:
   - **Name (App Store Display Name):** `Domani Pro – Monthly`
   - **Description (App Store):**
     ```
     Unlock all Domani Pro features, including unlimited tasks, smart planning,
     and priority support. Auto-renews every month until cancelled.
     The current price is shown at purchase.
     ```

### 4.3 Yearly Subscription: `domani_pro_yearly`

1. In **Subscriptions → Domani Pro** group, click **Create / "+"**
2. Choose **Auto-Renewable Subscription**
3. Fill in:
   - **Reference Name:** `Domani Pro Yearly`
   - **Product ID:** `domani_pro_yearly`
4. Set **Duration** to **1 Year**
5. Configure **Subscription Prices** (e.g., annual price with discount versus 12× monthly)
6. Add localization:
   - **Name:** `Domani Pro – Yearly`
   - **Description:**
     ```
     One year of Domani Pro with all premium features: unlimited tasks,
     smart planning, and priority support. Auto-renews annually until cancelled.
     The current price is shown at purchase.
     ```

### 4.4 Optional: Trials and Intro Offers

You can configure:

- **Introductory offers** (e.g., first month at a discount)
- **Free trials**

These are configured per subscription product in App Store Connect. If you use them, your in-app copy must make the true recurring price and billing period at least as prominent as the trial.

---

## 5. Sandbox Testers (Test Purchases Without Real Money)

Apple's sandbox environment lets you test IAP with special Apple IDs.

### 5.1 Create Sandbox Tester Accounts

1. In App Store Connect, go to **Users and Access**
2. In the top navigation, click **Sandbox** (or Sandbox → Testers)
3. Click the **"+"** button to add a new tester
4. Enter:
   - First & last name
   - Email address (must be valid and not already an Apple ID)
   - Country/region
   - Password and security questions
5. Save. Apple sends a verification email; confirm it

> **Note:** After creation, you generally cannot edit email/name for sandbox testers, so get them right.

### 5.2 Use Sandbox Testers on Device

1. Build a development/debug build of your app signed with your Domani bundle ID (Expo dev build; not Expo Go)
   - RevenueCat's RN SDK + IAP require a custom dev build, not Expo Go
2. On your test device:
   - Sign out of your normal App Store account (Settings → Apple ID → Media & Purchases → Sign Out)
   - Initiate a purchase in your app
   - When prompted, sign in with the sandbox tester account (iOS will show "Sandbox" in the dialog)
3. Test purchase, cancellation, and restore flows

---

## 6. App Store Connect Keys for RevenueCat

For a modern RevenueCat + React Native setup (StoreKit 2), you need:

- **In-App Purchase Key** – required for RevenueCat to process StoreKit 2 transactions
- **App Store Connect API Key** – recommended to let RevenueCat import products and prices automatically

### 6.1 Generate an In-App Purchase Key (Required)

1. In App Store Connect, go to **Users and Access**
2. Click the **Integrations** tab
3. In the sidebar under **Keys**, click **In-App Purchase**
4. Click **Generate In-App Purchase Key** (or "+" if keys already exist)
5. Give it a name like `RevenueCat IAP`
6. Click **Generate**
7. **Download the .p8 key file** - you can only download this once; store it securely

Then in RevenueCat:

1. In your project, open **Apps & providers → Apple App Store**
2. Under **In-app purchase key configuration**, upload the .p8 file
3. Enter the **Issuer ID** (found at the top of the In-App Purchase page in App Store Connect)
4. Save configuration

> This is mandatory for React Native / Purchases v8+ and StoreKit 2 to properly process transactions.

### 6.2 Generate an App Store Connect API Key (For Product Import)

In App Store Connect:

1. Go to **Users and Access → Integrations**
2. Under **App Store Connect API**, choose **Team Keys**
3. Click **Generate API Key** (or "+")
4. Name the key something like `RevenueCat Connect`
5. Set role: **App Manager** at minimum (recommended by RevenueCat)
6. Generate and **download the .p8 file** (can only be downloaded once)

Note these values:

- **Key ID** (displayed in the table)
- **Issuer ID** (at the top of the page)
- **Vendor Number** (from Payments and Financial Reports)

In RevenueCat:

1. Go to your project and select the Apple App Store config
2. Open the **App Store Connect API** tab
3. Upload the .p8 file, and enter:
   - Key ID
   - Issuer ID
   - Vendor Number
4. Save

> **Security notes:** Keys are permanent until revoked and don't expire. If compromised, revoke the key in App Store Connect and upload a new one to RevenueCat.

---

## 7. Review Guidelines and Gotchas for Subscription Apps

### 7.1 Ongoing Value (Guideline 3.1.2)

Auto-renewable subscriptions must provide ongoing, dynamic value (new content, features, or services over time).

For Domani, frame Pro as ongoing value:

- Unlimited tasks (vs 3/day on free)
- Cross-device sync and cloud backup
- Advanced planning features
- Priority support

### 7.2 Required Information In-App for Auto-Renewing Subs

Apple expects the subscription screen inside your app to clearly show, before purchase:

- Title of the subscription (e.g., "Domani Pro – Monthly")
- Length of subscription ("1 month", "1 year")
- Price and period (e.g., "$4.99/month, billed monthly")
- That it auto-renews until cancelled
- How to cancel (e.g., "Manage or cancel in Settings > Apple ID > Subscriptions")
- Links to **Privacy Policy** and **Terms of Use/EULA**

### 7.3 Restore Purchases

Apps with auto-renewable subscriptions **must** provide a "Restore Purchases" feature. Apple will reject apps that do not.

In RevenueCat / React Native:

- Implement a visible **Restore Purchases** button (e.g., on your paywall or settings screen)
- Call `Purchases.restorePurchases()` when tapped
- Use the returned customer info to re-enable your "premium" entitlement UI

> Automatic restore on app launch alone is not enough; they want an explicit control.

### 7.4 Basic App vs Paywall

Apple often pushes back on apps that are essentially a static paywall with minimal free functionality.

For Domani:

- Provide some usable free experience (3 tasks per day, basic features)
- Make sure the app is useful even without subscription
- Pro genuinely adds ongoing value

### 7.5 Pricing & Dark Patterns

Common reasons for subscription rejection:

- Trial text more prominent than the paid amount
- Price is tiny or obscured relative to "FREE" messaging
- "LIMITED TIME" or misleading countdown timers that aren't real

Safe patterns:

- Show price & period in large, unambiguous text (e.g., "$4.99 / month")
- If you show a trial, ensure the paid plan info is at least as visible
- Avoid manipulative UI that makes cancellation feel hidden

### 7.6 Technical Gotchas for Testing

Common failure points:

- Paid Apps agreement not active
- Products not **Cleared for Sale** or not in Ready to Submit/Approved
- Product IDs in your app / RevenueCat don't exactly match App Store Connect
- Testing on simulator instead of device
- Using Expo Go instead of a custom dev build (no native IAP)
- Changing bundle ID between builds (must match App Store app and RevenueCat config)

### 7.7 App Review Submission Tips

When you submit Domani for review:

1. In **App Review → Notes**, explain:
   - That you use auto-renewable subscriptions managed via RevenueCat
   - How to reach the subscription screen (e.g., "Open app → tap 'Upgrade to Pro' in Settings")
2. Provide a test login if your app requires sign-in
3. Ensure paywall is reachable quickly from first launch
4. Verify that your sandbox test accounts work and that purchases succeed/restore

---

## 8. Mapping This to RevenueCat "premium" Entitlement

Both subscriptions unlock a "premium" entitlement. In RevenueCat:

1. In your RevenueCat project:
   - Create an **Entitlement:** `premium`
   - Create an **Offering** (e.g., `default`), and two **Packages:**
     - Monthly → map to `domani_pro_monthly`
     - Yearly → map to `domani_pro_yearly`

2. In Expo/React Native:
   - Install `react-native-purchases`
   - Configure Purchases with your RevenueCat iOS API key
   - Fetch offerings with `Purchases.getOfferings()` and display packages
   - When user purchases a package, check `customerInfo.entitlements.active.premium` and unlock Pro in the UI

---

## Recommended Next Steps (Concrete Sequence)

1. **Confirm bundle ID** in Expo and Apple Developer portal matches App Store Connect
2. **In App Store Connect:**
   - Ensure Paid Apps agreement, banking, and tax are fully **Active**
   - Create the **Domani Pro** subscription group
   - Create the two products `domani_pro_monthly` and `domani_pro_yearly` with duration and pricing
3. **Generate keys:**
   - In-App Purchase Key (critical for RevenueCat)
   - App Store Connect API Key (for product import)
4. **Configure both keys in RevenueCat** for your Domani app
5. **Define the `premium` entitlement** and default offering in RevenueCat; map both products
6. **Integrate `react-native-purchases`** in your Expo dev build:
   - Show a paywall with monthly/yearly options
   - Implement Restore Purchases
7. **Create sandbox testers** and fully test purchase, cancel, and restore flows
8. Once everything behaves correctly in sandbox, **submit Domani for review** with clear review notes
