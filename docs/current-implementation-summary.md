# LaCucina Current Implementation Summary

This document summarizes what is currently implemented in LaCucina so chefs, product collaborators, and software architects can review the MVP and suggest improvements.

## Short Product Summary

LaCucina is currently a web-first MVP optimized for smartphone-sized screens. The goal is to validate a private personal cookbook loop before converting the strongest parts into a native mobile app.

Core loop implemented today:

```text
save recipe -> organize recipe -> scale portions -> cook from detail -> add recipe to meal plan -> optionally export recipe text
```

Current product boundaries:

- Private personal cookbook first.
- No accounts or authentication.
- Local-only browser storage.
- No backend sync.
- No public recipe publishing.
- No marketplace, subscriptions, creator profiles, calories, macros, social feed, or Freak Mode.
- Sharing is limited to text export/native share or clipboard fallback.

## Implemented User Flows

### Recipes

Users can:

- view saved recipes;
- search recipes by title or tag;
- filter to favorites;
- add a recipe;
- edit a recipe;
- add, duplicate, remove, and reorder multiple ingredient rows;
- add, duplicate, remove, and reorder multiple preparation steps;
- capture ingredient group labels and prep notes;
- capture prep time, cook time, and recipe notes in the form;
- delete a recipe after confirmation;
- open recipe detail;
- change target servings and see scaled ingredients;
- distinguish scaled quantity from original/base quantity;
- export/share a private text version of a recipe.

Current recipe form supports dynamic ingredient and step collections. The domain model stores these as arrays.

### Cookbook Organization

Users can:

- view available cookbooks;
- view nested categories;
- create a root category;
- rename a selected category;
- delete an empty category after confirmation;
- assign saved recipes to a selected category;
- remove assigned recipes from a selected category.

The domain model supports nested category trees. The current UI exposes category selection and management, but does not yet provide drag-and-drop ordering or advanced category editing.

### Meal Planner

Users can:

- view the current meal plan;
- plan on a flexible board with `weekly`, `rolling7`, `month`, or `customLoop` presets;
- optionally set a local `YYYY-MM-DD` board start date;
- configure board slot templates and custom loop day labels;
- add saved recipes to board days with servings, slot template, custom slot, or no slot;
- mark planned board entries as `cook`, `eat`, or `prep`;
- update servings, move board entries between days/slots, and remove board entries;
- switch to reusable `Templates` mode for the original training/non-training loop;
- add loop days, add saved recipes to loop templates, update servings, move entries, and remove entries;
- see empty-day, loading, error, and per-action error states.

The seed plan includes:

- `Training Day`
- `Non-training Day`

### Local Persistence

The browser app persists:

- recipes;
- cookbooks/categories;
- meal plans.

Persistence uses IndexedDB schema v2 for rich records. The migration marker is:

```text
lacucina:schema-version = 2
```

Legacy schema v1 collection keys:

- `lacucina:recipes`
- `lacucina:cookbooks`
- `lacucina:meal-plans`

Current schema v2 stores rich records in IndexedDB:

- database: `lacucina`
- version: `2`
- stores: `recipes`, `cookbooks`, `mealPlans`

After a successful v1-to-v2 migration, active rich records are copied into IndexedDB, `lacucina:schema-version = 2` is written, and legacy rich `localStorage` collection keys are removed. If legacy JSON is corrupt or IndexedDB writes fail, the migration leaves the v1 marker and legacy records untouched.

Small local state still in `localStorage`:

- `lacucina:cook-sessions`

The current implementation stores recipe photo references only. Actual app-managed image blobs should move to IndexedDB before real photo storage is added.

## Architecture Overview

The code follows a layered structure:

- `src/app` - app entry, providers, routing, shell.
- `src/core` - shared result type, config, local storage utilities, presentation primitives.
- `src/features/recipes` - recipe domain, use cases, data adapters, screens.
- `src/features/cookbooks` - cookbook/category domain, use cases, data adapters, screen.
- `src/features/planner` - meal planner domain, use cases, data adapters, screen.
- `docs` - product, architecture, data, privacy, QA, and release notes.

Layer intent:

- Domain code is pure business logic.
- Application code exposes use cases and maps errors.
- Data code implements repositories and local adapters.
- Presentation code renders React screens and calls use cases.
- UI does not directly call local storage.

## Core Shared Types

### `Result<TValue, TError>`

Location: `src/core/result/Result.ts`

