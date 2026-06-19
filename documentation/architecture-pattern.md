# Architecture Pattern

## Purpose

The frontend is organized by information hiding, volatility, and clear ownership.

SvelteKit owns routing. Screens own page-level orchestration. Modules own feature behavior and
feature-specific UI. Shared owns app-wide contracts and reusable design-system pieces.

Atomic Design is used as a UI composition vocabulary, not as the whole application architecture.
The application architecture is route -> screen -> module -> shared. Atomic Design helps decide how
UI components are shaped, named, split, and promoted.

## Non-Negotiable Direction

Runtime dependencies must flow in one direction:

```txt
src/routes
  -> src/screens
  -> src/modules
  -> src/shared
```

Generated code is a side input, not an ownership layer:

```txt
src/generated/paraglide
  -> imported through $paraglide only
```

Allowed dependency rules:

- `src/routes` may import mirrored screens and app-wide route shell/provider code.
- `src/screens` may import modules, shared code, SvelteKit route state, and generated i18n.
- `src/modules` may import shared code and generated i18n.
- `src/shared` must not import routes, screens, or modules.
- `src/generated` must not contain hand-written app code.

Forbidden dependency rules:

- Do not import application code from `$lib`.
- Do not import private files from another module slice.
- Do not import route files from screens, modules, or shared.
- Do not make shared depend on domain modules.
- Do not keep mutable user/request state in module-level variables.

## Golden Runtime Flow

The normal page flow is:

```txt
src/routes/**/+page.svelte
  -> src/screens/<mirrored-route>/index.ts
  -> src/screens/<mirrored-route>/page/index.svelte
  -> src/modules/<feature>/ui/<slice>/index.ts
  -> src/modules/<feature>/ui/<slice>/page/index.svelte
  -> src/modules/<feature>/ui/<slice>/components/*.svelte
  -> src/shared/**
```

Root shell/provider flow is:

```txt
src/routes/+layout.svelte
  -> src/shared/providers/*
  -> src/shared/ui/organisms/app-shell
  -> route children
```

## Routes

`src/routes` is SvelteKit-owned routing glue. It is not the place for durable feature UI.

Route files may contain:

- SvelteKit file-route declarations.
- Route-specific `load` contracts.
- SvelteKit redirects and HTTP handlers.
- Minimal route adapters that pass route data/params into a mirrored screen.
- Route-group layouts and provider/shell composition for a subtree.
- Route metadata only when it truly belongs to the route boundary.

Route files must not contain:

- Feature business rules.
- Long-lived page markup.
- Domain components.
- Search/filter/form business state.
- API response copies in local rune state.
- App-wide mutable singletons.

### Page Routes

Every non-layout `+page.svelte` should render one mirrored screen.

Good:

```svelte
<script lang="ts">
	import DoctorsScreen from '$screens/doctors';
</script>

<DoctorsScreen />
```

Acceptable additions:

- Passing route `data` or route params to the screen.
- Very small route-only adapters.
- SvelteKit exports that cannot live elsewhere.

If a route page grows beyond a small adapter, move the work into the mirrored screen or module.

### Layout Routes

`+layout.svelte` composes shell and providers for a route subtree.

Good layout responsibilities:

- Root providers such as query, theme, auth boundary, or feature flag provider.
- App shell selection.
- Subtree-specific navigation shell.
- Rendering `children`.

Avoid putting feature page content in layouts. Layouts should compose the frame, not own feature
behavior.

### Load Files

Use SvelteKit load files for request-time data and route contracts:

- `+page.ts` and `+layout.ts`: universal load.
- `+page.server.ts` and `+layout.server.ts`: server-only load and private env access.
- `+server.ts`: HTTP handlers only.

Load functions should return data. They should not mutate shared stores as a side effect.

## Screens

Every non-layout page route mirrors into `src/screens`.

```txt
src/screens/<route>/
  index.ts
  page/index.svelte
  hooks/index.ts
  hooks/use-screen.svelte.ts
  types.ts
```

Screen responsibilities:

- Translate SvelteKit route data and params into page props.
- Compose one or more module UI slices.
- Own page-level lifecycle and page-specific orchestration.
- Own page metadata helpers when metadata is route/screen-specific.
- Coordinate URL state when it affects navigation, filters, or shareable views.
- Keep feature business rules inside modules.

Screen files should stay thin. A screen is allowed to orchestrate; it should not become the real
feature implementation.

### Screen Public API

`src/screens/<route>/index.ts` is the screen public API.

Good:

```ts
export { default } from './page/index.svelte';
```

Do not add broad parent barrels under `src/screens`.

### Screen Hooks

