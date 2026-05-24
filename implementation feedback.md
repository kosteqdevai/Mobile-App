# LaCucina Implementation Feedback

**Prepared:** May 23, 2026  
**Review lens:** Senior Executive Chef → Expert Dietician → Senior Application Architect  
**Source implementation document:** `current-implementation-summary.md`  
**Recommended product direction:** Move from a private cookbook MVP to a **local-first cooking, planning, shopping, and nutrition-aware kitchen assistant**.

---

## 1. Executive Verdict

LaCucina has the correct foundation: a private cookbook loop, layered architecture, domain/use-case/repository boundaries, recipe scaling, cookbook organization, meal planning, and private recipe export. The app should **not** expand into public publishing, creator profiles, subscriptions, marketplace features, or social feeds yet.

The main issue is that the current MVP is **too shallow at the actual kitchen workflow**. The product can store simple recipe data, but it does not yet fully support how people actually cook, prep, scale, plan, shop, manage leftovers, or evaluate food safety and dietary constraints.

The next implementation should focus on five outcomes:

1. **Recipe capture fidelity** — users must be able to save a real recipe with multiple ingredients, grouped components, multiple steps, timing, equipment, notes, storage, and prep-ahead guidance.
2. **Cooking execution** — users should be able to cook from the app with guided steps, timers, checklists, doneness cues, heat/temperature guidance, and safety reminders.
3. **Practical meal planning** — planning should support weekly/calendar planning, recurring loops, meal slots, batch cooking, leftovers, and planned cook/eat dates.
4. **Kitchen usefulness** — meal plans should generate shopping lists, preserve ingredient context, combine duplicates, and support grocery categories.
5. **Safe nutrition awareness** — add allergens, dietary tags, and estimated nutrition in a conservative, transparent way before attempting advanced macro or diet-goal features.

The revised core loop should become:

```text
capture recipe
-> structure ingredients and steps
-> organize into cookbooks/categories
-> cook in guided mode
-> scale intelligently
-> plan meals and prep
-> generate shopping list
-> manage leftovers
-> optionally estimate nutrition/allergen impact
-> export or back up privately
```

---

## 2. Current Implementation Reading

The uploaded implementation summary describes LaCucina as a web-first MVP optimized for smartphone-sized screens. The current core loop is:

```text
save recipe -> organize recipe -> scale portions -> cook from detail -> add recipe to meal plan -> optionally export recipe text
```

Current product boundaries are appropriate for the MVP:

- private personal cookbook first;
- no accounts or authentication;
- local-only browser storage;
- no backend sync;
- no public publishing;
- no marketplace, subscriptions, creator profiles, calories, macros, social feed, or Freak Mode;
- sharing limited to native text share or clipboard fallback.

Important implementation facts:

- The recipe domain already supports arrays of ingredients and steps.
- The current recipe form UI only exposes one ingredient row and one preparation step.
- Recipe fields include title, description, base servings, ingredients, steps, cookbook ID, category path, tags, prep/cook time, difficulty, notes, favorite state, photo reference, and timestamps.
- Portion scaling is currently linear: original quantity multiplied by target servings divided by base servings.
- Cookbook categories support nested category trees, but the UI does not yet expose all advanced category operations.
- The planner currently uses loop days, with seed examples of `Training Day` and `Non-training Day`.
- Planner move-entry behavior exists in the domain/application layer but is not exposed in the UI.
- Persistence uses versioned browser `localStorage` collections with schema marker `lacucina:schema-version = 1`.
- Recipe photo support is only a local reference today; real image blobs should move to IndexedDB before actual app-managed photo storage.
- The architecture is layered correctly: domain logic, application use cases, repositories/adapters, and presentation are separated.
- Current checks include ESLint, Prettier, Vitest, TypeScript build, and Vite production build.
- The latest known implementation has 23 test files, 60 tests, and a passing production build.

---

## 3. Product Repositioning

### Current Position

LaCucina is currently best described as:

> A private, local-only, web-first recipe notebook with basic cookbook organization, serving scaling, loop-based meal planning, and text export.

### Recommended Position

LaCucina should become:

> A private, local-first kitchen operating system that helps people save recipes, cook from them, scale them, plan meals, shop, handle leftovers, and understand dietary/nutrition implications without turning into a social platform or medical diet product.

### What This Means

The app should stay focused on **real cooking utility**, not growth features. The highest-value next release is not public sharing; it is making the saved recipe usable in a real kitchen.

Do not add these yet:

- public publishing;
- creator profiles;
- social feeds;
- marketplace features;
- subscriptions;
- creator monetization;
- AI-first recipe generation;
- native mobile rewrite before the web loop is stronger;
- full clinical diet planning;
- medical nutrition recommendations.

Add these instead:

- multi-ingredient and multi-step recipe forms;
- ingredient grouping;
- prep notes;
- cook mode;
- timers;
- equipment;
- doneness cues;
- safe-temperature cues;
- weekly planner;
- recurring templates;
- shopping list generation;
- leftovers and prep-ahead workflows;
- allergen and dietary tags;
- optional estimated nutrition;
- IndexedDB persistence;
- schema migration;
- accessibility automation.

