# Codebase Architecture Analysis

Scope: audit the current SvelteKit frontend against the repository's own architecture rules, current SvelteKit/Svelte 5 practices, feature-module boundaries, and Atomic Design as a UI design-system model.

Note: `docs/runs/CURRENT.md` points to `docs/runs/2026-05-03-shared-generated-refactor/` with status `DONE`. This run folder has `10-plan.md` and `40-progress.md`, but no `00-brief.md`.

## External Reference Baseline

- SvelteKit official routing model: `src/routes` is the filesystem router; `+page.svelte` defines pages; `+layout.svelte` composes shared layout and must render children.
- SvelteKit official state guidance: all route files can run on the server, and mutable shared server variables can leak between users; `load` should stay side-effect free.
- Svelte 5 official runes guidance: runes are valid in `.svelte`, `.svelte.js`, and `.svelte.ts`; `.svelte.ts` is appropriate for reusable reactive logic or shared reactive state.
- Brad Frost Atomic Design: atoms, molecules, organisms, templates, and pages are a mental model for deliberate UI systems, not a JavaScript or CSS architecture.
- Feature-Sliced Design reference: slices should be cohesive and independent; consumers should use a slice public API; wildcard public APIs and broad shared barrels are discouraged.
- shadcn-svelte docs: `components.json` controls Tailwind CSS path, aliases, TypeScript, registry, and generated component placement; custom aliases must exist in `svelte.config.js`.

## Repo Map

```txt
src/
  routes/       SvelteKit routing glue, layout CSS, root layout, page entrypoints
  screens/      mirrored page screens for home, doctors, clinics, plans, login
  modules/      feature modules; currently only marketing/ui/home-landing
  shared/       app-wide config, query, providers, preferences, storage, UI, lib
  generated/    Paraglide generated output
```

Current non-layout routes:

```txt
src/routes/+page.svelte
src/routes/doctors/+page.svelte
src/routes/clinics/+page.svelte
src/routes/plans/+page.svelte
src/routes/login/+page.svelte
```

Each route has a mirrored screen folder:

```txt
src/screens/{home,doctors,clinics,plans,login}/
  index.ts
  page/index.svelte
  hooks/index.ts
  hooks/use-screen.svelte.ts
  types.ts
```

## Shared/Common Areas

- `src/shared/ui/primitives`: shadcn-svelte/Bits UI wrappers for button, input, label, select, dropdown-menu, separator.
- `src/shared/ui/molecules`: `language-switcher`, `theme-toggle`.
- `src/shared/ui/organisms`: `app-shell`.
- `src/shared/ui/templates`: `route-placeholder`.
- `src/shared/preferences`: locale and theme preferences.
- `src/shared/storage`: sanitized preferences localStorage adapter.
- `src/shared/query`: TanStack Svelte Query client defaults.
- `src/shared/providers`: root Query provider.
- `src/shared/config`: canonical app env/variant and env-scoped storage key.

## Architecture & Conventions

Strong alignment:

- Route files are thin. Every `+page.svelte` only imports and renders its screen.
- `src/routes/+layout.svelte` composes root providers and shell, which matches SvelteKit's layout role.
- Svelte 5 runes mode is forced in `svelte.config.js`; current authored components use `$props`, `$derived`, `$bindable`, and event attributes instead of legacy `export let`/`on:`.
- Architecture aliases are configured in `svelte.config.js`: `$generated`, `$modules`, `$paraglide`, `$screens`, `$shared`.
- No application code imports from `$lib`.
- Icon usage follows the project rule: Icones virtual imports (`~icons/lucide/...`) are used; there is no direct `@lucide/svelte` dependency.
- i18n key parity between `messages/el.json` and `messages/en.json` is currently intact.
- Styling in authored UI primarily uses semantic Tailwind tokens from `layout.css`; no raw palette utilities were found in feature code apart from semantic chart tokens and favicon SVG fills.

Partial alignment:

- `src/shared/ui` expresses an Atomic Design-like taxonomy (`primitives`, `molecules`, `organisms`, `templates`), but there is no `atoms` folder yet.
- `src/modules/marketing/ui/home-landing` follows the local slice folder contract, but its `components/`, `hooks/`, and `lib/` folders are placeholders while the page is a single 203-line composition file.
- The module public API is explicit (`export { default } from './page/index.svelte'`), but the slice internals are not yet decomposed enough to show module-level atomic design.

Misalignment / drift:

- Some shared entrypoints use wildcard exports:
  - `src/shared/config/index.ts`
  - `src/shared/storage/index.ts`
  - `src/shared/preferences/index.ts`
  - `src/shared/preferences/i18n/index.ts`