`hooks/use-screen.svelte.ts` is the default home for screen-local Svelte runes.

Use it for:

- Screen-local interaction state.
- URL-derived view state.
- Page-level derived values.
- Client-only lifecycle helpers that are not feature business logic.

If a helper does not need Svelte reactivity, use a plain `.ts` file in a local `lib/` folder.

Do not put remote API responses into screen rune state. Remote/server state belongs to SvelteKit
load functions or TanStack Svelte Query.

## Modules

Feature code lives under `src/modules/<feature>`.

A feature module is a product/domain capability, not a route. Examples:

- `marketing`
- `doctor-search`
- `clinic-directory`
- `booking`
- `auth`
- `patient-profile`

Prefer cohesive modules that can evolve independently. A module can have multiple UI slices if the
feature has multiple surfaces.

## Module UI Slices

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

- `index.ts` exposes the slice public API.
- `page/index.svelte` is the slice composition root.
- `components/` contains private view components for the slice.
- `hooks/` contains slice-local runes and interaction state.
- `lib/` contains pure helpers and view-model builders for the slice.
- `types.ts` contains public prop types and slice-local view model types.

The current preferred import path for screens is the slice public API:

```ts
import HomeLanding from '$modules/marketing/ui/home-landing';
```

Do not import private slice components from outside the slice:

```ts
// Avoid
import HeroSearch from '$modules/marketing/ui/home-landing/components/hero-search.svelte';
```

### Slice Page Root

`page/index.svelte` should read like the feature surface skeleton.

Good:

```svelte
<script lang="ts">
	import HeroSection from '../components/hero-section.svelte';
	import StatsStrip from '../components/stats-strip.svelte';
	import CareModes from '../components/care-modes.svelte';
</script>

<main>
	<HeroSection />
	<StatsStrip />
	<CareModes />
</main>
```

The slice page may own:

- Page-local SvelteKit state such as `page.url`.
- Locale/message option resolution for the slice.
- Localized URL helpers.
- The order of sections.
- Data wiring from hooks/view models into private components.

The slice page should not contain:

- Every section's full markup.
- Repeated cards/items that can become private components.
- Large data transformation blocks.
- Remote cache logic that belongs in a query hook or load function.

### Private Components

Use `components/` for private UI pieces that belong only to this slice.

Good private component names:

- `hero-section.svelte`
- `hero-search.svelte`
- `trust-strip.svelte`
- `care-flow-panel.svelte`
- `stats-strip.svelte`
- `care-modes.svelte`
- `doctor-card.svelte`
- `availability-filter.svelte`

Split a private component when one of these is true:

- The parent page is no longer readable as composition.
- A visual block has a clear product meaning.
- A block has its own accessibility or interaction surface.
- Repeated markup appears more than once.
- The component needs focused props or a small view model.

Do not split only to satisfy folder ceremony. A clear 40-line component is better than five vague
10-line components.

### Module Hooks

Use `hooks/` for local interactive behavior that needs Svelte reactivity.

Good:

- Search form state before submission.
- Filter panel open/closed state.
- Optimistic UI state that is not server-owned.
- Wizard step state.
- Derived display state from query/load data.

Avoid:

- Copying API entities into rune state.
- Auth/session secrets.
- Request-specific module-level mutable variables.
- Cross-feature global state.

### Module Lib

Use `lib/` for pure functions and non-reactive helpers.

Good:

- View model builders.
- Sorting/grouping helpers.
- URL query serialization.
- Formatting that is feature-specific.

Keep helpers local until another real consumer needs them.

### Module Types

Use `types.ts` for the slice's public prop contracts and local view models.

Good:

```ts
export type LocalizedHref = (path: string) => string;

export interface HomeLandingMessageOptions {
	locale: SupportedLocale;
}
```

Avoid exporting broad domain models from UI slice `types.ts`. Domain-wide contracts should live in
the feature's domain/model area once that area exists.

## Atomic Design

Atomic Design is a way to reason about UI composition:

- Atoms: smallest reusable UI pieces.
- Molecules: small combinations of atoms with one focused job.
- Organisms: larger reusable sections.
- Templates: reusable layout structures.
- Pages: concrete route/screen instances with real content and data.

In this repo, Atomic Design is applied differently in shared UI and feature modules.

### Shared UI Atomic Hierarchy

Shared UI uses this hierarchy:

Current buckets in the tree:

```txt
src/shared/ui/
  primitives/
  molecules/
  organisms/
  templates/
```

Definitions:

- `primitives/`: in-house shadcn-styled (`new-york`) controls built on the
  headless layer in `src/shared/lib/headless` (no external UI library).
  Domain-free, low-level, accessible controls. This is the atomic base of the system.