---

# 4. Senior Executive Chef Review

## 4.1 Chef Diagnosis

The current app records recipes at a **note-taking level**, not yet at a **cook-from-this-confidently level**.

The biggest culinary issue is that the UI exposes only one ingredient row and one preparation step even though the domain supports ingredient and step arrays. That means the product cannot comfortably capture most real recipes. A real recipe often has 8–20 ingredients, several groups, and 5–15 steps. One ingredient and one step makes the form feel like a placeholder, not a serious cooking tool.

The current detail screen supports scaled ingredients, steps, notes, and export, but this is not the same as a real cook mode. In a real kitchen, the cook needs large readable text, step progress, timers, prep checklists, temperature reminders, equipment cues, and doneness cues.

## 4.2 Chef-Level App Scope Revisions

### P0: Recipe Form Must Support Real Recipes

The next implementation must make recipe ingredients and steps first-class editable collections in the UI.

Required form upgrades:

| Area | Required revision | Reason |
|---|---|---|
| Ingredients | Add, edit, delete, duplicate, and reorder multiple ingredient rows | Most recipes have many ingredients. |
| Ingredient groups | Sauce, dough, filling, garnish, marinade, spice mix, batter, dressing | Cooks think by components. |
| Prep notes | diced, minced, softened, room temperature, divided, optional, toasted, cooked, raw | The ingredient alone is not enough to execute correctly. |
| Quantity/unit controls | Unit picker, common fractions, metric/imperial support | Prevents inconsistent user-entered units. |
| Steps | Add, edit, delete, duplicate, and reorder multiple steps | Real instructions are sequential. |
| Step metadata | Timer, temperature, heat level, doneness cue, equipment | Converts recipe text into cookable guidance. |
| Time fields | Prep, cook, rest, inactive, total | Cooks plan by active/passive time. |
| Yield | Servings, pieces, trays, jars, loaves, grams, cups | “Servings” is too vague for many recipes. |
| Equipment | Pan size, pot size, blender, scale, thermometer | Equipment changes feasibility and outcome. |
| Storage | Refrigeration/freezer guidance, shelf life, reheating | Supports leftovers and meal planning. |
| Prep ahead | What can be made ahead and when | Essential for planning and hosting. |

### P0: Use Ingredient Groups Everywhere

Ingredient groups should be visible in:

- recipe form;
- recipe detail;
- cook mode;
- export/share text;
- shopping list source grouping;
- nutrition mapping review.

Example:

```text
Sauce
- 2 tbsp olive oil
- 3 cloves garlic, minced
- 1 cup crushed tomatoes

Main
- 600 g chicken thighs, trimmed
- 1 tsp kosher salt, divided

Garnish
- Basil leaves, optional
```

### P0: Add Mise en Place Support

Every recipe should support a clear prep section.

Recommended fields:

```ts
type MiseEnPlaceItem = {
  id: string;
  text: string;
  ingredientIds?: string[];
  equipmentIds?: string[];
  completed?: boolean;
};
```

Examples:

- Dice onion.
- Mince garlic.
- Preheat oven to 425°F.
- Line half-sheet tray with parchment.
- Bring butter to room temperature.
- Toast spices.

This is not just polish. It prevents mid-cook friction and makes the app usable under time pressure.

### P1: Add Real Cook Mode

Recipe detail is for reading. Cook Mode is for executing.

Cook Mode requirements:

| Feature | Recommendation |
|---|---|
| Large step cards | One step per view, readable from counter distance. |
| Ingredient checklist | User can check off mise en place before cooking. |
| Step checklist | User can track progress. |
| Timers | Timers attach to specific steps. |
| Temperature cues | Oven, internal, oil, water, refrigerator, resting temperature. |
| Heat level | Low, medium-low, medium, medium-high, high. |
| Equipment reminders | “Use 12-inch skillet” or “Use half-sheet tray.” |
| Doneness cues | “Golden brown,” “fork-tender,” “reduced by half,” “coats spoon.” |
| Safety cues | Poultry, ground meat, casseroles, reheated leftovers. |
| Pause/resume | Cooks get interrupted. |
| Progress persistence | User should not lose their place after navigating away. |
| Scaling warning | Warn when scaling affects pan size, cook time, or seasoning. |

### P1: Improve Portion Scaling

Current scaling is strictly linear. That is acceptable for simple ingredients but not enough for serious cooking.

Add ingredient-level `scaleMode`:

| Scale mode | Examples | Behavior |
|---|---|---|
| `linear` | rice, pasta, broth, chicken thighs | Scale normally. |
| `integer` | eggs, tortillas, buns, apples | Round to whole usable units. |
| `fixed` | bay leaf, cinnamon stick, garnish sprig | Do not scale automatically unless user overrides. |
| `toTaste` | salt, pepper, chili flakes, lemon juice | Show estimate but label “adjust to taste.” |
| `percentage` | baker’s formulas, brines, hydration | Scale from a base formula ratio. |
| `panDependent` | cakes, casseroles, sheet-pan meals | Warn about pan size/cook time changes. |
| `lossAdjusted` | trimmed meat, reduced sauces, fried foods | Account for yield or cooking loss when configured. |

