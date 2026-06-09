# AGENTS.md — Mobile App From Zero
# Codex reads this file first on every task, no exceptions.

TEMPLATE_TYPE: mobile-app-from-zero

MISSION: Build a production-ready smartphone app from an empty or template repository through small, testable, PR-sized gaps.

TARGET_DEVICES: smartphones first. Tablets, desktop, and web are out of scope unless PROJECT.md explicitly asks for them.
TARGET_PLATFORMS_DEFAULT: iOS + Android when PROJECT.md says mobile/smartphone/cross-platform and does not narrow the target.
STACK_RULE: Use the existing repository stack if one is already present. If no source code exists and PROJECT.md names a framework, use that framework. If no framework is known, do not scaffold application code; create a DECISION first. Product, architecture, and documentation gaps may still be generated before a framework decision.

---

## Non-negotiable operating rules

1. Do not treat this repository as a game engine template. Ignore legacy game wording unless PROJECT.md explicitly describes a game.
2. Build from zero in phases: product definition, foundation, domain/data, UI flows, integrations, quality, release.
3. Each gap must be one PR-sized deliverable with clear acceptance criteria and tests.
4. Prefer thin vertical slices after the foundation exists, but do not mix unrelated features in one gap.
5. Keep presentation, application/use-case logic, domain models, and data/infrastructure separated.
6. No direct network, database, authentication, or platform-permission logic inside UI components/screens.
7. Never commit secrets, tokens, API keys, signing files, private certificates, or real user data.
8. Every implemented screen must handle loading, error, empty, and offline/unavailable states when relevant.
9. Every user-facing flow must consider small phone screens, safe areas, keyboard behavior, accessibility labels, and readable touch targets.
10. Do not add monetization, analytics, tracking, push notifications, camera, location, payments, or AI integrations unless PROJECT.md or a DECISION explicitly requires them.

## Source-of-truth hierarchy

1. GAP_ANALYSIS.md remains the primary delivery framework. It selects work, dependency ordering, allowed scope, acceptance criteria, close rules, and the gap status lifecycle.
2. `DECISIONS.md` is the blocking decision ledger. Unresolved decisions block any gap that depends on them, even if the code could be written.
3. Implementation docs describe the current built reality and known product/technical drift. Read the relevant docs before implementation, especially `docs/current-implementation-summary.md`, `docs/implementation-feedback-plan.md`, architecture, data, import/export, privacy, release, or platform notes that match the gap.
4. Specialist workflows are execution and verification gates inside a selected gap. They do not replace gap selection, gap scope, dependency ordering, acceptance criteria, or close rules.

## Tooling guardrails

- Do not request or hardcode `gpt-image-2`. It is not an available OpenAI image model and can make Codex/API requests fail with `invalid_value` on `tools`.
- If generated bitmap assets are needed, use the available image generation tool without naming an unavailable model. For direct OpenAI API image calls, use a documented image model such as `gpt-image-1.5`, `gpt-image-1`, or `gpt-image-1-mini`.
- This tooling rule does not authorize app-level AI/image-generation integrations. Those still require PROJECT.md or a resolved DECISION.

---

## Step 0 — Bootstrap check (run once, on first task only)

1. Read these files in full if they exist:
   - `PROJECT.md`
   - `GAP_ANALYSIS.md`
   - `DECISIONS.md`
   - `README.md`
   - this `AGENTS.md`
2. Inspect the repository for existing stack markers before planning:
   - Flutter/Dart: `pubspec.yaml`, `lib/`, `test/`
   - React Native/Expo: `package.json`, `app.json`, `app.config.*`, `src/`, `__tests__/`
   - Native Android: `settings.gradle`, `build.gradle`, `app/src/`
   - Native iOS: `*.xcodeproj`, `*.xcworkspace`, `Package.swift`
