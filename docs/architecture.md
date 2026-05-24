# Architecture Contract

LaCucina starts as a React + Vite + TypeScript web MVP optimized for smartphone-sized screens. Domain and application logic must stay portable so a later mobile app can reuse the core behavior.

## Stack

- Runtime: React + Vite + TypeScript.
- First target: web MVP for local testing and smartphone-sized layouts.
- Later target: mobile app conversion after the core loop is validated.
- Testing direction: Vitest for pure logic, React Testing Library for components, and a browser/E2E runner later for critical flows.

## Folder Layout

Use this structure after scaffold:

```text
src/
  app/
    main.tsx
    App.tsx
    routes/
    providers/
  core/
    config/
    errors/
    result/
    design/
  features/
    recipes/
      domain/
      application/
      data/
      presentation/
    cookbooks/
      domain/
      application/
      data/
      presentation/
    planner/
      domain/
      application/
      data/
      presentation/
  assets/
test/
  unit/
  component/
e2e/
docs/
```

Root planning files remain at repository root:

```text
AGENTS.md
PROJECT.md
GAP_ANALYSIS.md
DECISIONS.md
README.md
```

## Layer Rules

### Domain

Domain code defines entities, value objects, validation rules, and pure business behavior. It must not import React, browser APIs, routing, storage, network, or UI code.

### Application

Application code coordinates use cases and repository interfaces. It may depend on domain code and interface contracts, but not on React components or concrete browser storage adapters.

### Data

Data code implements repository interfaces, DTOs, mappers, local storage adapters, and migration helpers. Browser APIs belong here, behind interfaces.

### Presentation

Presentation code contains React screens, components, controllers/hooks, and view state mapping. It may call application use cases through injected dependencies. It must not directly read/write storage, call network APIs, or implement domain rules.

### Core

Shared utilities belong in `core/` only when used by at least two features. Good candidates are result types, typed errors, config, date helpers, and design tokens.

## Dependency Direction

Allowed dependency flow:

```text
presentation -> application -> domain
data -> application contracts and domain
app -> presentation, application composition, data composition
```

Disallowed:

- domain importing application, data, presentation, React, or browser APIs;
- application importing React components or concrete storage;
- presentation importing concrete storage adapters;
- UI components hiding persistence, auth, network, or platform-permission logic.

## State and Dependency Composition

Use React composition first:

- app-level providers wire use cases and repository implementations;
- feature presentation code consumes use cases through hooks/controllers;
- forms use local component state unless shared state is required;
- avoid adding a global state library until a gap demonstrates the need.

For routing, use a small route graph under `src/app/routes/`. Route guards are minimal because MVP has no account/auth; future auth must be introduced through a dedicated gap.

## Portability Rule

Keep recipes, cookbooks, planner domain models, use cases, repository interfaces, and validation framework-free. Later mobile conversion should replace only presentation and platform adapters where possible.

## Testing Contract

- Domain: pure unit tests with no DOM or browser storage.
- Application: unit tests with fake repositories.
- Data: adapter tests with isolated local storage or IndexedDB test doubles.
- Presentation: component tests with fake use cases.
- Critical flow: later E2E coverage for create recipe, find recipe, scale servings, add to planner, and reload persisted data.