Used across domain and application layers to avoid throwing for expected business failures.

Fields:

- `ok: true`, `value: TValue` for success.
- `ok: false`, `error: TError` for failure.

Functions:

- `ok(value)` creates a success result.
- `err(error)` creates a failure result.

### Local Storage Utilities

Location: `src/core/data/localJsonCollection.ts`

Types:

- `KeyValueStore`
  - `getItem(key): string | null`
  - `setItem(key, value): void`
  - `removeItem(key): void`
- `LocalPersistenceErrorCode`
  - `storage-unavailable`
  - `schema-version-unsupported`
  - `records-corrupt`
  - `write-failed`

Classes:

- `LocalPersistenceError`
  - exposes `code`, `message`, and optional `cause`.
- `MemoryKeyValueStore`
  - in-memory test store matching browser storage shape.
- `LocalJsonCollection<TRecord extends { id: string }>`
  - `save(record)` inserts or replaces by `id`.
  - `getById(recordId)` returns one record.
  - `list()` returns all records.
  - `delete(recordId)` removes one record.
  - validates schema version on construction.
  - throws `LocalPersistenceError` for corrupted local records or unsupported schema.

### Local Database Utilities

Location: `src/core/data/localDatabase.ts`

Constants:

- `LOCAL_DATABASE_NAME = "lacucina"`
- `LOCAL_DATABASE_SCHEMA_VERSION = 2`
- `LOCAL_DATABASE_STORE_NAMES = ["recipes", "cookbooks", "mealPlans"]`

Types:

- `LocalDatabaseStoreName`
  - `recipes`
  - `cookbooks`
  - `mealPlans`
- `LocalDatabaseRecord`
  - `id: string`
- `LocalDatabase`
  - `get(storeName, recordId)`
  - `list(storeName)`
  - `put(storeName, record)`
  - `delete(storeName, recordId)`
- `LocalDatabaseErrorCode`
  - `database-unavailable`
  - `records-corrupt`
  - `write-failed`

Classes:

- `LocalDatabaseError`
  - exposes `code`, `message`, and optional `cause`.
- `MemoryLocalDatabase`
  - in-memory IndexedDB-shaped test double.
- `BrowserIndexedDbDatabase`
  - opens IndexedDB database `lacucina` at version `2`.
  - creates object stores `recipes`, `cookbooks`, and `mealPlans` with key path `id`.
  - closes stale connections on `versionchange`.
- `MigratingLocalDatabase`
  - wraps a `LocalDatabase`.
  - runs the configured migration once before the first read/write.
  - allows retry if the migration fails.

### Local Data Migration

Location: `src/app/providers/localDataMigration.ts`

Constants:

- `LOCAL_SCHEMA_VERSION_KEY = "lacucina:schema-version"`
- `LOCAL_SCHEMA_VERSION_V1 = "1"`
- `LOCAL_SCHEMA_VERSION_V2 = "2"`
- `LEGACY_LOCAL_STORAGE_KEYS`
  - `recipes: "lacucina:recipes"`
  - `cookbooks: "lacucina:cookbooks"`
  - `mealPlans: "lacucina:meal-plans"`

Types:

- `LocalDataMigrationSeeds`
  - `recipes`
  - `cookbooks`
  - `mealPlans`
- `LocalDataMigrationOptions`
  - `storage`
  - `database`
  - `seeds`

Function:

- `migrateLocalDataToSchemaV2(options)`
  - no-ops when the marker is already `2`.
  - rejects unsupported schema markers.
  - reads v1 rich records from legacy `localStorage` keys.
  - writes recipes, cookbooks, and meal plans into IndexedDB stores.
  - seeds a fresh install into IndexedDB.
  - writes marker `2` only after database writes succeed.
  - removes active legacy rich `localStorage` keys only after success.
  - preserves v1 records and marker when corrupt JSON or database writes fail.

## Recipe Domain

Location: `src/features/recipes/domain/recipe.ts`

### Fields

`RecipeDifficulty`

- `beginner`
- `intermediate`

`RecipePhoto`

- `localId: string` - local photo reference.
- `altText?: string` - optional accessibility description.

`Ingredient`

- `name: string`
- `quantity: number`
- `unit: string`
- `note?: string`
- `group?: string`
- `scaleMode?: IngredientScaleMode`

`IngredientScaleMode`

- `linear`
- `integer`
- `fixed`
- `toTaste`
- `panDependent`

`RecipeStep`

