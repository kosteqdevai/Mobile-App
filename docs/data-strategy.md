# Data Strategy

LaCucina MVP uses local-only browser storage with no account, no backend, and no sync. Data belongs to the person using the local browser profile.

## Storage Stance

- Use local browser storage for the web-first MVP.
- The current MVP adapter uses IndexedDB schema version `2` for rich local records: recipes, cookbooks, and meal plans.
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

Schema version `2` migrates those rich records into IndexedDB stores:

- `recipes`
- `cookbooks`
- `mealPlans`

The migration writes `lacucina:schema-version = 2` only after records are copied successfully. Corrupt v1 records or database write failures leave the legacy `localStorage` records and version marker untouched so the app does not silently discard user data.

## Data Not Collected

The MVP must not collect analytics, tracking identifiers, payment data, public profile data, location, camera streams, health data, or account credentials.
