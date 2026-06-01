# Shared Layer

## Purpose

`src/shared` contains app-wide contracts that are stable enough to be reused across screens and modules. Shared code must be boring, explicit, and difficult to misuse.

## Promotion rule

Keep code feature-local first. Promote to shared only when one of these is true:

- at least two real consumers need the same behavior
- the behavior is an app-wide contract, such as config, env, theme, locale, query, storage, or providers
- the behavior is a design-system primitive

Do not promote speculative abstractions.

## Folder map

```txt
src/shared/
  config/       app env, variants, public config parsing
  design/       design assets, tokens, and design-system helpers
  hooks/        app-wide Svelte hooks/runes
  lib/          pure framework-agnostic helpers
  preferences/ theme, language, and preferences resolution
  providers/   root and subtree providers
  query/       TanStack Svelte Query setup
  state/       app-wide local state when provider scope is not required
  storage/     browser/server-safe storage adapters
  ui/          reusable UI hierarchy
```

## UI hierarchy

```txt
src/shared/ui/
  primitives/  shadcn-svelte and low-level wrappers
  atoms/       small project-specific UI pieces
  molecules/   composed controls
  organisms/   larger reusable sections
  templates/   reusable layouts
  icons/       project icon wrappers when virtual imports are not enough
```

shadcn-svelte generated components belong in `primitives`. Feature-specific composition belongs in `src/modules/<feature>`.

## Provider access

Provider internals stay private. Screens and modules consume provider state through exported hooks, context helpers, or explicit props.

Root providers belong in `src/shared/providers` and are composed from `src/routes/+layout.svelte` or a route group layout.

## Storage and preferences

Persist only small, sanitized preference snapshots. The shared storage key is:

```txt
edoctor.<appEnv>.preferences.v1
```

Do not persist TanStack Query caches, auth sessions, or large business payloads in the preferences store.

## Imports

- Use `$shared/<area>/<leaf>` imports.
- Export explicit named APIs from folder entrypoints.
- Avoid wildcard parent barrels for runtime code.
- Shared code must not depend on feature modules.

## Generated Code

Generated output lives under `src/generated`, not `src/shared`.

Paraglide output is generated into `src/generated/paraglide` and imported through `$paraglide`. Do not edit generated files by hand.