- `position: number`
- `text: string`

`RecipePracticalGuidance`

- `prepAhead?: string`
- `refrigeratorStorage?: string`
- `freezerStorage?: string`
- `reheating?: string`
- `holding?: string`
- `leftoverUse?: string`

`WarningVerificationStatus`

- `unverified`
- `estimated`
- `userVerified`

`BigNineAllergen`

- `milk`
- `eggs`
- `fish`
- `crustaceanShellfish`
- `treeNuts`
- `peanuts`
- `wheat`
- `soybeans`
- `sesame`

`RecipeAllergenFlag`

- `allergen: BigNineAllergen`
- `status: WarningVerificationStatus`

`RecipeDietaryFlag`

- `label: string`
- `status: WarningVerificationStatus`

`RecipeDietaryMetadata`

- `allergens: ReadonlyArray<RecipeAllergenFlag>`
- `dietaryTags: ReadonlyArray<RecipeDietaryFlag>`

`NutritionStatus`

- `notCalculated`
- `estimated`
- `partiallyMapped`
- `userVerified`

`NutritionMetric`

- `calories`
- `protein`
- `carbs`
- `fat`
- `fiber`
- `sodium`

`NutritionUnit`

- `kcal`
- `g`
- `mg`

`RecipeNutritionValue`

- `amount: number`
- `unit: NutritionUnit`
- `status: NutritionStatus`
- `source: string`

`RecipeNutritionEstimate`

- optional values keyed by `NutritionMetric`

`Recipe`

- `id: string`
- `title: string`
- `description: string`
- `baseServings: number`
- `ingredients: ReadonlyArray<Ingredient>`
- `steps: ReadonlyArray<RecipeStep>`
- `cookbookId: string`
- `categoryPath: ReadonlyArray<string>`
- `tags: ReadonlyArray<string>`
- `prepTimeMinutes?: number`
- `cookTimeMinutes?: number`
- `difficulty: RecipeDifficulty`
- `notes?: string`
- `guidance?: RecipePracticalGuidance`
- `dietary?: RecipeDietaryMetadata`
- `nutrition?: RecipeNutritionEstimate`
- `isFavorite: boolean`
- `photo?: RecipePhoto`
- `createdAt: string`
- `updatedAt: string`

`RecipeInput` is the input shape for creating/updating recipes. It allows optional `description`, `categoryPath`, `tags`, `notes`, `guidance`, `dietary`, `nutrition`, `isFavorite`, and `photo`.

### Validation Errors

`RecipeValidationErrorCode`

- `recipe-id-required`
- `recipe-title-required`
- `recipe-base-servings-invalid`
- `recipe-cookbook-required`
- `recipe-ingredients-required`
- `ingredient-name-required`
- `ingredient-quantity-invalid`
- `ingredient-unit-required`
- `ingredient-scale-mode-invalid`
- `recipe-steps-required`
- `recipe-step-invalid`
- `recipe-time-invalid`
- `recipe-allergen-invalid`
- `recipe-dietary-flag-invalid`
- `recipe-nutrition-invalid`
- `recipe-date-required`

`RecipeValidationError`

- `code`
- `message`
- `path`

### Functions

`createRecipe(input: RecipeInput)`

- Validates a recipe input.
- Trims text fields.
- Defaults missing description to empty string.
- Defaults missing tags to empty array.
- Normalizes tags to lower-case unique values.
- Normalizes guidance, dietary metadata, and nutrition source labels.
- Defaults `isFavorite` to `false`.
- Returns `Result<Recipe, RecipeValidationError[]>`.

## Portion Scaling Domain

Location: `src/features/recipes/domain/portionScaling.ts`

`ScaledIngredient`

- All `Ingredient` fields.
- `originalQuantity: number`
- `scaledQuantity: number`
- `scaleMode: IngredientScaleMode`
- `scalingBehavior: linear | rounded | fixed | toTaste | panDependent`
- `guidance?: string`
- `warning?: string`

`PortionScalingErrorCode`

- `base-servings-invalid`
- `target-servings-invalid`
- `ingredient-quantity-invalid`

Functions:

- `scaleRecipeIngredients(recipe, targetServings)`
  - scales each ingredient from `recipe.baseServings` to `targetServings`.
  - keeps original quantity available as `originalQuantity`.
  - applies ingredient-level scale modes for linear, integer, fixed, to-taste, and pan-dependent behavior.
  - returns `Result<ReadonlyArray<ScaledIngredient>, PortionScalingError>`.