Add smarter quantity formatting:

| Unit type | Display behavior |
|---|---|
| grams/ml | Round to useful kitchen precision. |
| teaspoons/tablespoons | Convert decimals to common fractions. |
| cups | Prefer 1/4, 1/3, 1/2, 2/3, 3/4 where possible. |
| count items | Whole numbers unless explicitly allowed. |
| salt/spices | Show “start with X; adjust after tasting.” |
| pinches/dashes | Do not decimal-scale. |

### P1: Add Prep-Ahead, Holding, Storage, and Leftover Guidance

Meal planning only becomes valuable when the app understands what happens before and after cooking.

Add fields:

| Field | Example |
|---|---|
| Prep-ahead notes | “Sauce can be made 3 days ahead.” |
| Storage notes | “Refrigerate up to 4 days.” |
| Freezer notes | “Freeze in 1-cup portions up to 3 months.” |
| Reheat notes | “Reheat covered with splash of stock.” |
| Holding notes | “Hold warm up to 30 minutes; stir before serving.” |
| Leftover transformation | “Use leftovers in fried rice, wraps, soup.” |
| Critical path | “Start rice before sautéing vegetables.” |

### P1: Improve Export for Real Cooks

Current export should evolve into a chef-usable plain-text recipe.

Recommended export format:

```text
Recipe Title
Yield: 4 servings / 1 sheet tray
Time: 20 min prep, 35 min cook, 10 min rest
Difficulty: Intermediate
Equipment: 12-inch skillet, thermometer, half-sheet tray

Ingredients
Sauce:
- 2 tbsp olive oil
- 3 cloves garlic, minced
- 1 cup crushed tomatoes

Main:
- 600 g chicken thighs, trimmed
- 1 tsp kosher salt, divided

Mise en place
- Dice onion.
- Mince garlic.
- Preheat oven to 425°F.

Steps
1. Heat skillet over medium-high heat.
   Timer: 5 min
   Doneness: chicken is deeply browned.
2. Roast until internal temperature reaches safe target.

Storage / leftovers
- Refrigerate within 2 hours.
- Reheat thoroughly.

Private export only. No public publishing link was created.
```

---

# 5. Expert Dietician Review

## 5.1 Dietician Diagnosis

The chef recommendations make the recipe cookable. The dietician layer should make the app safer and more useful for meal planning without pretending to be a clinical tool.

The implementation currently excludes calories and macros. That is acceptable for the MVP. However, once users plan meals, they will naturally ask questions such as:

- Does this meal contain allergens?
- Is this recipe appropriate for my household?
- How much protein is in this recipe?
- Is this day high sodium?
- Does this training-day plan have enough carbohydrates?
- Can I balance leftovers with fresh sides?

Nutrition should be added in tiers.

## 5.2 Nutrition Scope by Tier

### Tier 1: Allergen and Dietary Awareness

This should come before full calories/macros.

Add first-class flags for the “Big 9” common U.S. food allergens:

- milk;
- eggs;
- fish;
- crustacean shellfish;
- tree nuts;
- peanuts;
- wheat;
- soybeans;
- sesame.

Implementation requirements:

| Feature | Requirement |
|---|---|
| Recipe allergen flags | Recipe-level warning summary. |
| Ingredient allergen flags | Ingredient-level source of truth. |
| Manual override | User can mark a recipe safe/unsafe/unknown. |
| Verification state | `unverified`, `estimated`, `userVerified`. |
| Household profiles | Different household members can have different restrictions. |
| Dietary tags | Vegetarian, vegan, pescatarian, dairy-free, gluten-free candidate, nut-free candidate, halal-style, kosher-style, low-sodium candidate. |
| Confidence labels | Avoid false safety claims. |

Important product rule:

> The app should never imply that an allergen-free claim is guaranteed unless the user has manually verified it.

### Tier 2: Nutrition Estimates

Nutrition values should be added only after ingredient and serving-size data are reliable.

Recommended nutrition fields:

| Field | Per recipe | Per serving | Per planned day/week |
|---|---:|---:|---:|
| Calories | Yes | Yes | Yes |
| Protein | Yes | Yes | Yes |
| Carbohydrates | Yes | Yes | Yes |
| Fat | Yes | Yes | Yes |
| Saturated fat | Yes | Yes | Yes |
| Fiber | Yes | Yes | Yes |
| Sodium | Yes | Yes | Yes |
| Added sugar | When data exists | When data exists | When data exists |
| Key micronutrients | Optional | Optional | Optional |

Nutrition estimates must carry a status:

```ts
type NutritionStatus =
  | 'notCalculated'
  | 'estimated'
  | 'partiallyMapped'
  | 'userVerified';
```

Recommended data source strategy:

- Use manual nutrition entry first for MVP nutrition.
- Add FoodData Central ingredient mapping later.
- Store ingredient-to-food-data mappings separately from recipe text.
- Allow the user to correct mappings.
- Treat all computed nutrition as estimated unless verified.

### Tier 3: Meal Planning Guidance

