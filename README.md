# LaCucina

LaCucina is a planning-stage recipe and personal cookbook app focused on saving recipes, organizing them into a flexible cookbook, scaling ingredient quantities by servings, and using saved recipes in simple meal-planning loops.

The canonical product brief lives in [PROJECT.md](PROJECT.md). Work is tracked as PR-sized gaps in [GAP_ANALYSIS.md](GAP_ANALYSIS.md), with open product and technical decisions in [DECISIONS.md](DECISIONS.md).

Current stage: gap-driven implementation of the web-first MVP, optimized for smartphone-sized screens before later mobile conversion.

## Local Commands

After installing dependencies, use:

- `npm run dev` to start the local web app.
- `npm run build` to type-check and build the app.
- `npm run lint` to run ESLint.
- `npm run format` to check Prettier formatting.
- `npm run test` to run the unit/component test suite.
- `npm run quality` to run lint, format, tests, and build.

Planning docs:

- [MVP scope](docs/mvp-scope.md)
- [Data strategy](docs/data-strategy.md)
- [Privacy boundaries](docs/privacy.md)
- [Architecture contract](docs/architecture.md)
- [Portion scaling](docs/portion-scaling.md)
- [Accessibility QA](docs/accessibility.md)
- [Performance and resilience](docs/performance-resilience.md)
- [Release readiness](docs/release.md)
- [Current implementation summary](docs/current-implementation-summary.md)
- [Implementation feedback plan](docs/implementation-feedback-plan.md)
- [Future platform guardrails](docs/future-platform-guardrails.md)
