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

```txt
src/generated/
  paraglide/   Paraglide i18n output, imported through $paraglide
  api/         OpenAPI codegen: the vendored spec (openapi.json) and the
               generated wire types (schema.ts), imported through $generated/api
  design-tokens.css
```

Paraglide output is generated into `src/generated/paraglide` and imported through `$paraglide`. Do not edit generated files by hand.

The backend's OpenAPI 3.1 contract is vendored and codegen'd into
`src/generated/api` (see `documentation/framework-stack.md` for the scripts).
The generated types are tracked, never hand-edited, and exempt from the barrel,
Prettier, and ESLint rules (like the Paraglide output). Feature modules may not
import `$generated/api` directly; the wire types they need are re-exported
through the shared client layer at `src/shared/lib/api-client` and consumed via
`$shared`, so the module allowed-import list stays intact.

## Shared API Client

`src/shared/lib/api-client` is the generic building block for the typed
`openapi-fetch` client, mirroring `src/shared/lib/http`. It owns:

- the client base URL (`getApiBaseUrl()` + `/doctor`) so request URLs match the
  hand-written `http` client exactly,
- the SSR `fetch` injection seam,
- the response envelope/error guard (`unwrapEnvelope`, reusing `ApiError` from
  `src/shared/lib/http`), since `openapi-fetch` does no runtime validation,
- the `$shared` re-export of the generated wire types.