- `scaleQuantity(originalQuantity, baseServings, targetServings)`
  - formula: `originalQuantity * targetServings / baseServings`.
- `roundScaledQuantity(quantity, decimalPlaces = 2)`
  - rounds using 2 decimals by default.
- `formatScaledQuantity(quantity)`
  - returns clean display text like `2`, `1.5`, or `1.25`.

## Nutrition Domain

Location: `src/features/recipes/domain/nutrition.ts`

`nutritionMetricDefinitions`

- Defines calories, protein, carbs, fat, fiber, and sodium display labels and units.

Functions:

- `getRecipeNutritionSummary(recipe)`
  - returns available nutrition values per recipe and per base serving;
  - preserves status and source labels.
- `getPlannedNutritionSummary(recipe, plannedServings)`
  - scales per-serving nutrition estimates to a planned serving count.
- `formatNutritionAmount(amount)`
  - formats whole numbers and one-decimal nutrition values.
- `nutritionStatusLabel(status)`
  - converts internal statuses to display labels.

## Recipe Application Use Cases

Location: `src/features/recipes/application/recipeUseCases.ts`

`RecipeFilters`

- `searchTerm?: string`
- `cookbookId?: string`
- `categoryPath?: ReadonlyArray<string>`
- `tag?: string`
- `favoriteOnly?: boolean`

`RecipeUseCaseErrorCode`

- `validation`
- `not-found`
- `repository`

Use cases:

- `createRecipe(input)`
  - validates with `createRecipe`.
  - saves via repository.
- `updateRecipe(input)`
  - checks recipe exists.
  - validates replacement input.
  - saves via repository.
- `deleteRecipe(recipeId)`
  - checks recipe exists.
  - deletes via repository.
- `getRecipeDetails(recipeId)`
  - loads one recipe.
- `listRecipes(filters?)`
  - filters by title/description search term, cookbook, category path, tag, and favorite flag.
- `previewPortions(recipeId, targetServings)`
  - loads recipe and returns scaled ingredients without mutating base recipe.

Repository failures are converted to `code: repository` with message `Recipe storage is unavailable.`

## Cook Session Use Cases

Location: `src/features/recipes/application/cookSessionUseCases.ts`

`CookSession`

- `recipeId: string`
- `currentStepPosition: number`
- `completedStepPositions: ReadonlyArray<number>`
- `updatedAt: string`

Use cases:

- `loadSession(recipeId)`
- `saveSession(session)`
- `clearSession(recipeId)`

Stores:

- `MemoryCookSessionStore` for tests/default in-memory app dependencies.
- `LocalCookSessionStore` for browser persistence in `localStorage`.

## Recipe Export/Share Use Cases

Location: `src/features/recipes/application/recipeExportUseCases.ts`

`RecipeExportPayload`

- `title: string`
- `text: string`

`RecipeSharePort`

- `shareText(payload)`

`RecipeExportErrorCode`

- `not-found`
- `validation`
- `share-unavailable`

Use cases:

- `exportRecipeText(recipeId, targetServings)`
  - loads recipe.
  - generates scaled ingredient preview.
  - formats private text export with yield, prep/cook/total time, grouped ingredients, prep notes, steps, notes, and storage/leftover guidance.
  - explicitly states no public publishing link was created.
- `shareRecipe(recipeId, targetServings)`
  - creates text export.
  - sends it through the configured share adapter.

Current web share adapter:

- Uses `navigator.share` when available.
- Falls back to `navigator.clipboard.writeText`.
- Returns `share-unavailable` if neither is available or if sharing fails.

## Cookbook Domain

Location: `src/features/cookbooks/domain/cookbook.ts`

### Fields

`CategoryNode`

- `id: string`
- `name: string`
- `recipeIds: ReadonlyArray<string>`
- `children: ReadonlyArray<CategoryNode>`

`Cookbook`

- `id: string`
- `name: string`
- `categories: ReadonlyArray<CategoryNode>`
- `createdAt: string`
- `updatedAt: string`

`CategoryInput`

- `id: string`
- `name: string`
- `parentCategoryId?: string`

### Validation Errors

`CookbookErrorCode`

- `cookbook-id-required`
- `cookbook-name-required`
- `cookbook-date-required`
- `category-id-required`
- `category-name-required`
- `category-duplicate-name`
- `category-not-found`
- `category-not-empty`
- `recipe-id-required`
- `recipe-already-assigned`