3. Check whether `GAP_ANALYSIS.md` contains any gap entries by looking for lines starting with `## GAP-`.
4. If no gaps exist:
   a. Treat any current game-engine wording in `PROJECT.md`, `README.md`, or old instructions as legacy template residue.
   b. Read `PROJECT.md` and map it into a mobile app brief using the parsing guide below.
   c. If `PROJECT.md` is blank or still only contains template examples, generate blocking decisions for the missing app purpose, MVP scope, framework, and data/backend requirements.
   d. Generate the full `GAP_ANALYSIS.md` using the schema in this file.
   e. Generate a phased plan:
      - Phase 0 = product decisions, repo cleanup, architecture plan
      - Phase 1 = mobile app foundation/scaffold
      - Phase 2 = core domain, application services, data model
      - Phase 3 = screens, navigation, reusable UI components
      - Phase 4 = backend/local storage/device integrations
      - Phase 5 = testing, accessibility, performance, release readiness
   f. If old game-template docs are present, create an early Phase 0 gap to replace game wording with mobile-app wording.
   g. Populate `DECISIONS.md` with any open decisions detected from the brief.
   h. Do not write application source code during bootstrap. Stop after generating planning files and report what was generated.
5. If gaps already exist, skip bootstrap and continue to Step 1.

---

## Step 1 — Task loop (every task after bootstrap)

1. Read `PROJECT.md`, `GAP_ANALYSIS.md`, `DECISIONS.md`, `README.md`, and this file in full.
2. Read the implementation docs relevant to the likely work area. At minimum, use `docs/current-implementation-summary.md` when it exists; also read focused docs such as architecture, data strategy, import/export, privacy, release, accessibility, or performance notes when the gap touches those areas.
3. Build the dependency graph from every gap's `blocked_by` field.
4. Identify unresolved decisions in `DECISIONS.md`. If a decision blocks the next candidate gap, surface it and stop.
5. Reconcile `GAP_ANALYSIS.md`, `DECISIONS.md`, implementation docs, and the current code before selecting or implementing a gap. If they conflict, do not guess: create or update a decision, add a follow-up gap, or perform a roadmap cleanup gap.
6. Select the next gap where:
   - `status = open`
   - all `blocked_by` gaps are `closed`
   - scope is small enough to complete without broad rewrites
7. Prioritize eligible work in this order:
   - data-loss risk, broken core flow, release/install blocker, security/privacy issue
   - direct user request that maps to an eligible gap or requires a small incident gap
   - nearest unblocked vertical slice that improves the MVP loop
   - lowest phase and gap number as a tie-breaker, not an automatic rule
8. Announce the gap you are working on, why it is next, which implementation docs were checked, and which specialist subworkflows apply.
9. Implement it completely: code, tests, docs/config updates, implementation doc updates when behavior changes, and gap status update.
10. Run the smallest relevant verification command first, then the broader suite if risk or touched files require it.
11. Update the gap status to `closed` in `GAP_ANALYSIS.md` only when the acceptance criteria, required specialist gates, and tests pass.
12. If no open unblocked gap exists, check `DECISIONS.md`, report the blocker, and stop.

---

## Gap execution framework

### Roadmap reconciliation

- Compare the selected gap with `DECISIONS.md`, relevant implementation docs, and the current code before writing implementation code.
- If an open gap appears already implemented, verify its acceptance criteria and tests before closing it; otherwise refine or replace it with a follow-up gap.
- If two gaps describe the same work, keep one canonical gap and mark or propose the other as `dropped` only when its scope is truly superseded.
- If implementation docs describe behavior that contradicts the roadmap, create a decision or roadmap cleanup gap instead of silently choosing one source.

### Definition of Ready

A gap is ready for implementation only when it has:

- a clear goal, scope, acceptance criteria, tests, `closes_when`, `escalate_if`, and `do_not`;
- all blocking gaps closed and all blocking decisions resolved;
- the relevant implementation docs checked;
- the required specialist subworkflows identified;
- no hidden dependency on credentials, paid services, platform accounts, private APIs, or unresolved architecture changes.

If only a minor implementation detail is missing and no product behavior changes, use the safest local default and record the assumption in the final report or docs.

### Definition of Done

A gap may close only when:

- implementation matches the gap acceptance criteria and does not exceed `do_not`;
- required specialist subworkflows have no unresolved blocking findings;
- focused tests and required broader checks pass, or a check that could not be run is explicitly reported and the gap allows manual verification;
- user-facing, architecture, data, release, or platform behavior changes are reflected in the relevant implementation docs;
- `GAP_ANALYSIS.md` status is updated only after the above conditions are true.

### Validation ladder

Run verification from narrow to broad:

1. Focused unit or component tests covering the changed behavior.
2. Feature-level or integration tests when data flow, routing, persistence, or cross-screen behavior changes.
3. Full local quality command when shared contracts, release paths, broad UI behavior, or multiple features are touched.
4. Platform-specific smoke checks for wrappers, native APIs, permissions, file handling, installs, or release assets.

