# OAuth Setup Guide - Google & Apple Sign In

Complete configuration guide for Domani mobile app authentication.

---

## 📋 Prerequisites

- **Google Cloud Console** access
- **Apple Developer** account ($99/year)
- **Supabase project** access
- App identifiers:
  - iOS Bundle ID: `com.domani.app`
  - Android Package: `com.domani.app`
  - Scheme: `domani`

---

# Part 1: Google OAuth Setup

## 1.1 Google Cloud Console Configuration

### Create OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **OAuth consent screen**
3. Select **External** user type → **CREATE**

**Configure consent screen:**

```
App name: Domani
User support email: your-email@domani.app
App logo: [Upload 120x120px logo]
Application home page: https://domani.app
Privacy policy: https://domani.app/privacy
Terms of service: https://domani.app/terms

Authorized domains:
  - domani.app
  - [your-project-ref].supabase.co

Developer contact: your-email@domani.app
```

**Scopes** (click ADD OR REMOVE SCOPES):

- ✅ `email` - See email address
- ✅ `profile` - See personal info
- ✅ `openid` - Authenticate using OpenID Connect

### Create OAuth 2.0 Credentials

**Create 3 OAuth clients:**

#### 1. iOS Client

```
Application type: iOS
Name: Domani iOS
Bundle ID: com.domani.app
```

→ Save **iOS Client ID**: `xxx-ios.apps.googleusercontent.com`

#### 2. Android Client

```
Application type: Android
Name: Domani Android
Package name: com.domani.app
```

**Get SHA-1 fingerprint:**

```bash
# Development (debug keystore)
keytool -list -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android

# Production (upload keystore - get from EAS)
eas credentials
```

```
SHA-1 certificate fingerprint: [paste from above]
```

→ Save **Android Client ID**: `xxx-android.apps.googleusercontent.com`

#### 3. Web Client (for Supabase)

```
Application type: Web application
Name: Domani Web (Supabase)
Authorized redirect URIs:
  - https://[your-project-ref].supabase.co/auth/v1/callback
```

→ Save **Web Client ID**: `xxx-web.apps.googleusercontent.com`
→ Save **Web Client Secret**: `GOCSPX-xxxxx`

### Credentials Summary

```
✅ iOS Client ID: xxx-ios.apps.googleusercontent.com
✅ Android Client ID: xxx-android.apps.googleusercontent.com
✅ Web Client ID: xxx-web.apps.googleusercontent.com
✅ Web Client Secret: GOCSPX-xxxxx
```

## 1.2 Supabase Configuration

### Enable Google Provider

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Providers**
2. Find **Google** → Toggle **Enable Sign in with Google**

**Configure:**

```
Client ID (for OAuth): xxx-web.apps.googleusercontent.com
Client Secret (for OAuth): GOCSPX-xxxxx

Authorized Client IDs:
  - xxx-ios.apps.googleusercontent.com
  - xxx-android.apps.googleusercontent.com
  - xxx-web.apps.googleusercontent.com

Skip nonce check: UNCHECKED ✅
```

Click **Save**

### Configure Redirect URLs

Navigate to **Authentication** → **URL Configuration** → **Redirect URLs**

Add these URLs:

```
# Development (Expo Go)
exp://127.0.0.1:8081/--/auth/callback
exp://localhost:8081/--/auth/callback

# Production (Custom Scheme)
domani://auth/callback

# Production (Universal Links - Optional)
https://domani.app/auth/callback
```

Click **Save**

## 1.3 Test Google OAuth

### In Supabase Dashboard:

1. **Authentication** → **Users** → **Invite user**
2. Click **Sign in with Google**
3. Complete OAuth flow
4. Verify user created

### In App (after implementation):

```bash
npm start
npm run ios  # or npm run android
```

**Test checklist:**

- [ ] Click "Continue with Google"
- [ ] Browser opens with Google sign-in
- [ ] Complete authentication
- [ ] Redirected back to app
- [ ] User profile created in database
- [ ] Session persists after restart

---

# Part 2: Apple Sign In Setup

## 2.1 Apple Developer Console Configuration

### Enable Sign In with Apple Capability