Do not score food as “good” or “bad.” Show practical planning signals.

Useful signals:

| Signal | Example app copy |
|---|---|
| Protein distribution | “Dinner is protein-heavy; lunch is light.” |
| Vegetable coverage | “Only one planned meal includes vegetables today.” |
| Fiber opportunity | “Add beans, whole grains, vegetables, or fruit.” |
| Sodium flag | “This planned day may be high sodium based on mapped ingredients.” |
| Training-day support | “Consider a carbohydrate source before training.” |
| Recovery support | “Add protein after training if this meal is used post-workout.” |
| Leftover balance | “You are using leftovers three times; add a fresh side option.” |
| Variety | “Three meals rely on the same protein this week.” |

### Tier 4: Household Profiles

Add household profiles only after allergen and dietary tags exist.

Recommended model:

```ts
type HouseholdMember = {
  id: string;
  displayName: string;
  allergenRestrictions: AllergenFlags;
  dietaryPreferences: DietaryPreference[];
  nutritionTargets?: NutritionTargets;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

Dietician guardrails:

- The app can help users organize food choices.
- The app should not diagnose, prescribe, or treat medical conditions.
- The app should not generate clinical diet plans without professional review.
- Nutrition targets should be optional and user-entered.
- Always show that nutrition numbers are estimates.
- Allergens must be prominent and conservative.

---

# 6. Senior Application Architect Decisions

## 6.1 Architecture Diagnosis

The current architecture is healthy. The layering is the right direction:

```text
Domain -> Application Use Cases -> Repository Interfaces -> Data Adapters -> Presentation
```

The UI does not directly call local storage, which is the correct boundary. This means the app can move from `localStorage` to IndexedDB, and eventually to sync-backed storage, without rewriting every screen.

The problem is not architecture structure. The problem is that the implementation is underusing the domain model and does not yet model several critical kitchen concepts.

## 6.2 Final Architecture Decisions

### Decision 1: Stay Local-First

Keep the app private and local-first for the next major release.

Do not add auth or backend sync yet.

However, every entity should be designed for eventual sync:

```ts
type EntityMetadata = {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  sourceDeviceId?: string;
};
```

### Decision 2: Move Persistence to IndexedDB

`localStorage` is acceptable for the current text-only MVP, but it is not appropriate for richer recipe records, photos, nutrition mappings, cooking-session state, or backups.

Recommended storage split:

| Storage | Use |
|---|---|
| `localStorage` | Small settings and migration marker only. |
| IndexedDB | Recipes, cookbooks, planner data, shopping lists, photos, nutrition mappings, cook sessions. |
| Export file | User-controlled backup/restore. |
| Future backend | Optional sync, not required for MVP. |

Add a database abstraction:

```ts
interface LocalDatabase {
  recipes: LocalCollection<RecipeRecord>;
  cookbooks: LocalCollection<CookbookRecord>;
  mealPlans: LocalCollection<MealPlanRecord>;
  shoppingLists: LocalCollection<ShoppingListRecord>;
  nutritionMappings: LocalCollection<NutritionMappingRecord>;
  photoAssets: BlobCollection<PhotoAssetRecord>;
}
```

### Decision 3: Introduce Schema Version 2

The current schema marker is version 1. Version 2 should migrate the app to richer, normalized, cookable data.

Minimum v2 migration:

| v1 concept | v2 change |
|---|---|
| `Recipe.categoryPath: string[]` | Add `categoryId?: string` and keep `legacyCategoryPath?: string[]` during migration. |
| Ingredient shape | Add IDs, positions, group IDs, prep notes, usage notes, optional flag, scale mode. |
| Step shape | Add IDs, timers, temperature metadata, equipment references, doneness cues. |
| Photo reference | Move toward IndexedDB `PhotoAsset`. |
| Planner entry | Add meal slot, planned date, planned cook/eat dates, recipe snapshot. |
| No shopping list | Add shopping list bounded context. |
| No nutrition | Add optional allergen/dietary/nutrition entities. |

### Decision 4: Normalize Categories by ID

The current recipe form uses free-text `categoryPath`, while cookbooks already have category nodes with IDs. This creates drift.

Change recipe assignment to:

```ts
type Recipe = {
  cookbookId: string;
  categoryId?: string;
  legacyCategoryPath?: string[];
};
```

Migration behavior:

1. Keep existing `categoryPath` as `legacyCategoryPath`.
2. Try to match the path to an existing cookbook category.
3. If matched, set `categoryId`.
4. If not matched, show the user a “Resolve category” prompt.
5. Do not lose the old path.

### Decision 5: Planner Entries Should Snapshot Recipe State

Planner entries should reference the recipe ID and also snapshot recipe state at planning time.

Why:

- Users may edit recipes after planning them.
- A planned meal should not silently change in meaning.
- Nutrition/allergen estimates may change after ingredient edits.
- Shopping lists need stable source context.

Recommended structure:

```ts
type PlannedRecipeSnapshot = {
  recipeTitle: string;
  recipeVersion: number;
  servings: number;
  servingLabel: string;
  ingredientSummary: string[];
  nutritionEstimate?: NutritionSummary;
  allergenFlags?: AllergenFlags;
};
```

UI behavior:

```text
This planned meal uses an older recipe version.
[Update planned meal] [Keep planned version]
```

### Decision 6: Add Shopping as a Separate Bounded Context

Shopping list is not a minor UI feature. It is the bridge from planning to action.

Recommended model:

```ts
type ShoppingList = {
  id: string;
  name: string;
  sourcePlanId?: string;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
};