Do not close a gap on an unverified assumption. If the environment prevents a required check, report the exact command and blocker.

### Incident Mode

Use Incident Mode when the user reports data loss, a broken core flow, a regression, a release/install blocker, or a security/privacy issue.

- Reproduce or localize the issue before broad refactoring.
- If the issue does not fit an open gap, create the smallest incident gap with reproduction, expected behavior, fix scope, tests, and `do_not`.
- Fix only the incident scope, add a regression test where possible, and leave broader cleanup as follow-up gaps.
- Incident Mode can outrank normal phase ordering, but it does not bypass decisions, acceptance criteria, or verification.

### Scope control

- Keep one gap to one coherent deliverable.
- Do not mix feature work, refactor, release, docs cleanup, dependency upgrades, or migrations unless the gap explicitly requires it.
- Do not add dependencies, external services, permissions, background tasks, analytics, monetization, AI, auth, sync, or platform APIs without a gap or resolved decision.
- When a specialist subworkflow reveals new work, create a follow-up gap or decision instead of expanding the current gap.

---

## Step 2 — Mobile gap generation hints

Generate gaps in dependency order. Each gap should be small enough for a single focused PR.

### Phase 0 — Product and repo preparation

Create gaps for:
- replacing legacy game-template docs with mobile-app docs
- clarifying app purpose, target users, and MVP flows
- choosing platform targets and framework
- choosing backend/local-first/offline approach
- defining app architecture and folder layout
- defining privacy/security boundaries for user data

Do not scaffold app code until the target framework is known.

### Phase 1 — Foundation/scaffold

Create gaps for:
- initializing the mobile project using the chosen framework
- adding linting, formatting, test runner, and basic CI if appropriate
- creating app shell, routing/navigation, theme/design tokens, and environment config
- creating dependency injection/service locator or equivalent framework-native composition
- adding a minimal smoke test that proves the app launches

### Phase 2 — Domain, application, and data model

Create gaps for:
- core entities/value objects
- use cases/application services
- validation rules
- repository interfaces
- DTOs/mappers when backend or local persistence is needed
- local storage/cache abstractions
- offline/sync strategy if required

Domain/application logic must be testable without a running device or simulator.

### Phase 3 — UI screens and flows

Create gaps for:
- navigation graph and route guards
- each primary screen or user flow
- reusable UI components
- forms and input validation
- loading/error/empty/offline states
- accessibility labels, focus order, and small-screen behavior

Do not build a screen before its required domain/use-case contract exists unless the gap explicitly creates a mocked interface.

### Phase 4 — Integrations and platform capabilities

Create gaps only when required by PROJECT.md or a resolved decision:
- backend API client
- authentication/session handling
- local database migrations
- camera, photos, files, location, notifications, or other permissions
- payments/subscriptions
- analytics/crash reporting
- external AI or recommendation services

Every permission or external service must include a clear user benefit and failure behavior.

### Phase 5 — Quality and release readiness

Create gaps for:
- integration/E2E coverage of critical flows
- accessibility pass
- performance checks for startup, navigation, large lists, and network-heavy flows
- error handling and observability
- app icon/splash screen/release metadata
- build/signing documentation without committing secrets
- privacy policy/data safety checklist when user data is collected

---

## Step 3 — Per-gap implementation rules

- Write tests before or alongside implementation, never as an afterthought.
- Keep tests close to behavior: unit tests for pure logic, component/widget tests for UI states, integration/E2E tests for critical flows.
- Do not use real external services in tests. Use interfaces, fakes, fixtures, or test doubles.
- Do not introduce a dependency unless the gap needs it. Document why it was added.
- Do not create broad abstractions for hypothetical future features.
- Do not silently change the selected framework, architecture, state management approach, or folder contract.
- Do not leave TODOs that are required for the gap's acceptance criteria.
- Do not hide errors with empty catches, silent fallbacks, or untested assumptions.
- Prefer deterministic state and explicit error types over ad-hoc booleans and stringly typed status values.
- Keep generated placeholder assets minimal and mark them clearly as placeholders.
- When a gap touches user data, include privacy, validation, and safe failure behavior in the implementation.

---

## Specialist subworkflows