1. Go to [Apple Developer](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → Select your App ID (`com.domani.app`)
4. Scroll to **Sign In with Apple**
5. Check **Enable as a primary App ID**
6. Click **Save**

### Create Services ID

1. In **Identifiers**, click **+** → Select **Services IDs**
2. Fill in:

```
Description: Domani Auth
Identifier: com.domani.app.auth
```

3. Click **Continue** → **Register**
4. Select the Services ID you just created
5. Check **Sign In with Apple**
6. Click **Configure**

**Configure Web Authentication:**

```
Primary App ID: com.domani.app

Web Domain: [your-project-ref].supabase.co

Return URLs:
  - https://[your-project-ref].supabase.co/auth/v1/callback
```

7. Click **Save** → **Continue** → **Register**

### Create Private Key

1. In **Keys**, click **+**
2. Fill in:

```
Key Name: Domani Apple Sign In Key
```

3. Check **Sign In with Apple**
4. Click **Configure** → Select **Primary App ID**: `com.domani.app`
5. Click **Save** → **Continue** → **Register**
6. **Download the key file** (`.p8`) - you can only download once!
7. **Save the Key ID** (shows on download page): `964J5LLAS9`

### Get Team ID

1. Go to **Membership** in Apple Developer account
2. **Copy your Team ID**: `V5P5GK2HMF`

### Apple Credentials Summary

```
✅ Services ID: com.domani.app.auth
✅ Team ID: V5P5GK2HMF
✅ Key ID: 964J5LLAS9
✅ Private Key (.p8 file): Downloaded
```

## 2.2 Supabase Configuration

### Enable Apple Provider

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Apple** → Toggle **Enable Sign in with Apple**

**Configure:**

```
Services ID: com.domani.app.auth
Authorized Client IDs: com.domani.app
Team ID: XYZ123456
Key ID: ABC123DEFG
Private Key: [Paste contents of .p8 file]

Skip nonce verification: UNCHECKED ✅
```

Click **Save**

### Verify Redirect URLs

Ensure these are in **Authentication** → **URL Configuration**:

```
domani://auth/callback
https://domani.app/auth/callback (optional)
```

## 2.3 App Configuration

### iOS Info.plist (via app.json)

Add to `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.domani.app",
      "usesAppleSignIn": true
    }
  }
}
```

### EAS Build Configuration

For production builds, add to `eas.json`:

```json
{
  "build": {
    "production": {
      "ios": {
        "bundleIdentifier": "com.domani.app",
        "appleTeamId": "XYZ123456"
      }
    }
  }
}
```

## 2.4 Test Apple Sign In

### Requirements:

- **iOS 13+** device or simulator
- **Cannot test in Expo Go** - requires development/production build
- Apple ID for testing

### Build Development Build:

```bash
# Install expo-apple-authentication
npm install expo-apple-authentication

# Create development build
eas build --profile development --platform ios
```

### Test checklist:

- [ ] Apple Sign In button appears (iOS 13+ only)
- [ ] Button follows Apple design guidelines
- [ ] Click button opens Apple authentication
- [ ] Use Face ID / Touch ID to authenticate
- [ ] First sign-in: Apple shows email/name consent
- [ ] Subsequent sign-ins: No consent needed
- [ ] User profile created in database
- [ ] Session persists

---

# Part 3: App Implementation

## 3.1 Environment Variables

Create `.env.local`:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your-anon-key

# Google OAuth (optional, for reference)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx-web.apps.googleusercontent.com
```

## 3.2 Install Dependencies

```bash
npm install expo-apple-authentication
```

All other dependencies already installed:

- ✅ `@supabase/supabase-js`
- ✅ `expo-auth-session`
- ✅ `expo-web-browser`
- ✅ `expo-linking`
- ✅ `@react-native-async-storage/async-storage`
- ✅ `react-native-url-polyfill`

## 3.3 Deep Linking Setup

Verify `app.json`:

```json
{
  "expo": {
    "scheme": "domani",
    "ios": {
      "bundleIdentifier": "com.domani.app",
      "usesAppleSignIn": true
    },
    "android": {
      "package": "com.domani.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "domani",
              "host": "auth-callback"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

---

# Part 4: Troubleshooting

## Google OAuth Issues

### "redirect_uri_mismatch"

**Cause**: Redirect URI doesn't match Google Console configuration

**Fix**: In Google Console Web OAuth client, add ALL these URIs:

```
https://[your-project-ref].supabase.co/auth/v1/callback
exp://127.0.0.1:8081/--/auth/callback
domani://auth/callback
```

### "Invalid client ID"

**Cause**: Using iOS/Android Client ID instead of Web Client ID

**Fix**: In Supabase, use **Web Client ID** for "Client ID (for OAuth)"

### OAuth completes but no session

**Cause**: Browser not closing properly

**Fix**: Ensure `WebBrowser.maybeCompleteAuthSession()` called at app root

### "Unauthorized client"

**Cause**: Native Client IDs not added to Supabase

**Fix**: Add all 3 Client IDs to "Authorized Client IDs" in Supabase

## Apple Sign In Issues

### Button doesn't appear

**Cause**: iOS version < 13 or not on iOS device

**Fix**: Check availability:

```typescript
const available = await AppleAuthentication.isAvailableAsync()
```

### "Invalid Services ID"

**Cause**: Services ID doesn't match configuration

**Fix**: Ensure Services ID in Supabase matches Apple Developer Console exactly

### Email is null on sign-in

**Expected behavior**: Apple only provides email on FIRST sign-in

**Fix**: Store email immediately when provided. On subsequent logins, retrieve from your database.

### "credential_not_found" in production

**Cause**: App not properly signed or capability not enabled

**Fix**:

1. Verify "Sign In with Apple" capability enabled in Xcode
2. Ensure Team ID matches in EAS build configuration
3. Rebuild with `eas build`

## General Issues

### Session doesn't persist

**Cause**: Async storage not configured properly

**Fix**: Verify Supabase client config:

```typescript
auth: {
  storage: AsyncStorage,
  persistSession: true,
  autoRefreshToken: true,
}
```

### RLS policies blocking access

**Cause**: User not properly linked to profile

**Fix**: Ensure profile created via trigger or manually:

```sql
INSERT INTO profiles (id, email)
VALUES (auth.uid(), auth.email())
ON CONFLICT (id) DO NOTHING;
```

---

# Part 5: Pre-Launch Checklist

## Google OAuth

- [ ] OAuth consent screen published ("In Production")
- [ ] All redirect URIs configured for production
- [ ] Tested on physical iOS device
- [ ] Tested on physical Android device
- [ ] Multiple Google accounts tested
- [ ] Privacy policy mentions Google Sign-In
- [ ] Account deletion flow implemented

## Apple Sign In

- [ ] Services ID production URLs configured
- [ ] Tested on iOS 13+ device
- [ ] Apple Sign In equally prominent as other options (App Store requirement)
- [ ] Email stored on first sign-in
- [ ] Subsequent sign-ins work without email
- [ ] Privacy policy mentions Apple Sign In
- [ ] "Sign in with Apple" button uses official component

## Security

- [ ] Client secrets NOT in mobile app code
- [ ] RLS policies enforce data isolation
- [ ] Tokens stored in secure storage (via Supabase)
- [ ] HTTPS/custom scheme redirect URIs only
- [ ] OAuth scopes limited to necessary permissions
- [ ] Session refresh working automatically

## Database

- [ ] `profiles` table has trigger to auto-create on signup
- [ ] RLS policies prevent unauthorized access
- [ ] Default categories created for new users
- [ ] Tier enforcement working (free = 3 tasks)

---

# Summary

**Google OAuth Flow:**

1. User clicks "Continue with Google"
2. App opens Supabase OAuth URL in browser
3. User authenticates with Google
4. Google → Supabase (exchanges code for tokens)
5. Supabase → App (redirects with session)
6. App extracts tokens, sets session
7. User authenticated! ✅

**Apple Sign In Flow:**

1. User clicks Apple Sign In button
2. Apple native sheet appears
3. User authenticates with Face ID/Touch ID
4. Apple provides identity token
5. App sends token to Supabase
6. Supabase verifies and creates session
7. User authenticated! ✅

**Your Redirect URLs:**

- Development: `exp://127.0.0.1:8081/--/auth/callback`
- Production: `domani://auth/callback`
- Universal (optional): `https://domani.app/auth/callback`

**Next Steps:**

1. Complete this configuration guide
2. Implement OAuth in app (see implementation files)
3. Test thoroughly on physical devices
4. Deploy to TestFlight/Internal Testing
5. Launch! 🚀
