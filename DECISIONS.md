# DECISIONS.md
# Blocking decisions that Codex cannot resolve autonomously.
# Resolve an entry by editing the blank resolved field with the chosen answer.

## DL-001 — MVP platform and framework
blocking: GAP-002
question: Should the MVP be a smartphone app for iOS and Android, and which framework should be used?
options: Flutter for iOS and Android | React Native/Expo for iOS and Android | PWA/web outside the current mobile-app scope
recommended_default: Flutter for iOS and Android if the goal is a dedicated smartphone app
impact: This determines scaffold commands, folder layout, test tooling, navigation, state management, and release path.
resolved:lets do web and then convert to mobile as web is easier to test

## DL-002 — MVP product direction
blocking: GAP-002
question: Should the first build focus on a private personal cookbook, a creator-first cookbook, or an open recipe platform?
options: Private personal cookbook | Creator-first cookbook | Open recipe platform/marketplace
recommended_default: Private personal cookbook
impact: This determines whether publishing, creator profiles, marketplace, monetization, and moderation are out of scope or part of MVP.
resolved:Private personal cookbook 

## DL-003 — Account and auth model
blocking: GAP-004
question: Does the MVP require user accounts and authentication?
options: No account/local owner only | Simple account/auth | Full multi-user auth and roles
recommended_default: No account/local owner only
impact: This changes data ownership, route guards, persistence, testing fakes, privacy requirements, and whether backend work is needed.
resolved:No account/local owner only

## DL-004 — Storage, backend, and offline model
blocking: GAP-004
question: Where should MVP recipes, cookbook organization, and meal plans be stored?
options: Local-only device storage | Backend API with account sync | Local-first storage with optional future sync
recommended_default: Local-only device storage
impact: This determines repository adapters, offline behavior, data migration needs, backend credentials, and release/privacy scope.
resolved:Local-only device storage 

## DL-005 — Minimal recipe fields
blocking: GAP-003
question: Which recipe fields are required in the MVP?
options: Essential fields only | Essential fields plus notes/tags/time/difficulty/favorites | Full future schema including media/visibility/owner
recommended_default: Essential fields plus notes/tags/time/difficulty/favorites
impact: This determines domain validation, form complexity, detail screen content, persistence schema, and tests.
resolved:Essential fields plus notes/tags/time/difficulty/favorites

## DL-006 — Cookbook and category structure
blocking: GAP-003
question: What is the minimal organization model for recipes in MVP?
options: One default cookbook with editable categories | Multiple cookbooks with categories | Flexible nested cookbook/tabs/categories
recommended_default: One default cookbook with editable categories
impact: This affects domain models, navigation, list filtering, management UI, and persistence schema.
resolved:Flexible nested cookbook/tabs/categories

## DL-007 — First meal planning format
blocking: GAP-003
question: Which meal-planning format should ship first?
options: Weekly planner | Training/non-training templates | Custom recurring loop
recommended_default: Weekly planner
impact: This determines planner domain shape, UI layout, tests, and what counts as the first usable planning loop.
resolved:Custom recurring loop with presets

## DL-008 — MVP sharing scope
blocking: GAP-003
question: Should MVP include sharing, and if so what is the minimal sharing mechanism?
options: No sharing in MVP | Text export/native share sheet | Private link/public link
recommended_default: Text export/native share sheet if sharing is needed; otherwise no sharing in MVP
impact: This determines whether platform share integration, backend links, privacy boundaries, and export tests are needed.
resolved:Text export/native share sheet if sharing is needed

## DL-009 — Publishing in MVP
blocking: GAP-006
question: Should users be able to publish recipes publicly in the MVP?
options: No public publishing | Shared-by-link only | Public recipe publishing
recommended_default: No public publishing
impact: This determines whether public visibility, ownership rules, moderation, creator profiles, and backend hosting are required.
resolved:No public publishing

## DL-010 — Freak Mode timing
blocking: GAP-003
question: Is Freak Mode only a future concept or an early MVP toggle?
options: Future concept only | Early hidden/advanced toggle | Core MVP experience
recommended_default: Future concept only
impact: This changes form complexity, detail screen density, planner settings, and accessibility risk.
resolved:Future concept only

## DL-011 — Calories and macros
blocking: GAP-003
question: Should calories and macros be included in the first MVP?
options: Out of MVP | Optional manual fields | Calculated nutrition and macro targets
recommended_default: Out of MVP
impact: This determines whether nutrition fields, calculations, external data, and planner targets are needed.
resolved:Out of MVP

## DL-012 — Recipe media timing
blocking: GAP-006
question: Should recipe photos or shorts be included before public publishing?
options: No media in MVP | Single local photo per recipe | Gallery/photos plus short video
recommended_default: No media in MVP
impact: This affects permissions, storage size, UI layout, persistence, privacy, and future publishing readiness.
resolved:Single local photo per recipe

## DL-013 — Public content ownership and moderation
blocking: GAP-006
question: What ownership, copyright, and moderation rules are required before any public recipe publishing?
options: Decide before public publishing only | Simple author attestation and report flow | Full moderation policy and admin workflow
recommended_default: Decide before public publishing only
impact: This determines whether public platform features can be built safely or must remain future scope.
resolved:Decide before public publishing only 

## DL-014 — Web MVP framework
blocking: GAP-002
question: Which web framework should be used for the web-first MVP before later mobile conversion?
options: React + Vite + TypeScript | Next.js + TypeScript | SvelteKit + TypeScript
recommended_default: React + Vite + TypeScript
impact: This determines scaffold commands, routing, test runner, state management defaults, local storage integration, and how easily the later mobile conversion can reuse domain/application logic.
resolved:React + Vite + TypeScript