type ShoppingListItem = {
  id: string;
  ingredientName: string;
  quantity?: number;
  unit?: string;
  normalizedFoodId?: string;
  recipeRefs: RecipeRef[];
  checked: boolean;
  category?: GroceryCategory;
  notes?: string;
};
```

Shopping should support:

- generate from meal plan;
- combine duplicate ingredients;
- preserve recipe source references;
- manual items;
- checked state;
- grocery category grouping;
- unresolved quantity warnings;
- export/share text.

### Decision 7: Nutrition Should Be a Separate Bounded Context

Do not overload the recipe domain with nutrition logic.

Recommended feature boundaries:

```text
src/features/recipes
src/features/cookbooks
src/features/planner
src/features/shopping
src/features/nutrition
src/features/profiles
src/features/photos
src/features/migrations
```

Dependency rule:

```text
nutrition may read recipes and planner snapshots
recipes should not depend on nutrition
planner may display nutrition summaries
shopping may use ingredient normalization
```

### Decision 8: Add Accessibility Automation Before Mobile Conversion

The app is optimized for smartphone-sized screens, so accessibility should not be deferred. Accessibility issues become harder to fix after mobile conversion.

Add:

- axe or equivalent automated accessibility checks;
- keyboard tests for dynamic rows;
- non-drag alternatives for reorder actions;
- focus management tests for forms and cook mode;
- accessible timer status announcements;
- sufficient touch targets;
- visible focus indicators;
- semantic error messages tied to form controls.

---

# 7. Revised App Scope

## 7.1 Keep In Scope Now

| Priority | Scope item | Reason |
|---|---|---|
| P0 | Multi-ingredient recipe form | Current UI cannot capture real recipes. |
| P0 | Multi-step recipe form | Current UI cannot capture real instructions. |
| P0 | Ingredient groups | Needed for sauce, dough, filling, garnish, marinade, etc. |
| P0 | Prep notes and usage notes | Needed for diced, softened, divided, optional, etc. |
| P0 | Prep/cook/rest/inactive/total time | Core planning information. |
| P0 | Notes visible in create/edit | Already modeled; must be exposed. |
| P0 | Category picker using real category IDs | Fixes free-text category drift. |
| P0 | IndexedDB adapter | Required before photos and richer data. |
| P0 | v1 → v2 migration tests | Protects existing user data. |
| P1 | Cook Mode | Makes the app useful while cooking. |
| P1 | Timers, temperatures, equipment, doneness cues | Turns recipe text into execution guidance. |
| P1 | Weekly planner | Most users plan by calendar/week, not only loops. |
| P1 | Loop planner as template mode | Keep training/non-training as useful recurring templates. |
| P1 | Shopping list generation | Connects meal planning to grocery action. |
| P1 | Leftovers and prep-ahead | Critical for real meal planning. |
| P1 | Allergen and dietary tags | Safety and personalization baseline. |
| P1 | Export v2 format | Better private sharing and printing. |
| P2 | Nutrition estimates | Useful after ingredient/yield data is reliable. |
| P2 | FoodData Central mapping | Better data source strategy for nutrition estimates. |
| P2 | Household profiles | Needed for allergies, preferences, and serving plans. |
| P2 | Photo blob storage | Useful but should follow IndexedDB migration. |
| P2 | Mobile conversion spike | Only after the core web loop is stronger. |

## 7.2 Keep Out of Scope for Now

| Out of scope | Reason |
|---|---|
| Public recipe publishing | Private cookbook loop is not strong enough yet. |
| Creator profiles | Premature and distracting. |
| Social feed | Not aligned with private-first product. |
| Marketplace | Premature monetization. |
| Subscriptions | Should follow proven value, not precede it. |
| Native mobile rewrite immediately | Web MVP still has major product gaps. |
| Advanced AI recipe generation | First make saved human recipes reliable. |
| Clinical diet plans | High-risk and requires qualified clinical review. |
| Automatic medical advice | Not appropriate for current scope. |
| Backend sync/auth | Useful later, but not needed for this local-first iteration. |

---

# 8. Implementation Backlog

## Sprint 1: Recipe Form Becomes Real

### Deliverables

- Dynamic ingredient rows.
- Dynamic step rows.
- Add/remove/reorder controls.
- Ingredient groups.
- Ingredient prep note field.
- Ingredient usage note field.
- Optional/divided/to-taste toggles.
- Unit selector.
- Visible prep time, cook time, rest time, inactive time, notes.
- Category picker connected to cookbook category tree.
- Validation for multiple ingredients and steps.

### Acceptance Criteria

```text
A user can enter a normal recipe with at least 10 ingredients, 6 steps,
grouped ingredients, prep notes, time fields, and category assignment
without relying on a free-text category path.
```

### Engineering Notes

- Reuse existing array support in the recipe domain.
- Add UI state helpers for row add/remove/reorder.
- Ensure keyboard-accessible reorder controls.
- Preserve current v1 recipe creation tests and extend them.

---

## Sprint 2: Recipe Detail and Export v2

### Deliverables

- Grouped ingredient display.
- Scaled quantities with original quantities.
- Better fraction/unit formatting.
- Equipment display.
- Times and yield display.
- Storage/prep-ahead sections.
- Export grouped ingredients, times, equipment, notes, storage, and safety disclaimers.
- Print-friendly/plain-text export.

### Acceptance Criteria

```text
An exported recipe is useful to another cook without opening the app.
```

---

## Sprint 3: Cook Mode

### Deliverables

- Full-screen guided step mode.
- Ingredient/mise en place checklist.
- Step checklist.
- Step timers.
- Temperature display.
- Doneness cue display.
- Equipment reminders.
- Pause/resume state.
- Cook session persistence.

### Acceptance Criteria

```text
A user can cook a recipe from their phone without scrolling through a dense detail page,
and without losing their place if they briefly leave the screen.
```

---

## Sprint 4: Planner Redesign

### Deliverables

- Weekly planner view.
- Loop planner retained as template mode.
- Meal slots: breakfast, lunch, dinner, snack, prep, leftover.
- Move-entry UI.
- Planned recipe snapshots.
- Planned cook date and planned eat date.
- Leftover relationships.
- Batch-cooking support.

### Acceptance Criteria

```text
A user can plan what to cook, what to eat, what is leftover,
and what moves between days.
```

---

## Sprint 5: Shopping List

### Deliverables

- Generate shopping list from meal plan.
- Combine duplicate ingredients.
- Preserve recipe references.
- Check off items.
- Group by grocery category.
- Add manual items.
- Export/share shopping list text.

### Acceptance Criteria

```text
A planned week can become a usable grocery list in one action.
```

---

## Sprint 6: Allergen, Dietary, and Nutrition MVP

### Deliverables

- Recipe-level allergen flags.
- Ingredient-level allergen flags.
- Dietary tags.
- Manual nutrition entry.
- Nutrition estimate status.
- Per-serving nutrition summary.
- Planner daily nutrition summary.
- Clear “estimated/unverified” labels.
- Optional FoodData Central mapping spike.

### Acceptance Criteria

```text
A user can identify allergen risks and see estimated nutrition without the app making medical claims.
```

---

## Sprint 7: Persistence, Migration, and Photos

### Deliverables

- IndexedDB adapter.
- v1 → v2 migration.
- Migration backup/export.
- Photo asset storage.
- Corruption recovery.
- Import/export backup.

### Acceptance Criteria

```text
Existing localStorage users keep their data, and new richer records persist reliably.
```

---

## Sprint 8: Accessibility and Production Readiness

### Deliverables

- Automated axe checks.
- Accessibility QA checklist.
- Keyboard tests for dynamic rows.
- Timer accessibility tests.
- Error logging strategy.
- Local-first analytics/observability decision.
- Mobile conversion assessment.

### Acceptance Criteria

```text
The app is testable, accessible, recoverable, and ready for a serious mobile decision.
```

---

# 9. Data Model Recommendations

## 9.1 Recipe v2

```ts
type Recipe = {
  id: string;
  version: number;
  title: string;
  description: string;

  cookbookId: string;
  categoryId?: string;
  legacyCategoryPath?: string[];

  yield: RecipeYield;
  times: RecipeTimes;

  ingredientGroups: IngredientGroup[];
  ingredients: IngredientLine[];
  steps: RecipeStep[];
  equipment: EquipmentItem[];

  miseEnPlace?: MiseEnPlaceItem[];
  storage?: StorageGuidance;
  leftovers?: LeftoverGuidance;

  nutritionEstimate?: NutritionSummary;
  allergenFlags?: AllergenFlags;
  dietaryTags?: DietaryTag[];

  difficulty: 'beginner' | 'intermediate' | 'advanced';
  notes?: string;
  isFavorite: boolean;
  photoIds: string[];

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};
```

## 9.2 Recipe Yield

```ts
type RecipeYield = {
  quantity: number;
  unit:
    | 'servings'
    | 'portions'
    | 'pieces'
    | 'tray'
    | 'loaf'
    | 'jar'
    | 'grams'
    | 'cups';
  label?: string;
};
```

## 9.3 Recipe Times

```ts
type RecipeTimes = {
  prepMinutes?: number;
  cookMinutes?: number;
  restMinutes?: number;
  inactiveMinutes?: number;
  totalMinutes?: number;
};
```

## 9.4 Ingredient Group

```ts
type IngredientGroup = {
  id: string;
  name: string;
  position: number;
};
```

## 9.5 Ingredient Line

```ts
type IngredientLine = {
  id: string;
  position: number;
  groupId?: string;

  name: string;
  quantity?: number;
  unit?: string;

  prepNote?: string;
  usageNote?: string;
  optional: boolean;

  scaleMode:
    | 'linear'
    | 'integer'
    | 'fixed'
    | 'toTaste'
    | 'percentage'
    | 'panDependent'
    | 'lossAdjusted';

  shoppingCategory?: GroceryCategory;
  foodDataCentralId?: string;
  allergenFlags?: AllergenFlags;
};
```

## 9.6 Recipe Step

```ts
type RecipeStep = {
  id: string;
  position: number;
  text: string;

  ingredientIds?: string[];
  equipmentIds?: string[];

  timerSeconds?: number;
  temperature?: TemperatureCue;
  heatLevel?: 'low' | 'medium-low' | 'medium' | 'medium-high' | 'high';
  donenessCue?: string;
  safetyCue?: string;
};
```

## 9.7 Temperature Cue

```ts
type TemperatureCue = {
  value: number;
  unit: 'F' | 'C';
  type: 'oven' | 'internal' | 'oil' | 'water' | 'refrigerator' | 'freezer';
};
```

## 9.8 Equipment Item

```ts
type EquipmentItem = {
  id: string;
  name: string;
  size?: string;
  notes?: string;
};
```

## 9.9 Storage Guidance

```ts
type StorageGuidance = {
  roomTemperature?: string;
  refrigerator?: string;
  freezer?: string;
  reheat?: string;
  safetyNotes?: string;
};
```

## 9.10 Leftover Guidance

```ts
type LeftoverGuidance = {
  expectedLeftovers?: string;
  reuseIdeas?: string[];
  linkedRecipeIds?: string[];
};
```

---

# 10. Planner v2 Model

```ts
type MealPlanEntry = {
  id: string;
  recipeId: string;
  servings: number;

  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'prep' | 'leftover';
  plannedForDate?: string;
  loopDayId?: string;

  plannedCookDate?: string;
  plannedEatDate?: string;
  leftoversFromEntryId?: string;

  householdMemberIds?: string[];

  snapshot: PlannedRecipeSnapshot;

  createdAt: string;
  updatedAt: string;
};
```

```ts
type PlannedRecipeSnapshot = {
  recipeTitle: string;
  recipeVersion: number;
  servingLabel: string;
  ingredientSummary: string[];
  nutritionEstimate?: NutritionSummary;
  allergenFlags?: AllergenFlags;
};
```

---

# 11. Nutrition Model

```ts
type AllergenFlags = {
  milk?: boolean;
  eggs?: boolean;
  fish?: boolean;
  crustaceanShellfish?: boolean;
  treeNuts?: boolean;
  peanuts?: boolean;
  wheat?: boolean;
  soybeans?: boolean;
  sesame?: boolean;
};
```

```ts
type NutritionSummary = {
  status: NutritionStatus;
  calories?: number;
  proteinGrams?: number;
  carbohydrateGrams?: number;
  fatGrams?: number;
  saturatedFatGrams?: number;
  fiberGrams?: number;
  sodiumMilligrams?: number;
  addedSugarGrams?: number;
  source?: 'manual' | 'foodDataCentral' | 'mixed';
  confidence?: 'low' | 'medium' | 'high';
};
```

```ts
type IngredientNutritionMapping = {
  id: string;
  ingredientLineId: string;
  recipeId: string;
  source: 'manual' | 'foodDataCentral';
  foodDataCentralId?: string;
  mappedFoodName?: string;
  quantityBasis?: string;
  status: 'unmapped' | 'estimated' | 'userVerified';
  createdAt: string;
  updatedAt: string;
};
```

---

# 12. Migration Strategy

## 12.1 Migration Goals

- Preserve all v1 recipes, cookbooks, categories, and meal plans.
- Avoid destructive migrations.
- Keep legacy category paths until resolved.
- Add stable IDs for ingredients, steps, groups, equipment, and planner snapshots.
- Keep a pre-migration backup.
- Make migration testable with fixture data.

## 12.2 Migration Steps

1. Read v1 localStorage collections.
2. Validate each collection.
3. Create backup records before writing v2 data.
4. Convert recipes:
   - add `version: 2`;
   - convert `baseServings` to `yield`;
   - map `prepTimeMinutes` and `cookTimeMinutes` to `times`;
   - convert ingredients to `IngredientLine[]` with generated IDs and positions;
   - convert `Ingredient.group` to `IngredientGroup` records;
   - convert steps to `RecipeStep[]` with generated IDs;
   - retain `categoryPath` as `legacyCategoryPath`;
   - attempt category ID resolution.
5. Convert cookbooks:
   - preserve category IDs;
   - retain nested tree;
   - add metadata if needed.
6. Convert planner entries:
   - add `mealSlot: 'dinner'` as default if unknown;
   - add planned snapshot from referenced recipe where available;
   - preserve loop day structure.
7. Write v2 records to IndexedDB.
8. Set migration marker.
9. Keep v1 localStorage data until the user confirms backup or after a safe grace period.

## 12.3 Migration Risks

| Risk | Mitigation |
|---|---|
| Corrupted local records | Keep current corruption tests and add v2 fixture tests. |
| Category path cannot be matched | Preserve `legacyCategoryPath` and show resolve UI. |
| Recipe referenced in planner no longer exists | Keep orphaned snapshot and mark entry as missing recipe. |
| Browser storage unavailable | Show recovery/export guidance. |
| IndexedDB write failure | Do not delete v1 localStorage data. |

---

# 13. Testing and Quality Plan

## 13.1 Domain Tests

Add tests for:

- multiple ingredients;
- multiple steps;
- ingredient groups;
- ingredient ordering;
- step ordering;
- scale modes;
- quantity formatting;
- category ID validation;
- planner snapshots;
- shopping list grouping;
- allergen flag aggregation;
- nutrition estimate status;
- migration from v1 to v2.

## 13.2 Application Use Case Tests

Add tests for:

- create recipe with grouped ingredients;
- update recipe without losing ingredient IDs;
- preview portions with scale modes;
- create planned meal with snapshot;
- detect outdated planned snapshot;
- generate shopping list from plan;
- mark allergen/dietary tags;
- save nutrition estimate;
- import/export backup.

## 13.3 UI Tests

Add tests for:

- adding/removing/reordering ingredients;
- adding/removing/reordering steps;
- category picker interaction;
- cook mode step navigation;
- timer start/pause/complete;
- planner weekly view;
- move-entry UI;
- shopping list check-off;
- allergen warning display;
- nutrition estimate labels;
- mobile viewport behavior.

## 13.4 Accessibility Tests

Add tests for:

- form labels and descriptions;
- keyboard-only dynamic row management;
- non-drag reorder controls;
- focus restoration after add/delete row;
- `role="status"` timer updates;
- error messages connected to fields;
- visible focus indicators;
- adequate touch target sizes;
- cook mode readability.

---

# 14. Risk Register

| Risk | Severity | Recommendation |
|---|---:|---|
| Recipe form remains one ingredient/one step | High | Fix before any new major feature. |
| Nutrition estimates imply false precision | High | Use confidence/status labels and manual verification. |
| Allergen flags imply guaranteed safety | High | Use conservative wording and user verification. |
| localStorage becomes too fragile for richer data | High | Move to IndexedDB with migration. |
| Category path drift continues | Medium | Normalize to category IDs. |
| Planner loop model is too narrow | Medium | Add weekly calendar while keeping loops as templates. |
| Cook mode is postponed | Medium | Add it before native mobile conversion. |
| Photos added before storage migration | Medium | Block real photo blobs until IndexedDB. |
| Drag-and-drop added without accessibility fallback | Medium | Add keyboard controls from the start. |
| Public publishing added too early | Medium | Keep it out of scope until private loop is excellent. |

---

# 15. Definition of Done for the Next Major Release

The next major release should be considered done only when:

1. A user can enter a complete recipe with multiple grouped ingredients and multiple steps.
2. A user can cook from the app using Cook Mode.
3. A user can scale a recipe with sensible ingredient behavior and clear warnings.
4. A user can assign recipes to real cookbook category IDs.
5. A user can plan a week of meals and retain recurring loop templates.
6. A user can generate a shopping list from a meal plan.
7. A user can record prep-ahead, storage, reheating, and leftover guidance.
8. A user can mark allergen and dietary information with clear verification status.
9. Nutrition estimates, if present, are visibly estimated and source-labeled.
10. Data persists through IndexedDB with v1-to-v2 migration coverage.
11. Accessibility checks are automated and passing.
12. Existing quality commands still pass.

---

# 16. Recommended Build Order

The implementation should follow this order:

```text
1. Recipe form dynamic collections
2. Recipe detail grouped display
3. Category ID picker and migration support
4. Export v2
5. Cook Mode
6. Planner v2 weekly/calendar model
7. Shopping list generation
8. Allergen and dietary tags
9. Nutrition estimate MVP
10. IndexedDB full persistence and photo assets
11. Accessibility hardening
12. Mobile conversion spike
```

Rationale:

- Do not build nutrition until ingredients and servings are reliable.
- Do not build shopping until planner entries and recipe ingredients are structured.
- Do not build photo blobs until IndexedDB exists.
- Do not build mobile until the web cooking loop is proven.
- Do not build public publishing until private cooking, planning, and shopping are strong.

---

# 17. Final Recommendation

LaCucina should not become a social recipe app yet. It should become a serious private kitchen assistant.

The most important immediate fix is the gap between the domain model and the UI: the domain already supports arrays of ingredients and steps, but the UI only exposes one ingredient and one step. Fixing that unlocks everything else: better cooking, better planning, better shopping, better nutrition, and better mobile readiness.

The strongest next product version is:

> A local-first app where users can save complete recipes, cook from them confidently, plan meals by week or recurring loop, generate grocery lists, manage leftovers, and see conservative allergen/nutrition information.

This keeps the app focused, useful, and architecturally ready for future sync, mobile, and optional publishing without prematurely expanding into social or marketplace complexity.

---

# 18. External Reference Notes

These references are useful for future implementation decisions:

- FDA food allergen information: https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies
- USDA FSIS safe minimum internal temperature chart: https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart
- USDA FoodData Central API guide: https://fdc.nal.usda.gov/api-guide
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
