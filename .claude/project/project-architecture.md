# Project Architecture Contract

This file is the canonical architecture and engineering-quality contract for the
eDoctor web `frontend`. Every Claude workflow must read it before planning or
changing code. Supporting documentation may explain or illustrate these rules
but does not override them.

## Technology And Repository Shape

- Framework: SvelteKit with Svelte 5 runes, TypeScript.
- Runtime/package manager: Bun only.
- Styling: Tailwind CSS v4 with semantic tokens, shadcn-svelte (`new-york`
  style) on Bits UI primitives.
- Icons: Icones/Iconify virtual imports only (e.g. `~icons/lucide/search`); do
  not add direct icon packages.
- i18n: Paraglide JS with URL routing. Greek is canonical at `/`; English under
  `/en`; `/el/**` redirects to the Greek canonical URL. Generated output lives
  in `src/generated/paraglide` (imported through `$paraglide`).
- Server state: TanStack Svelte Query. Local/UI state: Svelte 5 runes in
  `.svelte.ts` files.
- Architecture: thin `src/routes` glue, mirrored `src/screens`, per-feature
  module slices, and a shared atomic-design layer.

Main ownership areas:

- `src/routes/`: SvelteKit routing glue only (`+page.svelte`, `+layout.svelte`,
  `+page.ts`/`+page.server.ts`, `+layout.ts`/`+layout.server.ts`, `+server.ts`).
- `src/screens/<route>/`: mirrored screen folders for non-layout page routes.
- `src/modules/<feature>/`: feature logic and feature UI slices.
- `src/shared/`: reusable cross-feature config, design, lib, preferences,
  providers, query, state, storage, and atomic UI; the home for generic
  building blocks and boilerplate components.
- `src/generated/`: generated code (Paraglide output under
  `src/generated/paraglide`); never hand-edit.
- `messages/`, `project.inlang/`: i18n source catalogs and Paraglide config.
- `documentation/`: permanent architecture, state, styling, testing guidance.
- `docs/runs/`: per-task run artifacts (not permanent conventions).

## Standard Architecture (Atomic Design + Feature Modules)

The dependency flow is presentation-first and unidirectional:

```text
src/routes (glue) -> src/screens (mirror) -> src/modules (feature) -> src/shared (generic)
```

Routing glue responsibilities:

- `+page.svelte` renders a mirrored screen.
- `+layout.svelte` owns route shell/provider composition for its subtree.
- `+page.ts`, `+page.server.ts`, `+layout.ts`, `+layout.server.ts` own
  SvelteKit load contracts.
- `+server.ts` owns HTTP handlers only.
- Keep route files small and route-specific; delegate real UI/data logic to
  `src/`.

Mirrored screen contract — every non-layout page route has a screen folder:

```txt
src/screens/<route>/
  index.ts
  page/index.svelte
  hooks/index.ts
  hooks/use-screen.svelte.ts
  types.ts
```

Feature UI lives under module slices:

```txt
src/modules/<feature>/ui/<slice>/
  index.ts
  page/index.svelte
  hooks/
  components/
  lib/
  types.ts
```

Hard boundaries:

- `src/routes` is routing glue only; no business or rendering logic there.
- Screens compose; feature behavior and data contracts live in modules.
- Generic reusable behavior is promoted to `src/shared`.
- Do not reintroduce backend-style layers
  (`domain/application/infrastructure`) anywhere in the frontend.
- Do not introduce a new folder/layer pattern without explicit approval.

## Atomic Design And Shared UI

Reusable UI lives under `src/shared/ui/` in an atomic hierarchy. The current
canonical buckets are:

- `primitives/`: shadcn-svelte (`new-york`) generated primitives on Bits UI —
  the atomic base of the system.
- `molecules/`: small compositions of primitives (e.g. `language-switcher`,
  `theme-toggle`).
- `organisms/`: larger composite UI (e.g. `app-shell`).
- `templates/`: screen-level reusable layout shells.

Shared UI placement rules:

- Keep shadcn-svelte generated primitives in `src/shared/ui/primitives`.
- One folder per molecule, organism, or template; parent shared UI folders
  export children through explicit `index.ts` barrels with named exports only —
  do not use wildcard `export *`.
- Components/screens/routes do not belong inside lower atomic buckets
  (templates is the one screen-level exception that lives in `templates/`).
- Introduce additional buckets (such as `atoms/`) only when an existing one is
  insufficient; do not pre-create empty layers.

Feature-local UI under `src/modules/<feature>/ui/<slice>/` follows the same
folder-entrypoint convention. Once a slice grows, introduce a local hierarchy
(`page/`, `hooks/`, `components/`, `lib/`, `types.ts`) rather than a flat dump.

## Shared-First Placement

`src/shared` owns generic cross-feature behavior and boilerplate. Before
creating a component, store, provider, storage adapter, preference, config,
query helper, or utility, search existing shared ownership:

```txt
src/shared/{config,design,lib,preferences,providers,query,state,storage,ui}
```

Promote behavior to `src/shared/**` when it is used across feature boundaries,
is meaningfully reusable, or is a generic primitive/helper/provider. Keep
behavior feature-local when its language and lifecycle belong to one feature. Do
not move code to shared merely because two implementations look similar. When
code becomes reusable during a change, consolidate callers onto the new
canonical shared source and remove duplicates. Add a new top-level shared folder
(for example `shared/hooks`) only when a real cross-cutting need exists.

## Imports And Aliases