### Functions

- `createCookbook(input)`
  - validates cookbook and nested categories.
  - trims fields.
  - normalizes recipe IDs.
- `addCategory(cookbook, input)`
  - creates root or child category.
  - blocks empty names/IDs and duplicate sibling names.
- `renameCategory(cookbook, categoryId, nextName)`
  - renames category if found.
  - blocks duplicate sibling names.
- `assignRecipeToCategory(cookbook, categoryId, recipeId)`
  - assigns recipe ID to category.
  - blocks missing category, empty recipe ID, and duplicate assignment.
- `removeRecipeFromCategory(cookbook, categoryId, recipeId)`
  - removes recipe ID from category.
- `deleteCategory(cookbook, categoryId)`
  - deletes only empty categories.
  - blocks deletion if category has recipes or child categories.
- `findCategory(categories, categoryId)`
  - recursively finds a category node.

## Cookbook Category Path Options

Location: `src/features/cookbooks/domain/categoryPathOptions.ts`

`CategoryPathOption`

- `cookbookId: string`
- `categoryId: string`
- `label: string`
- `path: ReadonlyArray<string>`

Functions:

- `flattenCategoryPathOptions(cookbooks)`
  - flattens nested cookbook category trees into selectable category paths;
  - prefixes labels with cookbook names when multiple cookbooks are available.

## Cookbook Application Use Cases

Location: `src/features/cookbooks/application/cookbookUseCases.ts`

`CookbookUseCaseErrorCode`

- `validation`
- `not-found`
- `repository`

Use cases:

- `createCookbook(input)`
- `listCookbooks()`
- `createCategory(cookbookId, input)`
- `renameCategory(cookbookId, categoryId, nextName)`
- `deleteCategory(cookbookId, categoryId)`
- `assignRecipe(cookbookId, categoryId, recipeId)`
- `unassignRecipe(cookbookId, categoryId, recipeId)`

Repository failures are converted to `code: repository` with message `Cookbook storage is unavailable.`

## Meal Planner Domain

Location: `src/features/planner/domain/mealPlan.ts`

### Fields

`LoopDayPreset`

- `training`
- `nonTraining`
- `custom`

`MealPlanEntry`

- `id: string`
- `recipeId: string`
- `servings: number`

`LoopDay`

- `id: string`
- `label: string`
- `preset: LoopDayPreset`
- `entries: ReadonlyArray<MealPlanEntry>`

`MealPlan`

- `id: string`
- `name: string`
- `loopDays: ReadonlyArray<LoopDay>`
- `board?: PlannerBoard`
- `createdAt: string`
- `updatedAt: string`

`PlannerBoardPreset`

- `weekly`
- `rolling7`
- `month`
- `customLoop`

`PlannedMealEntryContext`

- `cook`
- `eat`
- `prep`

`PlannerSlotTemplate`

- `id: string`
- `label: string`

`PlannerBoardEntry`

- `id: string`
- `recipeId: string`
- `servings: number`
- `slotId?: string`
- `customSlotLabel?: string`
- `context?: PlannedMealEntryContext`

`PlannerDayBucket`

- `id: string`
- `label: string`
- `date?: string`
- `entries: ReadonlyArray<PlannerBoardEntry>`

`PlannerBoard`

- `preset: PlannerBoardPreset`
- `startDate?: string`
- `slotTemplates: ReadonlyArray<PlannerSlotTemplate>`
- `days: ReadonlyArray<PlannerDayBucket>`

Default board slots are `Breakfast`, `Lunch`, `Dinner`, and `Snack`.

### Validation Errors

`MealPlanErrorCode`

- `plan-id-required`
- `plan-name-required`
- `plan-date-required`
- `day-id-required`
- `day-label-required`
- `day-not-found`
- `entry-id-required`
- `recipe-id-required`
- `servings-invalid`
- `entry-not-found`
- `board-preset-invalid`
- `board-date-invalid`
- `board-day-id-required`
- `board-day-label-required`
- `board-day-not-found`
- `board-slot-id-required`
- `board-slot-label-required`
- `board-slot-not-found`
- `board-entry-not-found`
- `board-context-invalid`

### Functions

- `createMealPlan(input)`
  - validates plan, loop days, board, entries, dates, IDs, slots, context, and servings.
- `normalizeMealPlan(input)`
  - returns a fully normalized plan and maps legacy loop-only plans into a compatible `customLoop` board.