Specialist subworkflows are gates for execution quality. Run only the subworkflows that match the selected gap. They produce findings and checks; they do not transfer ownership away from the primary implementer and they do not expand scope without a new gap or decision.

### Product / Scope

Use for new features, MVP changes, user-facing behavior, onboarding, publishing, monetization, sharing, or workflow changes.

- Confirm the user problem, success criteria, in-scope behavior, out-of-scope behavior, and acceptance criteria.
- Stop for a decision if product behavior could reasonably be implemented in materially different ways.
- Ensure the feature does not leak future-scope platform, marketplace, auth, sync, AI, analytics, or monetization behavior into the current MVP.

### Architecture

Use for new modules, folder changes, dependency composition, state management, shared abstractions, or cross-feature behavior.

- Preserve the documented layer boundaries and import direction.
- Prefer existing patterns over new abstractions unless the gap requires a new contract.
- Stop if the change would reinterpret or break a closed gap contract.

### Domain / Application

Use for models, validation, business rules, use cases, commands, queries, and repository contracts.

- Keep domain logic framework-free and testable without UI, platform APIs, databases, or network.
- Use explicit result/error types for expected failures.
- Cover success, validation failure, not-found, empty, and repository failure cases where relevant.

### Data / Persistence

Use for local storage, databases, migrations, import/export, backup, cache, sync, DTOs, mappers, and delete behavior.

- Check compatibility with existing data and documented migration markers.
- Define corrupt-data, write-failure, unavailable-storage, deletion, backup, and restore behavior.
- Do not risk data loss without tests or an explicit decision.
- Do not commit secrets, real user data, private certificates, signing files, or external credentials.

### UI / UX

Use for screens, components, navigation, forms, visual states, and interaction flows.

- Verify loading, error, empty, populated, disabled, and success states when relevant.
- Check small-phone layout, safe areas, keyboard behavior, readable touch targets, text wrapping, and accessibility labels.
- Keep UI components free of direct network, database, auth, storage, and platform-permission logic.

### Integration / Platform

Use for native wrappers, browser APIs, WebView behavior, permissions, file handling, clipboard, share sheets, camera/photos/files/location, notifications, and device-specific behavior.

- Keep platform APIs behind adapters or ports.
- Provide unavailable, denied, rejected, and fallback behavior.
- Avoid new permissions unless the user benefit and failure behavior are documented.
- Run platform smoke checks when the gap's `tests` or `closes_when` require real platform behavior.

### Security / Privacy

Use for user data, auth, account ownership, backend access, public sharing, analytics, tracking, payments, external services, sensitive data, or permissions.

- Minimize data collection and keep private data local unless the project docs or a decision explicitly say otherwise.
- Make data export, sharing, deletion, and recovery behavior explicit.
- Stop if sensitive personal data, external transmission, or credentials are introduced without privacy requirements.

### QA / Regression

Use for bugfixes, regressions, core flows, broad refactors, and any gap that touches multiple features.

- Reproduce or describe the failure before fixing when possible.
- Add a focused regression test for the failure.
- Run broader checks when shared behavior, routing, persistence, or build output could be affected.

### Release

Use for builds, installs, app metadata, package identifiers, signing, launcher/splash assets, store materials, release docs, or platform delivery.

- Keep signing keys, store credentials, and private certificates out of the repository.
- Preserve app identifiers and storage compatibility unless a decision explicitly changes them.
- Verify build/install/update behavior and local data retention when the gap requires it.

### Documentation / Roadmap

Use whenever user-facing behavior, architecture, data contracts, release process, platform behavior, or roadmap status changes.

- Update `GAP_ANALYSIS.md`, `DECISIONS.md`, and implementation docs so they match the code.
- If docs are not updated, explicitly report why they were not needed.
- Do not leave roadmap drift, duplicate gaps, or stale implementation summaries after closing a gap.

---

## Step 4 — Architecture contract

Use the chosen framework's idiomatic root folders, but preserve these logical layers.

```
app/ or lib/app/ or src/app/          — app entry, routing, navigation, app-level providers, app shell
core/ or lib/core/ or src/core/       — shared utilities, config, errors, result types, design tokens
features/ or lib/features/ or src/features/
  {feature}/
    domain/                           — entities, value objects, pure business rules
    application/                      — use cases, state orchestration, commands/queries
    data/                             — repositories, API/local adapters, DTOs, mappers
    presentation/                     — screens, components, view models/controllers
assets/                               — images, fonts, icons, placeholder assets
test/ or __tests__/                   — unit and component/widget tests
integration_test/ or e2e/             — integration/E2E tests when configured
docs/                                 — architecture notes, decisions, release notes
GAP_ANALYSIS.md
DECISIONS.md
AGENTS.md
PROJECT.md
README.md
```

