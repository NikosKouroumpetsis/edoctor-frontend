# Testing Strategy

## Current gate

The current required quality gate is:

```txt
bun run check
```

For implementation work also run:

```txt
bun run lint
```

For routing, provider, config, env, or public UI changes also run:

```txt
bun run build
```

## Target tooling

Add these when the first behavior tests are needed:

- Vitest for unit and architecture tests.
- Svelte Testing Library for component tests.
- Playwright for browser flows.

## File placement

- Unit/helper tests: colocated under `src/**` with `.unit.spec.ts`.
- Svelte component tests: colocated with `.unit.spec.ts`.
- Architecture tests: `tests/architecture/**`.
- Browser tests: `tests/browser/**`.
- Shared test utilities: `tests/utils/**`.

## Architecture coverage

Architecture tests should enforce:

- every non-layout page route has a mirrored screen folder
- screen folders contain `index.ts`, `page/index.svelte`, `hooks/index.ts`, `hooks/use-screen.svelte.ts`, and `types.ts`
- module UI slices follow the slice contract
- shadcn primitives live under shared UI primitives
- runtime code uses leaf imports instead of broad parent barrels
- shared code does not import from feature modules
- i18n keys have Greek and English parity
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
