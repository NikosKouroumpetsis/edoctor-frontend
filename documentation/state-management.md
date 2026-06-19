# State Management

## Ownership model

- SvelteKit load functions own request-time data fetching and route data.
- TanStack Svelte Query owns remote, async, and server cache state after hydration.
- Svelte 5 runes own local app/UI state and preferences.
- URL state belongs in the URL when it affects navigation, filters, or shareable views.

## TanStack Svelte Query

Query setup lives under `src/shared/query` and is mounted by the root provider layer.

Defaults:

- Query stale time: 30 seconds
- Query garbage collection time: 5 minutes
- Query retry: 1
- Mutation retry: 0
- Queries are disabled on the server by default unless a route deliberately prefetches through SvelteKit load.

Use invalidation/refetch instead of copying server entities into rune state.

## Marketplace data and the discovery home

The discovery home reads the public doctor marketplace backend
(`GET /api/v1/doctor/public/*`). The integration mirrors the `edoctor-application`
contract: `src/shared/lib/http` is the fetch/envelope/error/media-URL layer,
`src/shared/config/api.ts` resolves the base URL, and
`src/modules/search-doctors/api/marketplace` owns the typed endpoints, the
server-side card adapter, the per-section scope configs, and the slug/id resolvers.

Two complementary mechanisms drive the home, each used where it is strongest:

- **Initial paint — SvelteKit streaming SSR.** `routes/+page.server.ts` returns the
  category rail immediately and each home section as an un-awaited promise
  (`home/load.ts`). SvelteKit streams them into the document, so sections reveal
  serially as the backend responds — skeleton while pending, cards once resolved.
  Streamed promises never reject: a failed section degrades to a per-section error
  state instead of crashing the response.
- **Category filtering — TanStack Svelte Query.** Selecting a rail category is a
  client interaction owned by `useHomeSections`. The category is resolved into a
  server-side scope fragment (professional ids / service slugs / text) embedded in
  each section's query key, so a category change refetches server-scoped results.
  `keepPreviousData` swaps content in place instead of flashing the skeleton, and
  caching bounds backend load. The `all` view stays disabled here because it is
  served by the streamed SSR load.

Category filtering is server-scoped, not client-side tag filtering: backend cards
carry no category tags, and the `online` category requires a service scope only the
server can apply.

The base URL comes from `PUBLIC_API_BASE_URL` (public by design — used by both the
SSR load and browser refetch), defaulting to `http://localhost:8081/api/v1` for the
local seed-mock server.

Two seed-data alignments live in the marketplace layer: section/category scoping maps
each rail specialty to its professional display term (`SPECIALTY_SEARCH_TERMS`) so the
`/suggestions` lookup resolves real `professionalId`s, and home sections fall back to a
text term the backend matcher recognizes (e.g. `online`) when no service slug applies.
Cards with no backend image resolve to a local `static/doctor-placeholder.svg` via
`resolveMediaUrl`, so a missing photo never renders as a broken image.

## Svelte runes

Use `.svelte.ts` files for local state that needs Svelte reactivity outside components.

Good uses:

- theme and language preferences
- dismissible UI state
- app shell toggles
- screen-local interaction state
- wizard/onboarding progress that is not server-owned

Bad uses:

- API result lists
- server entities duplicated from Query
- auth/session secrets
- request-specific state in module-level variables

## SSR safety

SvelteKit can run code on both server and client. Do not store mutable user/request state in module-level variables that can be shared across requests.

For state that must cross a component tree during SSR, create it in a provider or layout context. Pass data down from load functions; do not write to stores as a side effect inside load.

## Preferences model

Preferences are system-first.

Canonical values:

- `themePreference`: `system | light | dark`
- `languagePreference`: `system | el | en`

Resolved values:

- `resolvedTheme`: `light | dark`
- `resolvedLanguage`: `el | en`

Greek is the canonical default route language at `/`; English is exposed at `/en`. If system language is unsupported, resolve to Greek for the canonical web experience unless a product decision changes this.

## Persistence policy

- Persist only the small preferences snapshot.
- Web persistence uses the shared browser storage adapter.
- Persisted keys are env-scoped and versioned:

```txt
edoctor.<appEnv>.preferences.v1
```

- Sanitize payloads during hydration.
- Do not persist TanStack Query data, auth sessions, or large business payloads in preferences.

## Dependency policy

Do not introduce another global state manager unless a concrete requirement proves that Svelte runes plus TanStack Query are insufficient.
