# Google Play Service Account Setup For RevenueCat

This guide covers the Google Cloud and Google Play Console setup required for RevenueCat to read product, subscription, and purchase data for the Android app.

Use this when working tickets related to Android RevenueCat setup, especially the service-account portion of the integration.

## Purpose

RevenueCat needs a Google service account with access to the Domani Play Console app so it can:

- import Android products
- validate purchases
- sync subscription and order state
- support tester and launch-readiness validation

## Required Access

You need access to both:

- the Google Cloud project that will own the service account
- the Google Play Console app for Domani

This cannot be completed from local code alone. The account creation, key download, and Play Console invitation must be done in the browser by someone with the necessary permissions.

## Naming Convention

Create the service account with:

- Name: `revenuecat-domani`
- Description: `RevenueCat integration for Domani app`

## Step 1: Create The Service Account In Google Cloud

1. Open Google Cloud Console.
2. Go to `IAM & Admin -> Service Accounts`.
3. Choose the Google Cloud project linked to the Domani Play Console app.
4. Click `Create Service Account`.
5. Enter:
   - Service account name: `revenuecat-domani`
   - Service account description: `RevenueCat integration for Domani app`
6. Finish creation.

## Step 2: Create And Store The JSON Key Securely

1. Open the new service account.
2. Go to the `Keys` tab.
3. Choose `Add Key -> Create new key`.
4. Select `JSON`.
5. Download the key once.

Store the JSON key securely:

- do not commit it to the repo
- do not paste it into Linear comments
- store it in your team password manager or secure credential vault
- if the key is ever exposed, revoke it immediately and create a new one

Record the following metadata separately from the file contents:

- service account email
- key creation date
- linked Google Cloud project
- who downloaded and stored the key

## Step 3: Link Google Play Console To The Correct Google Cloud Project

1. Open Google Play Console.
2. Go to `Setup -> API access`.
3. Link the Play Console app to the Google Cloud project that owns `revenuecat-domani`.
4. Confirm the Google Play Developer API is enabled for that project.

If the project is already linked, verify it is the same project where the service account was created.

## Step 4: Invite The Service Account To Google Play Console

1. In Google Play Console, go to `Users and permissions`.
2. Invite the service account email created in Google Cloud.
3. Grant the minimum required permissions for RevenueCat:
   - `View app information and download bulk reports`
   - `View financial data, orders, and cancellation survey responses`
   - `Manage orders and subscriptions`
4. Save the invitation.

Use the minimum permissions needed for RevenueCat. Do not grant broader admin access unless there is a documented reason.

## Step 5: Wait For Permission Propagation

Google Play service-account access may take up to 24 hours to propagate.

Do not treat immediate failures as final until the propagation window has passed.

## Step 6: Configure RevenueCat

After the service account exists and Play Console access is active:

1. Open the Domani Android app in RevenueCat.
2. Go to the Google Play configuration.
3. Upload the JSON service-account key.
4. Save the configuration.
5. Confirm RevenueCat can read Android product and purchase metadata.

## Validation Checklist

- [ ] Service account `revenuecat-domani` exists in the correct Google Cloud project
- [ ] JSON key was downloaded once and stored securely outside the repo
- [ ] Play Console is linked to the same Google Cloud project
- [ ] Google Play Developer API is enabled
- [ ] Service account has been invited to Play Console
- [ ] Required permissions were granted
- [ ] At least 24 hours have passed if permissions were just added
- [ ] RevenueCat accepts the JSON key without configuration errors
- [ ] RevenueCat can see the Android app and its products

## Recommended Evidence To Capture

For ticket completion, capture:

- screenshot of service account details page showing the service-account email
- screenshot of Play Console permissions for the service account
- screenshot of Google Play API access linkage
- screenshot of RevenueCat Google Play configuration success

Do not store the JSON key itself in screenshots or repo files.

## Blockers

Common blockers:

- wrong Google Cloud project linked to Play Console
- Google Play Developer API not enabled
- insufficient Play Console permissions
- propagation delay after invitation or permission changes
- uploading the wrong JSON key to RevenueCat

## Follow-On Tickets

This ticket only covers the service-account setup. The following Android RevenueCat tasks still need to be completed separately:

- configure the Android app in RevenueCat
- create Android products in Google Play Console
- test Android purchase flow end to end
