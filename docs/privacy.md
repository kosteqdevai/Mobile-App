# Privacy Boundaries

LaCucina MVP is a private, local-first cookbook. It should store user-created recipes, cookbook organization, meal plans, and optional local recipe photos only on the user's device/browser profile.

## Privacy Defaults

- Recipes are private by default.
- No account is required.
- No backend sync is used.
- No public publishing exists in MVP.
- No analytics or tracking is added.
- No secrets, tokens, signing files, private certificates, or real user data are committed.

## User Data in MVP

MVP user data may include:

- recipe titles and descriptions;
- ingredients and preparation steps;
- tags, notes, favorites, timing, and difficulty;
- user-entered prep-ahead, storage, reheating, holding, and leftover guidance;
- user-entered allergen flags, dietary tags, and verification status labels;
- user-entered or estimated nutrition values with status and source labels;
- cookbook/category structure;
- recurring meal plan entries;
- one local photo per recipe.

This can reveal habits, preferences, diet patterns, and possible health-related concerns, so failures should avoid data leakage and accidental sharing.

Allergen, dietary, and nutrition metadata is informational only. The app must not claim that a recipe is guaranteed safe, allergen-free, clinically appropriate, or medically recommended.

## Sharing Boundary

Text export or native share sheet actions must be explicit. The app should show which recipe content is being exported. Sharing must not create public URLs, public recipe records, or remote copies managed by LaCucina.

## Permission Boundary

The web MVP should use file selection for the optional local recipe photo. Camera capture, push notifications, location, payments, health integrations, and background sync are out of scope.

If a browser permission or file API is unavailable, the app should keep the recipe usable without a photo.

## Safe Failure Behavior

The app should report:

- storage unavailable;
- quota exceeded;
- photo save failed;
- recipe save failed;
- export/share failed.

The app should not hide these failures with silent fallbacks.
