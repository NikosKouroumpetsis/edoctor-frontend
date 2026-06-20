# Storybook adoption — planning dossier

> Status: **IMPLEMENTED (S0–S3, browser story-tests deferred).** Storybook
> `^10.4.6` (`@storybook/sveltekit` + Svelte CSF) is installed and configured
> (`.storybook/main.ts`, `.storybook/preview.ts`); `storybook` /
> `build-storybook` scripts are in `package.json`; and `*.stories.svelte` files
> are co-located next to **every** `src/shared/ui/**` component (primitives,
> molecules, organisms, templates) plus a `Showcases/Registration form`.
> Canonical docs updated: `documentation/framework-stack.md`,
> `documentation/testing-strategy.md`, `.claude/project/project-architecture.md`,
> `CLAUDE.md`.
>
> **Deferred follow-up:** the `@storybook/addon-vitest` browser-mode story-test
> runner (Vitest workspace + `@vitest/browser` + `@vitest/browser-playwright` +
> Chromium) — see `04-phases.md` S3 and `documentation/testing-strategy.md`.
> Note: on Vitest 4 the addon needs `@vitest/browser-playwright` (not just
> `@vitest/browser` + `playwright` as the original `01-setup.md` listed).
> This folder remains the resume-ready specification for that follow-up.

## Why

We built a full in-house component system across phases Φ1–Φ4 (primitives,
form-field molecules, generic organisms) on our own headless layer — no external
UI library. A Storybook workshop gives us:

- a single isolated playground for **every** component with live controls,
- auto-generated docs (props/usage) per component,
- accessibility (axe) checks per story,
- story-based component tests reusing our existing Vitest,
- a much clearer picture of states/variants than the `/test-components` gallery.

## Locked decisions (from product owner)

| Decision         | Choice                              | Notes                                                                           |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| Story format     | **Svelte CSF** (`*.stories.svelte`) | `defineMeta` + `<Story>`; native snippets/children for our compound components. |
| Test integration | **`@storybook/addon-vitest`**       | Stories also run as Vitest tests + axe a11y.                                    |
| Cadence          | **Plan only now**                   | Implement later from these docs.                                                |
| Scope            | All shared + Φ1–Φ4 components       | **Exclude doctor-specific** (`src/modules/doctors/*`).                          |

## Source of truth used for this plan

Storybook docs fetched via Context7 (`/storybookjs/storybook`, latest) on the
date this dossier was written. Key facts captured:

- Framework package for our stack: **`@storybook/sveltekit`** (reuses our
  `vite.config.ts`, so `~icons/*`, `$paraglide`, design-tokens, Tailwind v4 and
  `$app/*` all work without extra mocks).
- Svelte CSF lives in **`@storybook/addon-svelte-csf`**; stories are
  `*.stories.svelte` with a `<script module>` calling `defineMeta(...)`.
- A11y via **`@storybook/addon-a11y`** (axe), autodocs via `tags: ['autodocs']`.
- Component testing via **`@storybook/addon-vitest`** (Vitest plugin
  `storybookTest`, browser mode).

## Documents in this folder

1. [`01-setup.md`](./01-setup.md) — dependencies, `.storybook/*` config, scripts,
   theme + a11y + vitest wiring (full file contents, copy-paste ready).
2. [`02-story-conventions.md`](./02-story-conventions.md) — how to write stories;
   patterns per component category with concrete Svelte CSF examples.
3. [`03-component-inventory.md`](./03-component-inventory.md) — the exhaustive
   matrix: every component in scope and the stories it should get.
4. [`04-phases.md`](./04-phases.md) — S0→S3 phased execution with task checklists
   and verification gates.
5. [`05-risks-and-open-questions.md`](./05-risks-and-open-questions.md) — version
   alignment, known pitfalls, and the few things to confirm at implementation time.

## How to resume (TL;DR)

1. Read `01-setup.md`, install deps, create `.storybook/main.ts` + `preview.ts`.
2. Do **S0** (3 sample stories) to validate the pipeline (icons/tokens/$app/dark).
3. Author stories per `03-component-inventory.md`, phase by phase (`04-phases.md`).
4. Wire `@storybook/addon-vitest` (S3) and add `build-storybook` to the gates.
