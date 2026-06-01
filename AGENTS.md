# AGENTS.md

## Project identity

This repository is the eDoctor web frontend.

- Framework: SvelteKit with Svelte 5 runes.
- Runtime/package manager: Bun only.
- Styling: Tailwind CSS v4, shadcn-svelte, `new-york` style, Bits UI primitives.
- Icons: Icones/Iconify virtual imports only, for example `~icons/lucide/search`.
- i18n: Paraglide JS with URL routing. Greek is canonical at `/`; English lives under `/en`; `/el/**` redirects to the Greek canonical URL.
- Architecture: SvelteKit route files stay thin, screens mirror routes, features live in module slices, app-wide contracts live in shared.

## Required commands

Use Bun for every project command.

- Install: `bun install`
- Dev server: `bun run dev`
- Type and Svelte check: `bun run check`
- Lint and format check: `bun run lint`
- Production build: `bun run build`
- Format when needed: `bun run format`

Before saying a code or type issue is fixed, run `bun run check` and make sure it passes. For implementation work, also run `bun run lint`; run `bun run build` when routing, SvelteKit config, env behavior, providers, or public UI flows changed.

## Architecture rules

`src/routes` is SvelteKit-owned routing glue. Keep route files small and route-specific:

- `+page.svelte` renders a mirrored screen.
- `+layout.svelte` owns route shell/provider composition for its subtree.
- `+page.ts`, `+page.server.ts`, `+layout.ts`, and `+layout.server.ts` own SvelteKit load contracts.
- `+server.ts` owns HTTP handlers only.

Every non-layout page route should have a mirrored screen folder:

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

Shared code lives under:

```txt
src/shared/{config,design,hooks,lib,preferences,providers,query,state,storage,ui}
```

Use aliases for architecture imports:

- `$screens/*`
- `$modules/*`
- `$shared/*`
- `$generated/*`
- `$paraglide/*` points to generated Paraglide output.

Do not import application code from `$lib/*`. The project keeps SvelteKit's default `$lib` alias unused so architecture imports remain explicit.

Prefer explicit leaf imports. Do not add broad runtime barrels or wildcard `export *` barrels for parent screen/module/shared folders.

## State management

- TanStack Svelte Query owns remote, async, and server state.
- Svelte 5 runes in `.svelte.ts` files own local app/UI state and preferences.
- Do not copy API responses into rune state.
- Do not keep mutable user/request state in module-level variables that can run on the server.
- Cross-tree state that participates in SSR should be created in providers/context, not as an unscoped server singleton.

Preferences are system-first. Persist only small, sanitized snapshots with env-scoped keys:

```txt
edoctor.<appEnv>.preferences.v1
```

## Environment rules

Canonical runtime envs:

- `development`
- `test`
- `preview`
- `production`

Canonical web variants:

- `development`
- `preview`
- `production`

Use Vite modes and SvelteKit env modules. Client-visible variables must use the SvelteKit public prefix, normally `PUBLIC_`. Private env values may only be read in server-only code with `$env/*/private`.

Do not use `NODE_ENV` as the app env or variant selector.

## Styling rules

- Use Tailwind v4 semantic tokens from `src/routes/layout.css`.
- Keep shadcn-svelte generated primitives in the shared UI primitives layer.
- Use shadcn-svelte `new-york` style.
- Do not use raw palette utilities in feature code unless the value is a deliberate one-off that belongs close to that feature.
- Use Icones imports from <https://icones.js.org/>. Do not add direct icon packages such as `@lucide/svelte`.

## Testing and verification

The current hard gate is `bun run check`. When test tooling is added, the baseline will be:

- unit and component tests with Vitest and Svelte Testing Library
- architecture contract tests for route mirrors, module slices, shared imports, and i18n parity
- browser flows with Playwright

If docs and implementation disagree, update the stale side before delivery.