- `molecules/`: composed controls with a focused app-wide job, such as language switcher or theme
  toggle.
- `organisms/`: larger reusable app-wide sections, such as app shell.
- `templates/`: reusable layout structures. Keep them generic and prop-driven.

Optional, create-on-demand buckets (not currently present — add only when an existing bucket is
insufficient, do not pre-create empty layers):

- `atoms/`: project-specific domain-free pieces smaller than a molecule, when `primitives` are not
  enough.
- `icons/`: project icon wrappers only when virtual Icones imports are not enough.

`src/shared/ui/primitives` is where shadcn-svelte generated components belong.

### Module-Local Atomic Thinking

Do not force `atoms/molecules/organisms` folders inside every module slice by default.

For normal module slices, use a flat private `components/` folder and name components by product
meaning:

```txt
src/modules/marketing/ui/home-landing/components/
  hero-section.svelte
  hero-search.svelte
  trust-strip.svelte
  care-flow-panel.svelte
  stats-strip.svelte
  care-modes.svelte
```

Think atomically while naming and splitting:

- A form field row can be treated like a molecule.
- A search form can be treated like a molecule or organism depending on complexity.
- A hero section is usually an organism.
- A full landing page is the slice page/root, not an organism.

If a slice becomes large enough that a flat `components/` folder is hard to scan, it may introduce
subfolders:

```txt
components/
  atoms/
  molecules/
  organisms/
```

Only do this after the slice actually needs it. Do not add empty atomic folders as scaffolding.

### Promotion Rule

Start feature UI local.

Promote a component to `src/shared/ui` only when one of these is true:

- At least two real consumers need the same behavior.
- The component is domain-free and belongs to the design system.
- The component expresses an app-wide shell, provider, preference, or navigation contract.

Do not promote:

- Product copy blocks.
- Feature-specific forms.
- Temporary placeholders.
- Components that merely look similar but carry different behavior.

Promotion must preserve direction:

```txt
module-local component
  -> shared/ui only after it becomes domain-free or truly shared
```

Once promoted, the shared component must not import from the original module.

## Shared

`src/shared` owns reusable contracts that are stable enough to be reused across screens and modules.

```txt
src/shared/
  config/       app env, variants, public config parsing
  design/       design assets, tokens, design-system helpers
  lib/          pure framework-agnostic helpers
  preferences/ theme, language, and preference resolution
  providers/   root and subtree providers
  query/        TanStack Svelte Query setup
  state/        app-wide local state when provider scope is not required
  storage/      browser/server-safe storage adapters
  ui/           reusable UI hierarchy
```

Add a new top-level shared folder (for example `hooks/` for app-wide Svelte hooks/runes) only when a
real cross-cutting need exists; do not pre-create empty folders.

Shared code should be:

- Domain-free unless the domain is truly app-wide.
- Explicitly exported.
- Easy to test.
- SSR-safe.
- Difficult to misuse.

Shared code should not:

- Know about feature modules.
- Own request/user-specific mutable state.
- Import screens or routes.
- Become a dumping ground for speculative helpers.

## Public APIs and Barrels

Use explicit public APIs.

Good slice public API:

```ts
export { default } from './page/index.svelte';
```

Good shared primitive public API:

```ts
export {
	Root,
	Root as Button,
	buttonVariants,
	type ButtonProps,
	type ButtonSize,
	type ButtonVariant
};
```

Good shared runtime public API:

```ts
export { appEnv, appEnvs, appVariant, appVariants, preferencesStorageKey } from './env';
export type { AppEnv, AppVariant } from './env';
```

Avoid:

```ts
export * from './env';
```

Reasons to avoid wildcard exports:

- They hide the real public API.
- They make accidental exports easy.
- They make ownership harder to review.
- They weaken tree and dependency audits.

Allowed exception:

- Generated code may export however its generator requires.

## Imports

Use architecture aliases:

- `$screens/*`
- `$modules/*`
- `$shared/*`
- `$generated/*`
- `$paraglide/*`

Use `$paraglide` for generated Paraglide runtime/messages.

Use `$generated` only for generated code. Do not place hand-written app code there.

Do not import application code from `$lib`.

Prefer leaf imports:

```ts
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { Button } from '$shared/ui/primitives/button';
```

Avoid broad parent imports when a leaf exists:

```ts
// Avoid
import { getPageLocale } from '$shared/preferences';
```

Inside a slice, relative imports are preferred for private files:

```ts
import HeroSearch from '../components/hero-search.svelte';
import type { LocalizedHref } from '../types';
```

## State Management Boundary

State ownership:

- SvelteKit load functions own request-time data and route contracts.
- TanStack Svelte Query owns remote, async, and server cache state after hydration.
- Svelte 5 runes in `.svelte.ts` files own local UI/app state and preferences.
- URL state belongs in the URL when it affects navigation, filters, or shareable views.

Do not copy API responses into rune state.

Use runes for:

- Theme and language preferences.
- Dismissible UI state.
- Screen-local interaction state.
- Slice-local filter panel state.
- Wizard/onboarding state that is not server-owned.

Avoid runes for:

- API result lists.
- Server entities duplicated from Query.
- Auth/session secrets.
- Request-specific state in module-level variables.

SSR safety rule:

- If state can vary by user/request and code can run on the server, do not store it as a module-level
  singleton.
- If state must cross a tree during SSR, create it in a provider/context and scope it to that tree.

Browser-only state must guard browser APIs with `$app/environment` `browser` or run inside
client-only lifecycle.

## i18n and URL Routing

Paraglide owns messages and localized routing.

Rules:

- Greek is canonical at `/`.
- English lives under `/en`.
- `/el` and `/el/**` redirect to the Greek canonical URL without the locale prefix.
- Import generated messages from `$paraglide/messages.js`.
- Import generated runtime helpers from `$paraglide/runtime`.
- Do not hand-edit generated Paraglide output.

Recommended slice pattern:

```svelte
<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { localizeHref } from '$paraglide/runtime';

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });

	const localizedHref = (path: string) =>
		resolve(localizeHref(path, { locale: currentLocale }) as Pathname);
</script>
```

Private module components should receive `messageOptions` and `localizedHref` as props when they
need them. This keeps URL/locale orchestration near the slice root and makes private components
easier to test and reason about.

## Styling and Design-System Rules

Use Tailwind CSS v4 semantic tokens from `src/routes/layout.css`.

Prefer:

- `bg-background`
- `text-foreground`
- `bg-card`
- `border-border`
- `text-muted-foreground`
- `bg-primary`
- `text-primary-foreground`
- `ring-ring`

Avoid raw palette utilities in feature code unless the value is a deliberate one-off.

Use shadcn-svelte primitives from:

```txt
src/shared/ui/primitives
```

Use Icones/Iconify virtual imports:

```ts
import SearchIcon from '~icons/lucide/search';
```

Do not add direct icon component packages such as `@lucide/svelte`.

Feature-specific composition belongs in modules. Shared UI belongs in shared only after the
promotion rule is satisfied.

## Testing and Verification

Current hard gates:

```txt
bun run check
bun run lint
```

Run `bun run build` when routing, SvelteKit config, env behavior, providers, or public UI flows
change.

When test tooling is added, architecture tests should enforce:

- Every non-layout page route has a mirrored screen folder.
- Screen folders contain `index.ts`, `page/index.svelte`, `hooks/index.ts`,
  `hooks/use-screen.svelte.ts`, and `types.ts`.
- Module UI slices follow the `index/page/hooks/components/lib/types` contract.
- Slice consumers import slice public APIs, not private components.
- Shared code does not import feature modules, screens, or routes.
- Runtime code does not use `$lib` for app imports.
- Authored runtime code does not use wildcard `export *` barrels.
- shadcn-svelte primitives live under `src/shared/ui/primitives`.
- i18n keys have Greek and English parity.
- Icons use Icones virtual imports.

## Change Checklist

Before adding or changing a page:

- Add or verify the SvelteKit route file.
- Add or verify the mirrored screen folder.
- Keep the route file thin.
- Put feature behavior in a module slice.
- Keep feature UI private until it has a real shared contract.
- Use semantic tokens and shared primitives.
- Use Paraglide messages for user-facing copy.
- Run the required Bun verification.

Before promoting code to shared:

- Confirm at least two real consumers or an app-wide contract.
- Remove feature-specific copy and behavior.
- Check SSR safety.
- Expose an explicit public API.
- Verify shared does not import modules/screens/routes.

Before adding a new module:

- Choose a feature name, not a route name.
- Define one or more UI slices.
- Keep slice public APIs explicit.
- Keep private components inside the slice.
- Use `hooks/` for reactive interaction state and `lib/` for pure helpers.

## Current Implementation Notes

The marketing home landing slice follows the preferred shape:

```txt
src/modules/marketing/ui/home-landing/
  index.ts
  page/index.svelte
  components/
    hero-section.svelte
    hero-search.svelte
    trust-strip.svelte
    care-flow-panel.svelte
    stats-strip.svelte
    care-modes.svelte
  hooks/
  lib/
  types.ts
```

This is the intended baseline for future feature slices: the public API stays small, the page root
stays readable, and private components remain local until proven shared.
