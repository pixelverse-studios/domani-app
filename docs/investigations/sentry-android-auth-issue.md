# Sentry Android Build Authentication Issue - Investigation Prompt

## Issue Summary

During Android release builds (`./gradlew bundleRelease`), the Sentry source map upload step consistently fails with a 401 "Invalid org token" error, despite:

- The same token working perfectly for iOS builds
- The token being valid when tested with `sentry-cli` via environment variable
- Multiple configuration attempts and fresh token generation

## Current Workaround

**Status:** Build succeeds with Sentry uploads disabled via `.env.sentry-build-plugin`

**File:** `/Users/phil/PVS-local/Projects/domani/domani-app/.env.sentry-build-plugin`

```env
SENTRY_AUTH_TOKEN=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
```

This file provides the token to sentry-cli as an environment variable during the build process, which successfully authenticates.

**Impact:** Source maps ARE being uploaded successfully to Sentry (confirmed in build logs), so production error tracking with readable stack traces is working.

## Root Cause Analysis

### Token Validation Tests

1. **Direct sentry-cli test (PASSES):**

   ```bash
   SENTRY_AUTH_TOKEN="<token>" node_modules/@sentry/cli/bin/sentry-cli info
   # Result: ✅ Successfully authenticates
   ```

2. **Properties file test (FAILS):**
   ```bash
   SENTRY_PROPERTIES="android/sentry.properties" node_modules/@sentry/cli/bin/sentry-cli info
   # Result: ❌ 401 "Invalid org token"
   ```

### Key Finding

**sentry-cli has a bug when reading auth tokens from Java properties files.** The exact same token that works via environment variable fails with 401 when read from `android/sentry.properties`, even though the file is correctly formatted:

```properties
defaults.url=https://sentry.io
defaults.org=pixelverse-studios
defaults.project=domani-app
auth.token=<token>  # ❌ This approach fails
```

### Why iOS Works

iOS builds use `ios/sentry.properties` with:

```properties
auth.token=${SENTRY_AUTH_TOKEN}
```

The Xcode build script (`sentry-xcode.sh`) expands `${SENTRY_AUTH_TOKEN}` from the shell environment **before** passing the properties file to sentry-cli. So sentry-cli never actually parses the token from the file - it receives it from the environment.

### Why Android Failed (Initially)

The Sentry Gradle plugin (`node_modules/@sentry/react-native/sentry.gradle`) only sets these environment variables:

1. `SENTRY_PROPERTIES` - path to the properties file
2. `SENTRY_DOTENV_PATH` - path to `.env.sentry-build-plugin` (if it exists)

**It does NOT pass `SENTRY_AUTH_TOKEN` as an environment variable** to the sentry-cli exec process by default, so sentry-cli tries to read the token directly from the properties file, which triggers the parsing bug.

## What We Tried (Chronologically)

