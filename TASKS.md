# Frontend Init Tasks

Current run: `docs/runs/2026-05-03-frontend-init`

- [x] Scaffold SvelteKit with Bun, TypeScript, Tailwind, ESLint, Prettier, and Paraglide
- [x] Initialize shadcn-svelte and core UI components
- [x] Configure locale routing with Greek as canonical default and English under `/en`
- [x] Add theme state, language switcher, shell layout, and starter eDoctor page
- [x] Verify with format, lint, typecheck, build, and local HTTP smoke tests
- [x] Switch installed shadcn-svelte primitives from Vega/Nova output to classic new-york styling
- [x] Fix Lucide imports and add starter file routes for current navigation links
- [x] Replace Lucide package imports with Icones/Iconify virtual icon imports

## SvelteKit Architecture Documentation Migration

Current run: `docs/runs/2026-05-03-sveltekit-architecture-docs`

- [x] Rewrite AGENTS.md and permanent docs for SvelteKit/Bun architecture
- [x] Add architecture aliases, shared scaffolding, and TanStack Query baseline
- [x] Verify with Bun check, lint, and build

## Shared + Generated Architecture Refactor

Current run: `docs/runs/2026-05-03-shared-generated-refactor`

- [x] Move Paraglide output to `src/generated/paraglide` and add `$paraglide`
- [x] Move shared UI, i18n helpers, and assets out of `src/lib`
- [x] Introduce route-only pages, mirrored screens, and the marketing home module
- [x] Verify with Bun check, lint, build, and locale smoke tests

## Architecture Cleanup + Atomic Module Hygiene

Current run: `docs/runs/2026-06-02-architecture-cleanup`

- [x] Create architecture cleanup run artifacts and progress tracking
- [x] Refactor the marketing home landing slice into private module components
- [x] Replace wildcard shared runtime barrels with explicit exports
- [x] Expand `documentation/architecture-pattern.md` with enforceable module, Atomic Design, shared, and import rules
- [x] Verify with `bun run check` and `bun run lint`

# TASKS (Index)

👉 Active run pointer: docs/runs/CURRENT.md

## Current run

- RUN_ID: <YYYY-MM-DD_slug>
- Path: docs/runs/<RUN_ID>/
- Status: ACTIVE / DONE
- Started: <YYYY-MM-DD>
- Last updated: <YYYY-MM-DD>

## Current run links

- 00-brief: docs/runs/<RUN_ID>/00-brief.md
- 10-plan: docs/runs/<RUN_ID>/10-plan.md
- 20-analysis: docs/runs/<RUN_ID>/20-analysis.md
- 30-decisions: docs/runs/<RUN_ID>/30-decisions.md
- 40-progress: docs/runs/<RUN_ID>/40-progress.md
- 50-qa: docs/runs/<RUN_ID>/50-qa.md
- 60-docs: docs/runs/<RUN_ID>/60-documentation.md
- 99-summary: docs/runs/<RUN_ID>/99-final-summary.md

## Process rules

- Όλα τα artifacts γράφονται μέσα στο run folder (docs/runs/<RUN_ID>/).
- Αν προκύψει νέο requirement στη μέση:
  - καταγράφεται ως CR στο 10-plan.md,
  - και “κλειδώνεται”/εγκρίνεται στο 30-decisions.md πριν συνεχίσει ο code-architect.
- Το QA gate γράφει PASS/CHANGES_REQUESTED στο 50-qa.md και γίνεται loop με τον code-architect μέχρι PASS.

## Run history

- <YYYY-MM-DD_slug>: docs/runs/<OLD_RUN_ID>/99-final-summary.md
- ...
