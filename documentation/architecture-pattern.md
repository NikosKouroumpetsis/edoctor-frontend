# Architecture Pattern

## Goal

The frontend is organized by information hiding and volatility. SvelteKit owns routing, screens own page-level orchestration, modules own feature behavior, and shared owns app-wide contracts.

## Runtime flow

```txt
src/routes/**/+page.svelte
  -> src/screens/<mirrored-route>/index.ts
  -> src/screens/<mirrored-route>/page/index.svelte
  -> src/modules/<feature>/ui/<slice>/page/index.svelte
  -> src/shared/**
```

## Routes

`src/routes` is routing glue, not the place for durable feature UI.

- `+page.svelte` should render a mirrored screen and pass route data/params.
- `+layout.svelte` should compose shell and providers for the route subtree.
- `+page.ts` and `+layout.ts` own universal load contracts.
- `+page.server.ts` and `+layout.server.ts` own server-only load contracts.
- `+server.ts` owns HTTP handlers.
- Route files may contain small route-only adapters, redirects, metadata, and SvelteKit exports.

## Screens

Every non-layout page route should mirror into `src/screens`.

```txt
src/screens/<route>/
  index.ts
  page/index.svelte
  hooks/index.ts
  hooks/use-screen.svelte.ts
  types.ts
```

Screen responsibilities:

- translate SvelteKit route data/params into page props
- compose one or more module UI slices
- own page-level lifecycle, title metadata helpers, and page-specific orchestration
- avoid feature business rules that belong in modules

`hooks/use-screen.svelte.ts` is the default home for screen-local runes. If a hook does not need Svelte reactivity, use a normal `.ts` helper in `lib`.

## Modules

Feature code lives under `src/modules/<feature>`.

UI slices use this contract:

```txt
src/modules/<feature>/ui/<slice>/
  index.ts
  page/index.svelte
  hooks/
  components/
  lib/
  types.ts
```

Slice responsibilities:

- `page/index.svelte` is the slice composition root.
- `hooks/` contains slice-local runes and interaction state.
- `components/` contains smaller private view pieces.
- `lib/` contains pure helpers for that slice.
- `types.ts` contains the slice public prop and view model types.
- `index.ts` exposes the slice's explicit public API.

Start feature code local. Promote to shared only after there are at least two real consumers or an app-wide contract.

## Shared

`src/shared` owns reusable contracts:

```txt
src/shared/
  config/
  design/
  hooks/
  lib/
  preferences/
  providers/
  query/
  state/
  storage/
  ui/
```

Shared UI hierarchy:

```txt
src/shared/ui/
  primitives/
  atoms/
  molecules/
  organisms/
  templates/
  icons/
```

shadcn-svelte primitives are generated into `src/shared/ui/primitives`. Domain-aware components should live in higher shared UI layers or feature modules.

## Imports

- Use `$screens`, `$modules`, and `$shared` aliases for architecture imports.
- Use `$paraglide` for generated Paraglide runtime/messages.
- Use `$generated` only for generated code. Do not place hand-written app code there.
- Do not import app code from `$lib`.
- Prefer leaf imports.
- Avoid broad runtime barrels and wildcard re-exports.
- Do not import from a feature module into `src/shared`.