- `configurePlannerBoard(plan, input)`
  - builds or replaces the board from a preset, optional local start date, optional custom day labels, and optional slot templates.
- `addLoopDay(plan, input)`
  - adds a loop day with preset and empty entries.
- `addMealPlanEntry(plan, dayId, input)`
  - adds recipe entry to a day.
- `addPlannerBoardEntry(plan, dayId, input)`
  - adds a recipe entry to a board bucket with template slot, custom slot, no slot, and optional context.
- `changeMealPlanEntryServings(plan, entryId, servings)`
  - updates servings for one planned entry.
- `changePlannerBoardEntryServings(plan, entryId, servings)`
  - updates servings for one board entry.
- `removeMealPlanEntry(plan, entryId)`
  - removes one planned entry.
- `removePlannerBoardEntry(plan, entryId)`
  - removes one board entry.
- `moveMealPlanEntry(plan, entryId, targetDayId)`
  - moves a planned entry to another loop day.
- `movePlannerBoardEntry(plan, entryId, input)`
  - moves a board entry to another day and slot/custom slot/no slot.
- `findLoopDay(plan, dayId)`
  - finds one loop day.
- `findPlannerBoardDay(plan, dayId)`
  - finds one board bucket.
- `getEmptyLoopDays(plan)`
  - returns loop days with no planned entries.
- `getEmptyPlannerBoardDays(plan)`
  - returns board buckets with no board entries.

## Meal Planner Application Use Cases

Location: `src/features/planner/application/mealPlanUseCases.ts`

`MealPlanUseCaseErrorCode`

- `validation`
- `not-found`
- `repository`

Use cases:

- `createPlan(input)`
- `loadPlan(planId)`
- `listPlans()`
- `configureBoard(planId, input)`
- `addBoardEntry(planId, dayId, input)`
  - verifies referenced recipe exists before adding to the board.
- `changeBoardEntryServings(planId, entryId, servings)`
- `moveBoardEntry(planId, entryId, input)`
- `removeBoardEntry(planId, entryId)`
- `getEmptyBoardDays(planId)`
- `addDay(planId, input)`
- `addSavedRecipeToDay(planId, dayId, input)`
  - verifies referenced recipe exists before adding.
- `changeServings(planId, entryId, servings)`
- `moveEntry(planId, entryId, targetDayId)`
- `removeEntry(planId, entryId)`
- `getEmptyDays(planId)`

`loadPlan()` and `listPlans()` normalize legacy loop-only records before returning them. Repository failures are converted to `code: repository` with message `Meal plan storage is unavailable.`

## Repository Interfaces and Data Adapters

### Repository Interfaces

Recipe repository:

- `save(recipe)`
- `getById(recipeId)`
- `list()`
- `delete(recipeId)`

Cookbook repository:

- `save(cookbook)`
- `getById(cookbookId)`
- `list()`
- `delete(cookbookId)`

Meal plan repository:

- `save(plan)`
- `getById(planId)`
- `list()`
- `delete(planId)`

### Implementations

In-memory repositories:

- `InMemoryRecipeRepository`
- `InMemoryCookbookRepository`
- `InMemoryMealPlanRepository`

Legacy localStorage repositories:

- `LocalRecipeRepository`
- `LocalCookbookRepository`
- `LocalMealPlanRepository`

IndexedDB schema v2 repositories:

- `IndexedDbRecipeRepository`
- `IndexedDbCookbookRepository`
- `IndexedDbMealPlanRepository`

Mappers:

- `recipeToRecord`, `recipeFromRecord`
- `cookbookToRecord`, `cookbookFromRecord`
- `mealPlanToRecord`, `mealPlanFromRecord`

Current mapper behavior is intentionally simple: records match domain shapes, are cloned on boundaries, and meal plan records are normalized so older loop-only plans gain a backward-compatible `customLoop` board.

## App Composition

Location: `src/app/providers/appDependencies.ts`

`AppDependencies`

- `appConfig`
- `recipeUseCases`
- `recipeExportUseCases`
- `cookbookUseCases`
- `mealPlanUseCases`

Factory functions:

- `createDefaultAppDependencies()`
  - creates in-memory repositories for tests and non-browser rendering.
- `createBrowserAppDependencies(storage, database?)`
  - wraps the database in `MigratingLocalDatabase`.
  - migrates schema v1 `localStorage` rich records to IndexedDB schema v2 before repository access.
  - wires IndexedDB repositories to browser storage.
  - keeps cook-session progress in `localStorage`.
  - wires web share adapter to `window.navigator`.