Layer rules:
- `domain/` must not import UI, network, database, or platform-specific APIs.
- `application/` may coordinate domain and repository interfaces, but should not depend on concrete UI widgets/screens.
- `data/` may depend on network/local storage libraries and maps external data into domain models.
- `presentation/` may depend on application/use-case interfaces and UI framework APIs.
- Shared code belongs in `core/` only when at least two features use it.
- Do not restructure folders without a dedicated gap.

---

## Step 5 — Escalation rules

Write to `DECISIONS.md` and stop if:
- the app purpose or MVP user flow is unknown
- target platform or framework is unknown and the next gap requires scaffolding
- backend/auth/local-storage requirements are unclear and the next gap depends on them
- a feature could reasonably be implemented in two materially different ways
- a gap would require changing the architecture of a closed gap
- external credentials, private APIs, paid services, signing keys, or app-store accounts are required
- the implementation would collect sensitive personal data without privacy requirements
- tests would require mocking a service or platform capability that has not been defined yet

Format each decision exactly like this:

```
## DL-{NNN} — {short title}
blocking: {GAP-NNN | bootstrap}
question: {one sentence, the exact decision needed}
options: {option A} | {option B} | {option C}
recommended_default: {the safest or simplest default, or "none"}
impact: {what changes depending on the answer}
resolved: {leave blank until the user answers}
```

---

## GAP_ANALYSIS.md schema

Codex must follow this format exactly when generating gaps:

```
## GAP-{NNN} — {short title}
phase: {0|1|2|3|4|5}
status: {open|closed|dropped}
type: {product|foundation|domain|application|data|ui|integration|quality|release|docs}
blocked_by: {GAP-NNN, GAP-NNN | DL-NNN | none}
goal: {one-sentence outcome}
scope: {specific files/areas this gap may touch}
acceptance_criteria: {testable bullets or a concise testable statement}
tests: {unit/component/integration/manual checks expected}
closes_when: {specific, observable condition — not "when done"}
escalate_if: {condition that should stop work and surface a decision}
do_not: {explicit constraints — what NOT to do in this gap}
```

Gap rules:
- Use `DL-NNN` in `blocked_by` only for unresolved decisions listed in `DECISIONS.md`.
- A gap may close only after its acceptance criteria are met.
- Closed gaps are stable contracts. Do not reopen or reinterpret them without a new gap.
- Prefer more small gaps over one large vague gap.

---

## PROJECT.md parsing guide

Preferred mobile sections:

- `What this app is` → app purpose, target user problem, MVP outcome
- `Target users` → primary persona, context of use, session length, accessibility needs
- `MVP flows` → user flows that must work in the first usable version
- `Target platforms and framework` → iOS/Android/cross-platform and chosen framework
- `Data and backend` → local-only, backend API, sync, offline, auth, storage
- `Screens and navigation` → screens, routes, modals, onboarding, settings
- `Integrations and permissions` → camera, location, notifications, payments, AI, external APIs
- `Tech stack` → language, libraries, state management, test framework, CI
- `Out of scope` → features Codex must not generate
- `Open questions` → convert each into a `DECISIONS.md` entry during bootstrap

Legacy mapping for the current template wording:

- `What this game is` → treat as `What this app is`
- `Target platform and engine` → treat as `Target platforms and framework`
- `Player persona` → treat as `Target users`
- `Core systems` → treat as `Domain/application/data systems`
- `UI and scenes` → treat as `Screens and navigation`
- `Out of scope` → unchanged
- `Open questions` → unchanged

If PROJECT.md is blank, do not invent product requirements beyond safe mobile defaults. Generate decisions and stop before code.

---

## Reporting format after each task

When finishing a task, report:

1. Gap closed or decision created.
2. Files changed.
3. Implementation docs updated or explicitly not needed.
4. Tests/checks run and their result.
5. Any remaining blocker or next unblocked gap.

Do not claim a gap is closed if tests were not run or acceptance criteria were not met. If a check could not be run, say why and keep the gap open unless the gap explicitly allows manual verification.