- Repository docs say to avoid wildcard parent barrels for runtime code. Current consumers mostly import leaves, so the blast radius is low, but the files still weaken the convention.
- Feature-Sliced Design would prefer purpose-based segment names like `ui`, `api`, `model`, `lib`, `config`; the local project contract uses `components`, `hooks`, `types`. This is acceptable as a project-specific convention, but it is not strict FSD.

## Relevant Flows

Root render:

```txt
src/routes/+layout.svelte
  -> QueryProvider
  -> AppShell
  -> children route
```

Home route:

```txt
src/routes/+page.svelte
  -> src/screens/home
  -> src/modules/marketing/ui/home-landing
  -> shared primitives + generated Paraglide messages/runtime
```

Placeholder routes:

```txt
src/routes/{doctors,clinics,plans,login}/+page.svelte
  -> matching screen
  -> shared/ui/templates/route-placeholder
```

i18n routing:

```txt
vite.config.ts
  -> Paraglide URL/cookie/baseLocale strategy
src/hooks.ts
  -> deLocalizeUrl reroute
src/hooks.server.ts
  -> /el redirect to canonical Greek URL
  -> paraglideMiddleware sets lang/dir
```

Preferences/theme:

```txt
src/app.html
  -> early localStorage theme class/dataset
src/shared/preferences/theme/theme-state.svelte.ts
  -> browser-guarded ThemeState singleton
src/shared/ui/molecules/theme-toggle
  -> onMount init + toggle
```

## Recommended Touch Points

1. Decompose `src/modules/marketing/ui/home-landing/page/index.svelte`.
   - Suggested private module components:
     - `components/hero-search.svelte`
     - `components/trust-strip.svelte`
     - `components/care-flow-panel.svelte`
     - `components/stats-strip.svelte`
     - `components/care-modes.svelte`
   - Keep the slice public API unchanged at `src/modules/marketing/ui/home-landing/index.ts`.

2. Introduce module-local view models only if they reduce repetition.
   - Current repeated structures are trust items, flow steps, stats, and care modes.
   - A small `lib/build-home-landing-view-model.svelte.ts` or pure `lib/view-model.ts` could improve readability, but avoid moving Paraglide responses into mutable rune state.

3. Keep Atomic Design as a UI component language, not a route/module architecture.
   - Shared primitives map to atoms/primitives.
   - Module-specific repeated UI should stay module-local until two real consumers need it.
   - Add `atoms/` only when there are project-specific elements beyond shadcn primitives.

4. Remove or replace wildcard shared barrels when there is implementation time.
   - Prefer explicit exports or direct leaf imports.
   - Keep component-level index files such as `shared/ui/primitives/button/index.ts`; those are useful public APIs.

5. Add architecture contract tests when test tooling lands.
   - Route-to-screen mirrors.
   - Module slice contract.
   - No `$lib` app imports.
   - No wildcard runtime barrels in parent shared folders.
   - i18n key parity.
   - No direct icon package imports.

## Risks / Hotspots

- The home landing module is currently clean but monolithic. It will become harder to maintain once real search filters, availability, analytics, or experimentation are added.
- Placeholder screen hooks/types are consistent with the scaffold but add ceremony while empty. They become valuable once screens own orchestration; until then they are structural placeholders.
- Theme state is a module-level singleton. It is browser-guarded and not request/user data, so the current risk is low. Do not copy this pattern for auth, patient, doctor, or request-scoped data.
- `route-placeholder` is in shared templates but is product-copy-aware through Paraglide messages and eDoctor title formatting. It is acceptable as a temporary scaffold, but if it becomes a real product template, split generic layout from product-specific content.
- The run process docs are incomplete for the active pointer: `CURRENT.md` points to a `DONE` run and the expected `00-brief.md` is missing.

## Open Questions

- Do we want strict Atomic Design folders inside every module slice, or only inside `shared/ui` plus selective module-local component folders?
- Should the codebase align more closely with Feature-Sliced Design naming (`ui/model/api/lib`) or keep the current project-specific `page/hooks/components/lib/types` contract?
- Should upcoming doctor/clinic/search features become separate domain modules (`doctor-search`, `clinic-directory`, `booking`) instead of extending the marketing module?
- Should `route-placeholder` remain in shared after real page implementations land?

## Handoff

Recommended next role: `$reviewer` to decide whether the architecture should stay with the current project-specific module contract or move toward stricter FSD/Atomic naming before implementation changes begin.