Seed data:

- Recipe: `Tomato rice`
  - base servings: `2`
  - ingredient: `200 g Rice`
  - category path: `Dinner / Quick meals`
  - favorite: `true`
- Cookbook: `Home cookbook`
  - category `Dinner`
  - child category `Quick meals`
- Meal plan: `Training loop`
  - `Training Day` with Tomato rice for 2 servings.
  - `Non-training Day` empty.

## Routes and Screens

Routes:

- `recipes`
- `recipe-detail`
- `recipe-create`
- `recipe-edit`
- `cookbooks`
- `planner`

There is no auth route guard because the MVP has no account model.

### Recipe List Screen

Props:

- `recipeUseCases`
- `onCreateRecipe`
- `onOpenRecipe`
- `onEditRecipe`

States:

- loading
- error
- empty
- populated
- no search matches

UI features:

- search input;
- favorites checkbox;
- recipe cards;
- add recipe button;
- edit buttons.

### Recipe Detail Screen

Props:

- `recipeId`
- `recipeUseCases`
- `recipeExportUseCases`
- `cookSessionUseCases`
- `onBack`
- `onEdit`

States:

- loading
- missing recipe
- error
- ready
- export success
- export error
- cook mode active

UI features:

- selected cookbook category path;
- title and description;
- target servings input;
- grouped scaled ingredients with base quantities and prep notes;
- steps;
- guided cook mode with large step card, previous/next controls, completion checkbox, and persisted current step;
- notes;
- user-entered storage, reheating, prep-ahead, holding, and leftover guidance;
- user-entered Big 9 allergen flags and dietary tags with verification status labels;
- manual nutrition estimates per recipe and per serving with status/source labels;
- export recipe button.

### Recipe Form Screen

Props:

- `recipeUseCases`
- `mode: create | edit`
- `recipeId?`
- `onCancel`
- `onSaved`
- `onDeleted?`

Form fields:

- title;
- description;
- base servings;
- ingredient rows with name, quantity, unit selector, group, and prep note;
- preparation step rows;
- prep minutes;
- cook minutes;
- category picker from cookbook categories;
- tags;
- local photo reference;
- difficulty;
- recipe notes;
- prep-ahead notes;
- refrigerator storage;
- freezer storage;
- reheating notes;
- holding notes;
- leftover ideas;
- Big 9 allergen checkboxes;
- per-allergen warning status;
- comma-separated dietary tags;
- dietary tag warning status;
- calories, protein, carbs, fat, fiber, and sodium estimate amounts;
- per-nutrition-value status;
- per-nutrition-value source label;
- favorite.

Row controls:

- add ingredient or step;
- duplicate ingredient or step;
- remove ingredient or step while keeping at least one row;
- move ingredient or step up/down with keyboard-accessible buttons.

Delete flow:

- first click shows confirmation;
- second click performs deletion.

### Cookbook Manager Screen

Props:

- `cookbookUseCases`
- `recipeUseCases`
- `onChanged`

States:

- loading
- error
- no cookbook
- ready
- per-action errors
- no categories
- no selected category
- no assigned recipes

UI features:

- cookbook selector;
- nested category tree;
- create category;
- rename selected category;
- assign recipe to category;
- remove recipe from category;
- delete selected empty category with confirmation.

### Planner Screen

Props:

- `mealPlanUseCases`
- `recipeUseCases`
- `onChanged`

States:

- loading;
- error;
- no meal plan;
- ready;
- per-action errors;
- empty board/template day.

UI features:

- plan selector;
- `Board` and `Templates` tabs;
- board preset selector for `weekly`, `rolling7`, `month`, and `customLoop`;
- optional board start date input;
- board slot template configuration;
- custom loop day label configuration;
- mobile day cards rendered as a list/grid, including the month preset as day groups rather than a desktop calendar;
- add saved recipe to a board day;
- choose servings, slot template/custom slot/no slot, and `cook`/`eat`/`prep` context for a new board entry;
- update board entry servings;
- move board entries with target day and target slot selects plus a `Move` button;
- remove board entries;
- add loop template days;
- add saved recipes to loop template days;
- update, move, and remove template entries;
- show planned nutrition summaries when a recipe has manual estimates.

## Shared UI Components

Location: `src/core/presentation`

`LoadingView`

