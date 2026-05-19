# AGENTS.md — Game Engine Template
# Codex reads this file first on every task, no exceptions.

TEMPLATE_TYPE: game-engine

---

## Step 0 — Bootstrap check (run once, on first task only)

1. Check if `GAP_ANALYSIS.md` contains any gap entries (look for lines starting with `## GAP-`).
2. If NO gaps exist:
   a. Read `PROJECT.md` — it contains a one-line project description.
   b. Generate the full `GAP_ANALYSIS.md` using the schema defined in this file.
   c. Generate a phased plan: Phase 1 = domain/core logic, Phase 2 = UI/scenes, Phase 3 = polish/release.
   d. Populate `DECISIONS.md` with any open decisions you detected from the description.
   e. Do NOT write any source code yet. Stop after bootstrap and report what you generated.
3. If gaps exist, skip to Step 1.

### Gap generation hints for this template type
When generating gaps from the project description, think in these layers:
- Core game loop (state machine, tick logic, win/lose conditions)
- Domain entities (player, enemies, items, levels — pure logic, no rendering)
- Persistence (save/load, config)
- Scene structure (how screens connect — title, gameplay, pause, results)
- UI components (each screen is its own gap)
- Asset pipeline (what assets are needed, placeholder vs final)
- Platform target (if not specified in PROJECT.md, add a DECISION for this)

Each gap = one PR-sized unit. Domain gaps come before UI gaps. Never mix logic and rendering in one gap.

---

## Step 1 — Task loop (every task)

1. Read `GAP_ANALYSIS.md` in full.
2. Build the dependency graph from all `blocked_by` fields.
3. Select the next gap where:
   - status = `open`
   - all `blocked_by` gaps are `closed`
   - phase is the lowest active phase
4. Announce which gap you are working on and why.
5. Implement it completely — code + tests.
6. Update the gap status to `closed` in `GAP_ANALYSIS.md`.
7. If no open unblocked gap exists → check `DECISIONS.md` and surface the blocking decision to the user. Stop.

---

## Step 2 — Per-gap rules

- Write tests before or alongside implementation, never after.
- Test contract for this template: game loop unit tests + scene state tests. No UI rendering tests.
- All domain logic lives in `domain/`. It must have zero dependencies on any engine/rendering library.
- UI and scene code lives in `ui/`. It may depend on `domain/` but not vice versa.
- `config/` holds constants only — no logic.
- Never break passing tests. If a gap would break existing tests, escalate before touching code.
- Assets go in `assets/` as placeholders (empty files or 1px images) until a dedicated asset gap closes them.

---

## Step 3 — Escalation rules

Write to `DECISIONS.md` and stop if:
- Platform/engine is not specified and the gap requires it
- A gap's scope is ambiguous enough that two reasonable implementations exist
- Implementing this gap would require changing the architecture of a closed gap
- A test would require mocking something that doesn't exist yet

Format for DECISIONS.md entry:
```
## DL-{NNN} — {short title}
blocking: GAP-{NNN}
question: {one sentence, the exact decision needed}
options: {option A} | {option B}
impact: {what changes depending on the answer}
```

---

## GAP_ANALYSIS.md schema (Codex must follow this format exactly when generating gaps)

```
## GAP-{NNN} — {short title}
phase: {1|2|3}
status: {open|closed|dropped}
blocked_by: {GAP-NNN, GAP-NNN | none}
closes_when: {specific, testable condition — not "when done"}
escalate_if: {condition that should stop work and surface a decision}
do_not: {explicit constraint — what NOT to do in this gap}
```

---

## Folder contract (never restructure without a dedicated gap)

```
domain/      — pure game logic, engine-agnostic
ui/          — scenes, screens, rendering
assets/      — sprites, audio, fonts (placeholders ok)
src/         — shared utilities, helpers
tests/       — all test files mirror src/domain/ui structure
config/      — constants, settings, no logic
GAP_ANALYSIS.md
DECISIONS.md
AGENTS.md
PROJECT.md   — one-line description (you read this for bootstrap)
```

---

## PROJECT.md parsing guide (used during Step 0 bootstrap only)

When reading PROJECT.md to generate gaps, map sections as follows:

- "What this game is" → overall gap scope, win/lose logic, core loop shape
- "Target platform and engine" → if blank, do not generate any UI or asset gaps; raise a DECISION instead; Phase 1 domain gaps can still be generated
- "Player persona" → informs session-length assumptions in save/load gap and any timing logic
- "Core systems" → each system listed becomes one or more Phase 1 domain gaps
- "UI and scenes" → each screen listed becomes a Phase 2 gap; do not generate these until platform is decided
- "Tech stack" → sets language and test framework for all generated stubs
- "Out of scope" → do not generate any gap that touches these areas, even if implied by the description
- "Open questions" → each becomes a DECISIONS.md entry immediately

Autonomy rule: if platform or engine is not specified, generate all Phase 1 domain gaps as engine-agnostic Python or the most portable language available. Mark all Phase 2 gaps as `blocked_by: DL-001` (the platform decision). Do not stop work entirely — Phase 1 can always proceed.
