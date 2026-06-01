# Framework Stack

## Runtime

- Bun `1.3.13` is the only supported package manager/runtime for project commands.
- SvelteKit `^2.57.0`
- Svelte `^5.55.2`
- Vite `^8.0.7`
- TypeScript `^6.0.2`
- Svelte compiler runes mode is enabled for project code in `svelte.config.js`.

## Routing and i18n

- SvelteKit filesystem routing under `src/routes`.
- Paraglide JS `^2.15.2` provides type-safe messages and localized URL routing.
- Locale strategy is `url`, `cookie`, then `baseLocale`.
- Greek is canonical at `/`.
- English is prefixed under `/en`.
- `/el` and `/el/**` redirect permanently to the Greek canonical URL without the locale prefix.

## Data and state

- TanStack Svelte Query owns remote/server state.
- Svelte 5 runes in `.svelte.ts` files own local app/UI state and preferences.
- Shared query defaults live under `src/shared/query`.
- Shared preferences and persistence live under `src/shared/preferences` and `src/shared/storage`.

## Styling and UI

- Tailwind CSS `^4.2.2`
- shadcn-svelte `^1.2.7`
- shadcn-svelte style: `new-york`
- Bits UI `^2.18.1`
- Tailwind helpers: `clsx`, `tailwind-merge`, `tailwind-variants`, `tw-animate-css`
- Font: `@fontsource-variable/inter`
- Icons: Icones through `unplugin-icons` and Iconify icon JSON packages.

## Testing and quality

- Current required checks:
  - `bun run check`
  - `bun run lint`
  - `bun run build` for routing, provider, config, env, or public UI changes
- Target test stack:
  - Vitest
  - Svelte Testing Library
  - Playwright for browser flows
  - architecture contract tests under `tests/architecture`

## Notes

- Keep external dependencies intentionally low.
- Prefer SvelteKit and Svelte primitives before adding new framework-level libraries.
- Generated Paraglide files under `src/generated/paraglide` are not hand-edited.
- `components.json` is configured for future shadcn-svelte generation into the shared UI primitives layer.
