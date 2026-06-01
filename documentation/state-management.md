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