Use architecture aliases instead of fragile deep relative imports:

- `$screens/*`
- `$modules/*`
- `$shared/*`
- `$generated/*`
- `$paraglide/*` (generated Paraglide output)

Rules:

- Do not import application code from `$lib/*`. SvelteKit's default `$lib` alias
  is intentionally unused so architecture imports stay explicit.
- Prefer explicit leaf imports. Do not add broad runtime barrels or wildcard
  `export *` barrels for parent screen/module/shared folders.

## State, Preferences, And Persistence

- TanStack Svelte Query owns remote/async/server state.
- Svelte 5 runes in `.svelte.ts` files own local app/UI state and preferences.
- Do not copy API responses into rune state.
- Do not keep mutable user/request state in module-level variables that can run
  on the server.
- Cross-tree state that participates in SSR is created in providers/context, not
  as an unscoped server singleton.
- Preferences are system-first; persist only small, sanitized snapshots with
  env-scoped, versioned keys, e.g. `edoctor.<appEnv>.preferences.v1`.

## Styling And i18n

- Use Tailwind v4 semantic tokens from `src/routes/layout.css`.
- Use shadcn-svelte `new-york` style; keep generated primitives in the shared UI
  primitives layer.
- Do not use raw palette utilities in feature code unless the value is a
  deliberate one-off that belongs close to that feature.
- Use Icones/Iconify virtual imports (e.g. `~icons/lucide/search`); do not add
  direct icon packages such as `@lucide/svelte`.
- i18n routing: Greek canonical at `/`, English under `/en`, `/el/**` redirects
  to the Greek canonical URL. Keep message catalogs and locales in parity. The
  Paraglide output in `src/generated/paraglide` is generated, never hand-edited.

## Naming And File Organization

- TypeScript with the repository Prettier config.
- Folder names are kebab-case and avoid repeating parent context.
- Leaf implementation entrypoints follow the screen/slice contracts above;
  non-leaf source folders expose children through explicit `index.ts` barrels
  with named exports only.
- Keep `types.ts` type-only; put runtime builders/helpers in explicit files.
- Do not invent suffixes or folder layers that the owning pattern does not use.

## Environments And Variants

- Canonical runtime envs: `development`, `test`, `preview`, `production`.
- Canonical web variants: `development`, `preview`, `production`.
- Use Vite modes and SvelteKit env modules for selection; do not use `NODE_ENV`
  as the app env or variant selector.
- Client-visible variables must use the SvelteKit public prefix (normally
  `PUBLIC_`). Private env values may only be read in server-only code via
  `$env/*/private`.
- Keep secrets out of version control and out of logs/reports.

## Testing And Verification

Read `documentation/testing-strategy.md` before adding tests.

Current state and targets:

- The current hard gate is `bun run check` (Paraglide compile + svelte-kit sync
  + svelte-check). It must pass before any code/type fix is called done.
- `bun run lint` (Prettier check + ESLint) for implementation work.
- `bun run build` when routing, SvelteKit config, env behavior, providers, or
  public UI flows changed.
- Target test baseline (as tooling is added): Vitest + Svelte Testing Library
  for unit/component tests, architecture contract tests for route mirrors,
  module slices, shared imports, and i18n parity, and Playwright for browser
  flows.

Use only scripts defined in `package.json`. Never claim that an unrun check
passed. Distinguish implementation defects, test defects, flaky behavior, and
environment blockers with evidence.

## Documentation And Cleanup

When implementation changes architecture, state, routing, envs, styling, i18n,
or verification, update the matching guide in `documentation/` in the same task.
Prefer updating an existing canonical document over creating an overlapping one.
Do not leave permanent conventions only in chat, TODOs, or run artifacts, and do
not leave stale docs, dead routes, duplicate constants, or unused helpers.

## Security And Data Boundaries

- Respect the SSR/client boundary: never read private env or secrets in
  client-reachable code; use `$env/*/private` in server-only modules.
- Validate and sanitize untrusted input (route params, query strings, load data,
  external responses) at the boundary before use.
- Do not expose secrets, tokens, or internal identifiers through responses,
  logs, errors, fixtures, or documentation.
- Review redirect, open-redirect, SSR data-leak, injection, and external-gateway
  risks when relevant. Security fixes must address the actual vulnerable path and
  receive negative regression coverage where practical.

## Final Quality Gate

Before implementation handoff:

- acceptance criteria are satisfied,
- `bun run check` passes,
- `bun run lint` passes,
- `bun run build` passes when routing/config/env/providers/public UI changed,
- architecture and ownership boundaries are respected,
- reusable behavior is in its canonical shared location,
- SSR/security-sensitive paths have been reviewed,
- documentation/configuration examples are current,
- replaced behavior and stale artifacts are cleaned up,
- and unrun checks or residual risks are stated explicitly.

Review findings must be ordered by severity with specific file/line evidence
where possible. Correctness, regressions, security, data integrity, architecture
drift, misplaced reusable behavior, and missing tests take priority over style.

## Supporting References

Read supporting documentation when relevant:

- `documentation/architecture-pattern.md`
- `documentation/shared.md`
- `documentation/state-management.md`
- `documentation/styling-guidelines.md`
- `documentation/design-tokens.md`
- `documentation/testing-strategy.md`
- `documentation/framework-stack.md`
- `documentation/development-workflow.md`

If a supporting document conflicts with this file, stop and report the exact
conflict instead of choosing silently.
