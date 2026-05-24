# Performance and Resilience

## Current Baseline

The current production build completes with Vite and outputs a small single-page bundle:

- JavaScript bundle: about 289 kB before gzip, about 83 kB gzip.
- CSS bundle: about 7 kB before gzip, about 2 kB gzip.

The browser smoke check confirms the app loads, navigates from recipes to cookbooks and planner, opens recipe detail, and renders the export entry point without console errors.

## Resilience Coverage

- Local persistence writes a `lacucina:schema-version` marker.
- IndexedDB schema v2 stores rich recipe, cookbook, and meal-plan records.
- Repository tests prove recipes, cookbooks, and meal plans survive repository restart against the IndexedDB-backed adapter.
- Corrupt v1 migration records throw `LocalPersistenceError` instead of being silently ignored, and the migration keeps legacy records untouched on failure.
- Application use cases map repository failures into user-visible unavailable states.
- Component tests cover loading, empty, error, and destructive-confirmation behavior for implemented screens.
- Integration coverage exercises create recipe, search, scale servings, add to the planner board, move a planned entry, and reopen persisted data.

## Follow-Up Triggers

Create a new gap before release if:

- recipe lists grow beyond a few hundred local records and filtering becomes visibly slow;
- app-managed photo blobs are stored locally, because binary media needs explicit IndexedDB blob handling and backup behavior;
- mobile conversion introduces route transitions or native storage adapters with different performance behavior.
