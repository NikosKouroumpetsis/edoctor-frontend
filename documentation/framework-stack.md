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
- shadcn-svelte `^1.2.7` (style reference / CLI for the `new-york` look)
- shadcn-svelte style: `new-york`
- UI components are in-house, built on the headless layer in
  `src/shared/lib/headless`. No external UI component library is allowed for new
  code. Bits UI `^2.18.1` is being phased out — only `select` and
  `dropdown-menu` still import it, pending their rewrite.
- Tailwind helpers: `clsx`, `tailwind-merge`, `tailwind-variants`, `tw-animate-css`
- Font: `@fontsource-variable/inter`
- Icons: Icones through `unplugin-icons` and Iconify icon JSON packages.

## Component workshop (Storybook)

- Storybook `^10.4.6` with the `@storybook/sveltekit` framework, which reuses the
  project `vite.config.ts` (design tokens, Tailwind v4, `unplugin-icons`,
  Paraglide) so stories render exactly like the app.
- Stories are **Svelte CSF** (`@storybook/addon-svelte-csf`): `*.stories.svelte`
  files co-located next to each component, using `defineMeta` + `<Story>`.
- Addons: `@storybook/addon-a11y` (axe) and `@storybook/addon-docs` (autodocs via
  `tags: ['autodocs']`).
- Config lives in `.storybook/main.ts` (stories glob + addons) and
  `.storybook/preview.ts` (imports `src/routes/layout.css`, a Light/Dark theme
  toolbar that toggles the app's `.dark` class, and `a11y: { test: 'error' }`).
- Scope: every component under `src/shared/ui/**` (primitives, molecules,
  organisms, templates) plus a `Showcases/Registration form`. Doctor-specific
  components under `src/modules/doctors/**` are intentionally excluded (the
  stories glob is scoped to `src/shared/ui/**`).
- Commands: `bun run storybook` (dev server on port 6006) and
  `bun run build-storybook` (static build to `storybook-static/`, git-ignored).
- Not yet wired: browser-mode story tests via `@storybook/addon-vitest` (would
  need `@vitest/browser` + `@vitest/browser-playwright` and a Vitest workspace) —
  deferred follow-up. Story `play` functions are authored as in-UI interaction
  demos but are not yet run headlessly.

## Testing and quality

- Current required checks:
  - `bun run check`
  - `bun run lint`
  - `bun run test` (Vitest, single run)
  - `bun run build` for routing, provider, config, env, or public UI changes
- Test stack in place:
  - Vitest `^4` (`vitest.config.ts`, jsdom)
  - Svelte Testing Library `^5` + `@testing-library/user-event`
  - `@testing-library/jest-dom` matchers (types in `src/vitest.d.ts`)
- Target test stack (not yet added):
  - Playwright for browser flows
  - architecture contract tests under `tests/architecture`

## Notes

- Keep external dependencies intentionally low.
- Prefer SvelteKit and Svelte primitives before adding new framework-level libraries.
- Generated Paraglide files under `src/generated/paraglide` are not hand-edited.
- `components.json` is configured for future shadcn-svelte generation into the shared UI primitives layer.
