# Store Payment Icon Assets

This document defines the Domani icon assets used for app-store listing, purchase, refund, and subscription-management surfaces.

## Source Assets

Use these committed files as the current source of truth:

- Expo / native app icon: `assets/AppIcon-sage.png`
- Apple app icon upload: `assets/store/apple-app-icon-1024.jpg`
- Apple in-app purchase image: `assets/store/apple-iap-lifetime-1024.jpg`
- Google Play app icon: `assets/store/google-play-icon-512.png`
- Google Play feature graphic: `assets/store/google-feature-graphic-1024x500.png`

The older `assets/AppIcon-sage.png.png` file is retained only as the original checked-in source that previously fed native generated assets. New references should use `assets/AppIcon-sage.png`.

## Apple Uploads

### App Icon

Upload `assets/store/apple-app-icon-1024.jpg` in App Store Connect anywhere Apple requests the app icon source.

Expected format:

- 1024 x 1024
- JPG
- RGB
- No transparency
- No rounded corners baked into the file

### In-App Purchase Image

Upload `assets/store/apple-iap-lifetime-1024.jpg` for the lifetime in-app purchase image if the product is promoted, used in win-back offers, or otherwise appears in App Store purchase-related merchandising.

Expected format:

- 1024 x 1024
- JPG
- RGB
- Flattened
- No rounded corners baked into the file

After uploading, sync or refresh product metadata in RevenueCat so imported Apple product details are current.

## Google Play Uploads

### Main Store Listing Icon

Upload `assets/store/google-play-icon-512.png` in Google Play Console for the app icon.

Expected format:

- 512 x 512
- 32-bit PNG
- Alpha allowed
- Under 1024 KB

### Feature Graphic

Upload `assets/store/google-feature-graphic-1024x500.png` where Play Console asks for the feature graphic.

Expected format:

- 1024 x 500
- PNG
- Keep text minimal because this asset can be cropped or adapted by Google Play surfaces

After uploading, confirm internal testing, closed testing, and production tracks display the updated listing assets.

## Verification Checklist

- `app.json` resolves `expo.icon` to `assets/AppIcon-sage.png`.
- `app.json` resolves `android.adaptiveIcon.foregroundImage` to `assets/AppIcon-sage.png`.
- iOS build shows the Domani icon on the device home screen and app switcher.
- Android build shows the Domani icon on the launcher and recent-apps surface.
- iOS sandbox purchase confirmation shows the Domani icon instead of a broken image fallback.
- Android test purchase confirmation shows the Domani icon instead of a broken image fallback.
- Refund, revoked-access, and subscription-management flows show the Domani icon where Apple or Google displays an app/product image.

## External References

- Apple app icon help: https://developer.apple.com/help/app-store-connect/manage-app-information/add-an-app-icon/
- Apple in-app purchase information: https://developer.apple.com/help/app-store-connect/reference/in-app-purchase-information
- Google Play preview asset requirements: https://support.google.com/googleplay/android-developer/answer/9866151