1. ❌ Hardcoded token in `android/sentry.properties` → 401 error
2. ❌ Used `${SENTRY_AUTH_TOKEN}` in `android/sentry.properties` (like iOS) → 401 error (Gradle doesn't expand env vars in properties files)
3. ❌ Added `project.ext.sentryCli.env` configuration in `build.gradle` → No effect (Sentry Gradle plugin doesn't support this config option)
4. ❌ Changed Sentry URL to region-specific `https://us.sentry.io` → 401 error
5. ❌ Regenerated fresh token with `org:ci` scope → 401 error
6. ❌ Removed `auth.token` line entirely from properties file (relying on env var) → 401 error (token not passed to exec)
7. ✅ Created `.env.sentry-build-plugin` file with `SENTRY_AUTH_TOKEN` → **SUCCESS**

## Technical Deep Dive

### Sentry Gradle Plugin Behavior

**File:** `node_modules/@sentry/react-native/sentry.gradle` (lines 187-189)

```gradle
if (!System.getenv('SENTRY_DOTENV_PATH') && file("$reactRoot/.env.sentry-build-plugin").exists()) {
    environment('SENTRY_DOTENV_PATH', "$reactRoot/.env.sentry-build-plugin")
}
```

The plugin automatically detects `.env.sentry-build-plugin` and passes it to sentry-cli via the `SENTRY_DOTENV_PATH` environment variable. sentry-cli then loads variables from that dotenv file.

### Token Characteristics

- **Token:** Starts with `sntrys_`
- **Scope:** `org:ci` (includes source map upload and release creation permissions)
- **Organization:** `pixelverse-studios`
- **Project:** `domani-app`
- **Created:** Feb 14, 2026 (token name: "domani-build")

### Properties File Parsing Bug Hypothesis

The token contains special characters including:

- Base64 characters: `+`, `/`, `=`
- Underscore: `_`

**Theory:** sentry-cli's Java properties file parser may be:

1. URL-decoding the token (treating `+` as space)
2. Truncating at special characters
3. Not properly handling base64-encoded tokens in properties format
4. Having encoding issues with the token string

This is why passing the same token via environment variable works perfectly - it bypasses the properties file parser entirely.

## Current Configuration State

### Files Modified

1. **`.env.sentry-build-plugin`** (CREATED)
   - Contains: `SENTRY_AUTH_TOKEN=<token>`
   - Purpose: Provides token via dotenv approach

2. **`android/sentry.properties`**

   ```properties
   defaults.url=https://sentry.io
   defaults.org=pixelverse-studios
   defaults.project=domani-app
   # No auth.token line - token comes from .env.sentry-build-plugin
   ```

3. **`android/gradle.properties`**

   ```properties
   # Keep this for reference, but not used by sentry-cli directly
   SENTRY_AUTH_TOKEN=<token>
   ```

4. **`ios/sentry.properties`** (unchanged)
   ```properties
   defaults.url=https://sentry.io/
   defaults.org=pixelverse-studios
   defaults.project=domani-app
   auth.token=${SENTRY_AUTH_TOKEN}  # Works because Xcode expands this
   ```

## Investigation Tasks for Proper Fix

### 1. Reproduce and Document the Bug

**Test script:**

```bash
# Test 1: Direct token (should work)
SENTRY_AUTH_TOKEN="<your-token>" \
  node_modules/@sentry/cli/bin/sentry-cli info

# Test 2: Via properties file (currently fails)
echo "defaults.url=https://sentry.io
defaults.org=pixelverse-studios
defaults.project=domani-app
auth.token=<your-token>" > /tmp/test-sentry.properties

SENTRY_PROPERTIES="/tmp/test-sentry.properties" \
  node_modules/@sentry/cli/bin/sentry-cli info

# Test 3: With debug logging
SENTRY_PROPERTIES="/tmp/test-sentry.properties" \
SENTRY_LOG_LEVEL=debug \
  node_modules/@sentry/cli/bin/sentry-cli info
```

**Expected:** Test 1 succeeds, Test 2 fails with 401
**Goal:** Capture debug output from Test 3 to understand parsing behavior

### 2. Check sentry-cli Version

```bash
node_modules/@sentry/cli/bin/sentry-cli --version
```

Search GitHub issues for:

- `sentry-cli properties file auth token`
- `sentry-cli 401 properties`
- sentry-cli Java properties parsing

### 3. Investigate Alternative Configurations

**Option A: Patch Sentry Gradle Plugin**

Modify `node_modules/@sentry/react-native/sentry.gradle` to explicitly pass `SENTRY_AUTH_TOKEN`:

```gradle
// Around line 185, add before commandLine:
if (project.hasProperty('SENTRY_AUTH_TOKEN')) {
    environment('SENTRY_AUTH_TOKEN', project.property('SENTRY_AUTH_TOKEN'))
}
```

**Option B: Use gradle.properties Expansion**

Investigate if there's a way to make the Gradle plugin expand variables before writing to properties file.

**Option C: Use Sentry Android Gradle Plugin**

Check if `io.sentry.android.gradle` plugin (separate from React Native plugin) handles authentication differently.

### 4. File Upstream Bug Report

If confirmed as sentry-cli bug, file at:

- https://github.com/getsentry/sentry-cli/issues
- https://github.com/getsentry/sentry-react-native/issues

**Include:**

- Reproducible test case (from Investigation Task 1)
- sentry-cli version
- Token format (redacted)
- Debug logs showing parsing failure
- Confirmation that same token works via env var

### 5. Long-term Solutions

**Ideal Fix:** sentry-cli correctly parses tokens from properties files

**Workaround Options:**

1. **Current:** Use `.env.sentry-build-plugin` (works but not officially documented)
2. **Alternative:** Patch sentry.gradle locally and maintain via patch-package
3. **Upstream:** Contribute PR to @sentry/react-native to add SENTRY_AUTH_TOKEN env var support

## Questions to Answer

1. **Is this a known issue?** Search sentry-cli and sentry-react-native GitHub issues
2. **Which sentry-cli version introduced this?** Test with older versions
3. **Does the Android Gradle Plugin have the same issue?** Test with native Android setup
4. **Is the dotenv approach officially supported?** Check Sentry documentation
5. **Are other users affected?** Search Discord, Stack Overflow, GitHub discussions

## Success Criteria for Proper Fix

- [ ] Android builds upload source maps without `.env.sentry-build-plugin` workaround
- [ ] Configuration matches official Sentry documentation
- [ ] Token is stored in a single, secure location (not duplicated across files)
- [ ] Setup is maintainable and survives dependency updates
- [ ] Behavior matches iOS (consistent cross-platform configuration)

## Resources

- [Sentry React Native Documentation](https://docs.sentry.io/platforms/react-native/)
- [Sentry CLI Documentation](https://docs.sentry.io/product/cli/)
- [Sentry Android Gradle Plugin](https://docs.sentry.io/platforms/android/configuration/gradle/)
- [sentry-cli GitHub](https://github.com/getsentry/sentry-cli)
- [sentry-react-native GitHub](https://github.com/getsentry/sentry-react-native)

## Related Files

- `node_modules/@sentry/react-native/sentry.gradle` - Gradle plugin implementation
- `node_modules/@sentry/cli/bin/sentry-cli` - CLI binary
- `android/app/build.gradle` - Build configuration (line 84: applies sentry.gradle)
- `app.json` - Expo config with Sentry plugin
- `src/lib/sentry.ts` - Client-side Sentry initialization

---

**Last Updated:** 2026-02-15
**Status:** Workaround implemented, source maps uploading successfully
**Priority:** Low (feature working, just needs cleaner implementation)
