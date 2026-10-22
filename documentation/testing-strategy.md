# Testing Strategy

## Current gate

The required quality gates are:

```txt
bun run check    # Paraglide compile + svelte-kit sync + svelte-check
bun run lint     # Prettier + ESLint (implementation work)
bun run test     # Vitest run (unit + component)
bun run build    # routing / provider / config / env / public UI changes
```

## OpenAPI drift gate

`bun run openapi:check` is a separate CI drift gate for the generated API types:
it regenerates from the committed vendored spec and fails if
`src/generated/api/schema.ts` is stale (mirrors the backend's `openapi:check`).
Codegen is intentionally **not** wired into the hard `check` gate — the generated
types are committed, so `bun run check` stays hermetic and offline and
type-checks the committed output. `openapi:types` is wired into `prepare` (like
`paraglide:compile`) so types are present/fresh after `bun install`.

Before starting a large implementation that touches API data, run
`bun run openapi:check` to confirm the generated types
(`src/generated/api/schema.ts`) are still in sync with the vendored contract
(`src/generated/api/openapi.json`). If the backend contract has moved, run
`bun run openapi:generate` first (sync + regenerate types) and reconcile any
resulting type changes in the affected adapters/feature `types.ts`. The
`pre-push` hook (`verify:push`) also runs `bun run test` and `openapi:check`,
but verifying up front avoids building on a stale contract.

## Tooling in place

- **Vitest** `^4` (jsdom) — `vitest.config.ts` loads only the Svelte + icons
  plugins and mirrors the `$`/`$app` aliases; `vitest-setup-client.ts` registers
  jest-dom matchers and shims jsdom gaps (matchMedia, ResizeObserver,
  `Element.animate`, pointer-capture). jest-dom matcher types are declared in
  `src/vitest.d.ts`.
- **Svelte Testing Library** `^5` + `@testing-library/user-event`.
- **SvelteKit virtual modules** (`$app/environment`, `$app/state`, `$app/paths`,
  `$env/dynamic/public`) are mocked for jsdom under `vitest-mocks/` and aliased in
  the Vitest config. Tests set `page.url` to render a locale (`/en/...` for
  English) and set/delete `PUBLIC_*` keys on the mocked `env` object, resetting
  both in `afterEach`. Values computed once at import (`src/shared/config/env.ts`)
  are tested by setting the keys after `vi.resetModules()` and importing the
  module again. Storybook aliases the same `$env/dynamic/public` stand-in
  (`.storybook/main.ts`).
- Playwright (browser flows) is still to be added.
- **Storybook** `^10` (`@storybook/sveltekit`) is the component workshop. Stories
  are Svelte CSF (`*.stories.svelte`) co-located next to every `src/shared/ui/**`
  component, with an axe a11y panel (`@storybook/addon-a11y`) and autodocs.
  `bun run build-storybook` compiles and bundles every story and is the new
  Storybook gate (currently informational, not yet a hard CLAUDE.md blocker).

## Storybook story tests (deferred)

Browser-mode story tests via `@storybook/addon-vitest` are **not yet wired**.
When added they would:

- install `@vitest/browser` + `@vitest/browser-playwright` and run
  `bunx playwright install chromium`,
- convert `vitest.config.ts` into a two-project workspace (`unit` jsdom +
  `storybook` browser) so the fast jsdom suite stays the default `bun run test`,
- add `.storybook/vitest.setup.ts` (`setProjectAnnotations`) and
  `test:stories` / `test:all` scripts.

Until then, story `play` functions (e.g. dialog/popover/tabs open, cookie-consent
accept, account-menu) run only in the Storybook UI's interactions panel and are
not executed headlessly. The existing jsdom specs remain the authoritative
component test coverage, so `play` stories are kept minimal (one per
overlay/interactive component) to avoid duplicating them.

## File placement

- Unit/helper and component tests: colocated under `src/**` as `*.test.ts`.
- Component tests that need children/slots or composition render a small
  colocated `*.harness.svelte` (or `*.form-harness.svelte`) component.
- Architecture tests: `tests/architecture/**` (Vitest `include` covers `tests/**`).
- Tests of a root-level script: `tests/scripts/**` (`tests/scripts/check-secrets.test.ts` for `scripts/check-secrets.mjs`; the Vitest `include` does not reach `scripts/`).
- Browser tests: `tests/browser/**` (to be added).

## Component & form testing notes

- Prefer role/label queries (`getByRole`, `getByLabelText`) and assert ARIA
  state (`aria-checked`, `aria-expanded`, `aria-selected`) over implementation
  details.
- Overlays portal to `document.body`; query them through `screen`/`within` and
  use `findBy`/`waitFor` for transition-driven mount/unmount.
- Form fields wired through `createForm` support fine-grained reactivity; cover
  it with per-field render probes (`$effect` reading only one field's value) and
  assert no `console.error`/`warn` during interaction.

## Architecture coverage

In place:

- `tests/architecture/i18n-parity.test.ts` — every locale declared in
  `project.inlang/settings.json` has a `messages/<locale>.json` catalog (and no
  catalog exists for an undeclared locale), with the same keys as the base locale,
  non-empty texts, and the same `{placeholders}`. Paraglide silently falls back to
  the base locale for a missing translation, so this test is the only guard.
- `tests/architecture/scale-vocabulary.test.ts` — every class in `src/**`
  (components, stories, harnesses, demos, CSS) stays on the central size scale:
  no arbitrary size values, numeric steps only 0–6 in halves, every name known
  to its family (spacing/controls/media/web-only names, containers, roles,
  leadings, radii, icons), no `sm: md: lg: xl: 2xl:` prefix and no container
  query outside the container names, no length in any arbitrary value, no line
  height on a text size (`text-body-sm/7`), a leading only after a role, and no
  size written as a number in code or CSS (props, object keys, size and gesture
  constants, `step(n)` above the scale, `style=`/`style:`/`el.style`). Comments
  are blanked by a string-aware pass (`source-scan.ts`).
- `tests/architecture/touch-targets.test.ts` — every `<button>`, `<a>`,
  `<input>`, `<select>`, `<textarea>` and ARIA widget has a box of at least the
  48px touch target on both axes (from its classes, same-file definitions or the
  shared recipes `buttonVariants`/`toggleVariants`/`inputSizes`/`fieldSizes`:
  the height of each size and the width of each recipe `base`). It fails on a
  class that shrinks the box again (`min-w-0` after `min-w-touch`) and on a size
  passed to a target component (`<Button class="size-6">`); hidden form mirrors
  are skipped. The 8 gap between targets is not tested (see `design-tokens.md`).
- `tests/architecture/scale-parity.test.ts` (node environment) — transpiles the
  application's canonical `values/index.ts` (read only, from the sibling
  `../application` repo) and `src/shared/design/tokens/tokens.ts`, and fails on
  the first differing export path. It fails, with the path, when the sibling
  repo is missing.
- `tests/architecture/class-merge-imports.test.ts` — `tailwind-merge` and
  `tailwind-variants` are imported only by `src/shared/lib/utils.ts`.
- Each checker ships with negative fixtures next to the project scan, plus a
  proof that the scan read the code (file, token and tag counts).

The token registry and the class merger have unit specs next to them:
`src/shared/design/tokens/tokens.test.ts` (value rules, unique names, generated
theme) and `src/shared/lib/utils.test.ts` (`cn`/`tv` keep a role beside a color,
merge named sizes, drop a leading written before its role).

Architecture tests should also enforce:

- every non-layout page route has a mirrored screen folder
- screen folders contain `index.ts`, `page/index.svelte`, `hooks/index.ts`, `hooks/use-screen.svelte.ts`, and `types.ts`
- module UI slices follow the slice contract
- shadcn primitives live under shared UI primitives
- runtime code uses leaf imports instead of broad parent barrels
- shared code does not import from feature modules
- preferences are sanitized and stored under `edoctor.<appEnv>.preferences.v1`

## Browser coverage

Playwright should cover:

- Greek canonical `/`
- English `/en`
- `/el/**` redirect to canonical Greek URLs
- theme switching
- language switching
- primary navigation does not full-reload for valid SvelteKit routes
- unknown routes show SvelteKit error behavior without breaking the shell
