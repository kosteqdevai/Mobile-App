# Release Readiness

## Local Release Checks

Run the full local gate before tagging or handing off a build:

```sh
npm run quality
```

This runs ESLint, Prettier check, Vitest, TypeScript build, and Vite production build.

## Web MVP Build

```sh
npm run build
```

The production web output is written to `dist/`. The app is a local-only browser MVP with no backend URL, no auth provider, and no committed secrets.

## Android Debug Package

The web-first MVP can be wrapped for local Android device testing with Capacitor:

```sh
npm run android:apk:debug
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

To install it on a USB-connected device with Android debugging enabled:

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

On this Windows workspace, `adb` may not be on `PATH`. The checked local SDK path is:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Or build and update-install in one step:

```sh
npm run android:install:debug
```

This debug package is for local device smoke testing only. It is not a Play Store upload artifact and does not include production signing keys.

### Android Debug Updates and Local Data

Recipe data is local-only. In the Android debug wrapper, the web app runs inside the same package id, `com.lacucina.app`, and stores rich records in the app WebView's IndexedDB database named `lacucina`.

To keep recipes between local rollout builds:

- install over the existing app with `adb install -r ...` or `npm run android:install:debug`;
- keep `capacitor.config.ts` `appId` and Android `applicationId` as `com.lacucina.app`;
- keep using the same debug signing lineage for local updates.

Do not uninstall the app, clear app storage, change the package id, or install a differently signed build over the existing debug app if you need to preserve local recipes. Android removes this local IndexedDB data when app data is cleared or the app is uninstalled.

## Configuration

- App name and stage live in `src/core/config/appConfig.ts`.
- Runtime mode is read from Vite environment values only.
- Do not commit `.env.local`, signing keys, store credentials, certificates, analytics keys, or real user data.

## Privacy and Data Safety

The MVP stores private cookbook data in browser storage for the current browser profile:

- recipes;
- cookbook/category organization;
- meal plan loops;
- local photo references only, not app-managed photo blobs.

No analytics, tracking, account credentials, payments, location, health data, or public publishing data are collected.

## Store and Mobile Conversion Notes

Native iOS/Android production signing, app-store metadata, final app icon, splash screen, and store privacy forms are deferred until the mobile conversion phase. Those steps require platform accounts and signing materials that must stay out of the repository.
