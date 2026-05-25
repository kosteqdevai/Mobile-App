# Data Strategy

LaCucina MVP uses local-only browser storage with no account, no backend, and no sync. Data belongs to the person using the local browser profile.

## Storage Stance

- Use local browser storage for the web-first MVP.
- The current MVP adapter uses IndexedDB schema version `3` for rich local records: recipes, cookbooks, meal plans, and legacy reusable recipe components.
- Reusable bases in the primary UX are normal recipe records with an `isTemplate` flag, so they stay in the `recipes` store and survive the same update path as other recipes.
- Browser `localStorage` is retained for the schema/migration marker and small UI state such as cook-mode progress.
- Managed photo blobs should use IndexedDB before actual image bytes are stored in app-managed storage.
- Keep storage behind repository interfaces so domain and application logic do not depend on browser APIs.
- Use in-memory fakes for unit and component tests.
- Do not call real external services in tests.

## Data Ownership

The MVP has a single local owner. There are no user accounts, roles, public authors, or remote ownership checks.

All recipes are private by default. Text export or native sharing may copy selected recipe content outside the app, but exported copies are outside app-managed storage.

## Offline and Unavailable States

Because data is local-only, recipe and planner flows should work without a network connection after the app is loaded.

The app still needs safe unavailable states for:

- browser storage disabled;
- quota exceeded;
- corrupted local records;
- photo read/write failure;
- unsupported browser APIs.

UI should surface these as recoverable errors and avoid silent data loss.

## Deletion and Recovery

Deleting a recipe removes the recipe record and its app-managed local photo reference/blob. Deleting a cookbook/category must either block while recipes still reference it or move affected recipes to a safe fallback location, depending on the implementation gap.

The MVP does not promise account-based recovery, cloud backup, or cross-device restore.

## Migration Baseline

Schema version `1` used active `localStorage` JSON collections:

- `lacucina:recipes`
- `lacucina:cookbooks`
- `lacucina:meal-plans`

Schema version `2` migrated those rich records into IndexedDB stores:

- `recipes`
- `cookbooks`
- `mealPlans`

Schema version `3` keeps those stores and adds:

- `recipeComponents`

The migration writes `lacucina:schema-version = 3` only after records are copied successfully. Corrupt v1 records or database write failures leave the legacy `localStorage` records and version marker untouched so the app does not silently discard user data. A v2 device upgrades to v3 by adding the component store without deleting recipes, cookbooks, or meal plans.

## Android Local Data Retention

The Android debug package uses `com.lacucina.app` as both Capacitor `appId` and Android `applicationId`. Local recipe data should survive a normal update install when the next debug APK is installed over the existing app with `adb install -r` or `npm run android:install:debug`.

Local data is not account-backed. It will be removed if the app is uninstalled, Android app storage is cleared, the package id changes, or a build with an incompatible signing lineage replaces the current debug app.

## Data Not Collected

The MVP must not collect analytics, tracking identifiers, payment data, public profile data, location, camera streams, health data, or account credentials.