- renders loading state with `role="status"`.

`EmptyView`

- renders empty-state title, message, and optional action.

`ErrorView`

- renders error state with `role="alert"` and optional action.

`ConfirmActionButton`

- shows an initial button;
- requires a second confirmation click before calling `onConfirm`;
- used for destructive actions.

## Quality and Verification

Current checks:

```sh
npm run quality
```

This runs:

- ESLint;
- Prettier check;
- Vitest tests;
- TypeScript build;
- Vite production build.

Latest known passing state:

- 29 test files.
- 89 tests.
- Production build passes.

Coverage includes:

- domain validation;
- portion scaling;
- cookbook/category lifecycle;
- planner lifecycle, flexible board presets, slots, moves, and legacy normalization;
- repository persistence across restart;
- corrupted local records;
- route navigation;
- recipe list/search/filter states;
- recipe form create/edit/delete;
- recipe detail scaling and export states;
- cookbook management UI;
- planner UI;
- full MVP integration flow:
  - create recipe;
  - find recipe;
  - scale servings;
  - add recipe to planner board;
  - move planned board entry;
  - reopen persisted data.

## Current Limitations

Functional limitations:

- Recipes still store selected organization as `categoryPath`; a stable category ID schema is deferred to a later migration.
- Storage and leftover guidance is user-entered only; the app does not make food-safety guarantees.
- Allergen and dietary metadata is user-entered only; the app does not guarantee allergy safety or medical suitability.
- Nutrition estimates are manual/local only; no automatic food database mapping or medical diet targets exist yet.
- Cookbook UI creates root categories only; nested category creation exists in domain but is not exposed in UI.
- Category deletion only works for empty categories.
- Planner is a local flexible board, not a system calendar; there are no calendar APIs, reminders, notifications, sync, or drag-and-drop.
- Planner board entries are ready as a source for shopping lists, but shopping list generation is still pending.
- Text export is private; no public link or hosted page exists.
- Photo support is a local reference only; no actual upload or image blob storage exists.

Technical limitations:

- Local persistence is browser/device-local only; there is still no account sync, backup export, or cross-device recovery.
- IndexedDB stores recipe photo references only; actual image blob persistence still needs dedicated blob handling.
- No automated axe accessibility audit is configured yet.
- No native iOS/Android implementation yet.
- No backend sync, auth, or multi-device recovery.
- No analytics or production observability.

## Questions for Chefs

Use these to guide culinary feedback:

- Are the current recipe fields enough to cook reliably from a saved recipe?
- Should ingredients support preparation notes such as diced, softened, room temperature, divided, or optional?
- Should ingredient groups be visible in the UI, for example sauce, dough, filling, garnish?
- Is linear portion scaling acceptable for common recipes, or should some ingredients scale differently?
- Which units and measurements must be supported first for real kitchens?
- Should recipe steps support timers, temperatures, pan sizes, doneness cues, or equipment?
- What information is missing when cooking under time pressure?
- Is training/non-training meal planning meaningful, or should the first planner be weekly/menu based?
- Are the current leftovers, batch cooking, and prep-ahead note fields enough for real planning?
- Which dietary tags should be first-class options instead of free-form labels?
- Is the current unverified/estimated/user-verified status enough for allergen review?
- Which nutrition values should be required, optional, or hidden for casual cooks?
- What would make the export format useful to share with another cook?

## Questions for Architects

Use these to guide technical/product architecture feedback:

- Should dynamic recipe rows get stable ingredient/step IDs before schema v3?
- What backup/export strategy should sit on top of IndexedDB before real users depend on it?
- What migration strategy should be used after schema version `2`?
- Should recipe category assignment be normalized through cookbook category IDs instead of a free-text `categoryPath`?
- Should planner entries snapshot recipe title/servings at planning time, or always reference latest recipe data?
- What is the right future boundary for auth/sync without polluting the local-first MVP?
- Should public publishing become a separate bounded context from private cookbook data?
- What entities need stable IDs for eventual mobile/offline sync?
- What should be event-sourced or auditable, if anything?
- Which parts of the web MVP are safe to reuse in React Native or another mobile framework?

## Best Next Product Ideas

High-value next improvements:

- Category picker connected to real cookbook categories.
- Nested category creation in UI.
- Planner move-entry UI.
- IndexedDB blob handling before real photo storage.
- Accessibility audit with automated tooling.
- Mobile conversion spike once the recipe and planner loops feel right.
