# LaCucina Implementation Feedback Plan

This plan converts `implementation feedback.md` into the next local-first build direction for LaCucina. It preserves the current MVP boundary: private personal cookbook, web-first testing, local-only storage, no accounts, no public platform, and no medical claims.

## Product Direction

LaCucina should move from a simple private recipe notebook toward a local-first kitchen assistant:

```text
capture recipe
-> structure ingredients and steps
-> organize into cookbooks/categories
-> cook in guided mode
-> scale intelligently
-> plan meals and prep
-> generate shopping list
-> manage leftovers
-> optionally track conservative allergen/nutrition metadata
-> export or back up privately
```

The strongest near-term value is practical kitchen utility. The app should become better at real recipe capture, cooking execution, meal planning, shopping, leftovers, and transparent dietary context before any growth or publishing features.

## Scope Guardrails

The feedback does not bring these features into the next implementation slice:

- public recipe publishing;
- creator profiles;
- public feeds or social interactions;
- marketplace, subscriptions, payments, or creator monetization;
- backend sync or account authentication;
- AI-first recipe generation;
- clinical diet plans, diagnosis support, or medical nutrition recommendations;
- a native mobile rewrite before the web loop is stronger.

Sharing remains private text export/native share only. Nutrition and allergen work must stay conservative, user-entered or clearly estimated, and visibly non-clinical.

## Near-Term Build Order

1. Recipe capture fidelity: upgrade the recipe form to support multiple ingredients, grouped components, prep notes, multiple steps, visible time fields, and recipe notes.
2. Category selection: connect the recipe form to existing cookbook categories instead of asking users to type category paths manually.
3. Cookable detail and export: show grouped ingredients, prep notes, timing, notes, and private export text that works as a kitchen reference.
4. Smarter scaling: add explicit ingredient-level scaling modes where linear math is not enough.
5. Cook mode: add guided, large-format step cards, progress, checklist behavior, and resume support.
6. Planning depth: add prep-ahead, storage, leftovers, a flexible planner board, and move-entry controls.
7. Shopping list: generate a grocery list from planned recipes with source recipe references.
8. Safe dietary context: add allergen and dietary flags before nutrition estimates, with verification status on every warning.
9. Persistence and quality: move rich local data to IndexedDB and add accessibility automation around dynamic forms.

## Consolidated Ideas Roadmap

`LaCucina_skonsolidowane_pomysly.md` adds the next refinement track after the current kitchen-assistant work:

1. Fix ingredient quantity entry so mobile users type into a blank field and validation happens on save.
2. Replace heavy allergen verification labels with a compact Big 9 checkbox table where checked means contains and blank means no stored allergen flag.
3. Simplify manual macros to calories, protein, fat, and carbs without visible status/source controls.
4. Expand ingredient unit choices with common US and practical recipe units, while keeping automatic unit conversion out of scope.
5. Add Base Recipes as normal cookbook recipes marked as template recipes, importable into new recipes as independent copies with no linked updates or global sync.
6. Let one new recipe import multiple templates, carry their checked allergens and manual nutrition into a template subtotal, and keep imported ingredients/steps collapsible so the user can focus on additions.

These ideas map to GAP-049 through GAP-060 and preserve the same guardrails: private personal cookbook, local-only storage, no backend sync, no public publishing, no automatic nutrition inference, and no medical or allergy safety guarantees.

## Feedback to Gap Map

| Feedback theme                            | Gap     |
| ----------------------------------------- | ------- |
| Preserve product direction and boundaries | GAP-035 |
| Multi-ingredient, multi-step recipe form  | GAP-036 |
| Cookbook category picker in recipe form   | GAP-037 |
| Grouped recipe detail and export text     | GAP-038 |
| Kitchen-aware scaling modes               | GAP-039 |
| Guided cook mode foundation               | GAP-040 |
| Prep-ahead, storage, reheating, leftovers | GAP-041 |
| Flexible planner board and move controls  | GAP-042 |
| Shopping list generation from plan        | GAP-043 |
| Allergen and dietary awareness baseline   | GAP-044 |
| Manual nutrition estimate MVP             | GAP-045 |
| IndexedDB schema v2 baseline migration    | GAP-046 |
| Accessibility automation                  | GAP-047 |

## Chef Recommendations

Chef-facing work should prioritize recipe structures that match how people cook:

- ingredient collections, not a single ingredient field;
- ingredient groups such as sauce, dough, garnish, marinade, dressing, spice mix, and main;
- prep notes such as diced, minced, softened, divided, optional, toasted, cooked, and raw;
- multiple ordered steps with duplicate, remove, and reorder controls;
- clear prep/cook timing and recipe notes;
- later cook-mode support for readable step cards, checklists, timers, temperatures, equipment cues, and doneness cues.

Only fields already supported by the current `Recipe` model should be implemented in the next form slice. New recipe schema concepts such as timers, equipment, rest time, inactive time, yield variants, and mise en place items need their own later gaps or decisions before implementation.

## Dietician Recommendations

Dietary and nutrition work should land in this order:

1. allergen flags and dietary tags;
2. simple allergen checkboxes where checked means contains and blank means no recorded claim;
3. manual nutrition estimates with source/status labels;
4. later automatic mapping only if a data source and privacy model are explicitly chosen.

The app must not promise that food is safe for an allergy, medical condition, or clinical diet. It can help users record and review information, but it should avoid diagnosis, prescriptions, and guaranteed safety claims.

## Architecture Recommendations

The current layered architecture remains the correct contract:

- domain models and rules stay pure;
- application use cases coordinate behavior;
- repositories hide persistence details;
- presentation calls use cases and never writes storage directly.

The technical direction remains local-first. Rich recipe, cookbook, meal-plan, and legacy recipe-component records belong in IndexedDB schema v3, while `localStorage` is reserved for migration markers and small UI state. The primary reusable-base UX now uses normal recipe records marked as templates. Future image blobs, backups, and mobile storage adapters should build from that boundary.

## Acceptance Notes

GAP-035 is complete when this plan is present, linked from the main project docs, and the next implementation slice remains local-first and private. The first implementation gap after this plan is GAP-036.
