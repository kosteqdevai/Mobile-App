# MVP Scope Contract

Comero MVP is a private personal cookbook built web-first with React + Vite + TypeScript and designed for smartphone-sized screens. The first usable loop is:

```text
save recipe -> organize recipe -> scale servings -> cook -> reuse recipe in a recurring meal plan
```

## In Scope

### Recipes

The MVP supports private recipe CRUD:

- create a recipe;
- edit a recipe;
- delete a recipe with confirmation;
- archive and restore individual recipes;
- delete or archive selected recipes in bulk;
- view recipe details;
- search and filter saved recipes.

Required recipe fields:

- `id`;
- `title`;
- `description`;
- `baseServings`;
- `ingredients`;
- `steps`;
- `cookbookId`;
- `categoryPath`;
- `tags`;
- `prepTimeMinutes`;
- `cookTimeMinutes`;
- `difficulty`, limited to `beginner` or `intermediate`;
- `notes`;
- `isFavorite`;
- optional `archivedAt`;
- optional single local `photo`;
- `createdAt`;
- `updatedAt`.

Ingredient fields:

- `name`;
- `quantity`;
- `unit`;
- optional `note`;
- optional `group`.

Step fields:

- `position`;
- `text`.

Recipes are private by default and have no public visibility setting in MVP.

### Portion Scaling

Portion scaling is dynamic and must not mutate the base recipe.

```text
scaled quantity = original quantity * target servings / base servings
```

The MVP handles numeric quantities in a stored unit. Unit conversion, nutrition calculations, non-linear scaling, and ingredient substitution are out of scope.

### Cookbook Organization

The MVP supports flexible local organization:

- multiple local cookbooks;
- nested cookbook tabs/categories represented as a tree;
- one primary `categoryPath` per recipe for form/detail compatibility;
- additive recipe assignments from cookbook category trees, allowing one recipe to appear in several cookbooks/categories;
- a default cookbook that acts as the all-recipes home;
- tags for secondary filtering.

The tree can support user-defined nesting, but the MVP should keep UI operations small: create, rename, delete, move, and assign recipes. Public cookbook ownership, followers, collaboration, and subscriptions are out of scope.

### Meal Planning

The planner is setup-driven and calendar-first. Users configure one local plan, then work from a week or month calendar instead of switching between separate `Board` and `Templates` modes.

MVP planner behavior:

- configure `Weekly Mon-Sun`, `Custom loop`, or `Individual dates`;
- for `Custom loop`, create named days that repeat as a sequence from a local `YYYY-MM-DD` start date;
- add saved recipe entries to day definitions with servings and optional meal labels/context;
- set optional manual day targets for calories, protein, fat, and carbs;
- view the applied plan as week and month calendar summaries;
- open a date-specific day detail;
- mark each meal occurrence as eaten for that actual date;
- override servings for one actual date without mutating the recurring day definition;
- show planned totals, eaten totals, remaining-to-target, and planned-left uneaten calories/macros when saved recipes have manual nutrition.

System calendar integrations, reminders, notifications, automatic calorie calculation, and clinical diet recommendations are out of scope.

### Sharing

MVP sharing is limited to text export or a native browser share sheet when available. Sharing must export only the selected recipe content and must not create public links, public pages, public profiles, or backend-hosted content.

### Media

MVP media is limited to one local photo per recipe. Galleries, videos, shorts, cloud upload, camera capture, public media feeds, and media moderation are out of scope.

## Out of Scope

- user accounts and authentication;
- backend sync;
- public recipe publishing;
- creator profiles;
- marketplace;
- subscriptions or payments;
- social feed;
- comments, follows, or public discovery;
- automatic calories/macros calculation and clinical nutrition targets;
- Freak Mode;
- push notifications;
- analytics and tracking;
- public moderation tooling.

## Acceptance Lens

The MVP is useful when a local user can add several private recipes, organize them in their own cookbook structure, scale ingredient quantities while cooking, and reuse saved recipes in a calendar-resolved meal plan.
