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

src/generated/api
  -> imported through $generated/api only inside src/shared/lib/api-client,
     then re-exported to modules via $shared
```

Generated API types are an allowed side-input: modules must not import
`$generated/api` directly (their allowed-import list covers generated i18n only),
so the generated wire types are re-exported through the shared client layer
(`src/shared/lib/api-client`) and consumed via `$shared`.

Allowed dependency rules:

- `src/routes` may import mirrored screens and app-wide route shell/provider code. A route layout may compose a
  feature slice into the shell's snippets (`+layout.svelte`: `<SiteFrame {popularSearches}>`, MINOR-1 of U-29: a
  module never imports another, so the route meets them), and a route's load files may call a module's `api/` or
  `lib/` for their load contract (`api/results` `loadResultsFirstPage`, `shell/lib/legal` `isLegalSlug`; U-32.1: the
  facts of `api/`, the page's view by `lib/` — `section-link` `buildStreamedHomeRows`, `article-card`
  `buildStreamedHomeArticles`, `results-scope` `readResultsScope`; U-32.9: a streamed promise never rejects).
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

Names follow the parent-context rule (a folder never repeats its parent) with ONE listed exception, the application's
parity (S-01.6, U-29.3): the slices `search-doctors/ui/search-*` (`search-criteria`, `search-results`,
`search-filters`, `search-doctor-card`) and the libs `search-doctors/lib/search-*` and `articles/lib/article-card`
keep the application's names, file for file. The units INSIDE a slice drop the slice's word, with the same names in
both repositories: the results' `list`, `map`, `pin-card`, `map-switch`, `header`, `map-pane`, hook `use-stage`; the
search's `option-list`, `panel`, `bar`, `typing-page`, hooks `use-state`, `use-lists`, `use-bar`, lib `fields`; the
filters' hook `use-state`, lib `options`.

A feature module is a product/domain capability, not a route. Examples:

- `marketing`
- `doctor-search`
- `clinic-directory`
- `booking`
- `auth`
- `patient-profile`

Prefer cohesive modules that can evolve independently. A module can have multiple UI slices if the
feature has multiple surfaces.

### Module Segments (U-29.1)

`src/modules/<feature>/`: feature logic and feature UI slices, in the fixed segments `api/ lib/ config/ ui/` plus a
type-only `types.ts` (the application's segments, owner decision U-29.1, 29/10):

- `api/`: backend facts only — endpoints, DTO→domain adapters, query keys and TanStack query options; no localized
  copy and no display formatting.
- `lib/`: pure feature logic and view-model/label builders; no Svelte runes, no transport; `api/` never imports
  `lib/`.
- `config/`: static feature data (option lists, static maps); nothing computed at runtime.
- `ui/<slice>/`: the feature's UI slices (below).

State that needs runes is a slice's `hooks/` (one slice) or `src/shared/state` (two or more, e.g.
`$shared/state/device-location`, the visit's position of «Κοντά μου»); never a `lib/`.
`tests/architecture/module-segments.test.ts` («U-29.1: …», «U-32.1: …») guards the segments, the rune-free `lib/`
and `config/`, the type-only `types.ts` and «`api/` never imports `lib/`», with no exception (U-32.1, the owner, 29/10):
the api answers FACTS, the application's model, and `lib/` writes them —

- the cards: `api/marketplace/card-adapter` `mapCardToFacts` (`SearchDoctorsCardFacts` in `api/marketplace/types`,
  with `readAt`, the server's «now» the card was read at: its day words are told against it, D-118; `badgeId`
  `patient-favorite` only for `items[].isPatientsChoice: true`, U-45.2);
  `lib/doctor-card` `buildDoctorCard` (the home's card, «Επιλογή ασθενών» by `formatBadgeLabel`) and
  `buildSearchResultCard` (the results card);
- a home row: `fetchHomeSection` / `loadHomeSections` answer its cards and `link` (`SearchDoctorsSection`,
  `SearchDoctorsSectionLink`); `lib/section-link` `buildSectionCriteria` (the «→» criteria), `buildHomeSection`,
  `buildStreamedHomeRows`;
- the results' address: `lib/results-scope` `readResultsScope` (the route's first page) and `readResultsPress` (a
  press's read ahead); `api/results` takes the scope;
- the home's articles: `articles/api` `loadHomeArticles` answers the feed's articles; `lib/article-card`
  `buildHomeArticlesResult` (`buildStreamedHomeArticles` for the route's stream, U-32.9: never rejecting).

Where the server streams a view (the «Όλοι» rows, the articles) the route's load builds it with the lib, as the
words were built on the server before; a read of the browser builds it in its query (`queryFn` of the home's rows) or
its observer (`select` of the results' read, whose cache holds facts: the press's prefetch and the server's page
share its key).

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

A slice may export a private component as part of its public API when another slice or a screen composes it
(`search-criteria`'s `CriteriaPanel` and `CriteriaSearchBar`, `search-doctor-card`'s `FeeSignIn`,
`site-frame`'s `LegalLine`, NIT-4 of U-29): once exported it is public, and its consumers import it from the slice's
`index.ts`. Such a component may read the page itself, as a slice page does (`LegalLine` reads `page.url`).

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
  icons/
```

Definitions:

- `primitives/`: in-house shadcn-styled (`new-york`) controls built on the
  headless layer in `src/shared/lib/headless` (no external UI library).
  Domain-free, low-level, accessible controls. This is the atomic base of the system.
- `molecules/`: composed controls with a focused app-wide job, such as language switcher or theme
  toggle.
- `organisms/`: larger reusable app-wide sections, such as the app shell. The frame organisms
  (`app-shell`, `app-header`, `bottom-nav`, `site-footer`, `site-navbar`, `cookie-consent`) are
  generic: words, hrefs, tabs and columns come from the caller. The eDoctor frame that fills them
  (logo, tabs, footer columns, language and theme controls) is the `src/modules/shell` module
  (`ui/site-frame`, `ui/placeholder-page`, `ui/consent-prompt`; `api/consent`, `config/{social,consent-fallback-registry,legal}`,
  `lib/{consent,legal}`), rendered by `src/routes/+layout.svelte` (U-03.8).
- `templates/`: reusable layout structures. Keep them generic and prop-driven.
- `icons/` (since wave 0, U-03.3): the application's glyphs — `ionicon/` (Ionicons as local SVG
  paths, the application's names, MIT note in `LICENSE.md`) and the brand marks (`brand-apple`,
  `brand-google`, the laurel halves).

Optional, create-on-demand buckets (not currently present — add only when an existing bucket is
insufficient, do not pre-create empty layers):

- `atoms/`: project-specific domain-free pieces smaller than a molecule, when `primitives` are not
  enough.

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

### Built pieces stay (U-30.2)

φτιαγμένα κομμάτια κρατιούνται ως βιβλιοθήκη (U-30.2): the one exception to the contract's «do not leave … unused
helpers» (`project-architecture.md` «Documentation And Cleanup»). A component that was built and has no consumer yet
(shared or module: e.g. `discovery-home`'s `skeletons.svelte`, `modules/doctors/ui/*`), what feeds it (builders,
hooks, types) and the i18n keys without a reader stay, as the kit is a library; a shared component keeps its story and
its test. Dead code INSIDE a file in use, a stale doc and a duplicated constant are still removed.

## Shared

`src/shared` owns reusable contracts that are stable enough to be reused across screens and modules.

```txt
src/shared/
  config/       app env, variants, public config parsing
  design/       design assets, tokens, design-system helpers
  lib/          pure framework-agnostic helpers, and the runes-based building blocks in `.svelte.ts`
                (`form`, `headless`, `debounce`)
  preferences/ theme, language, and preference resolution
  providers/   root and subtree providers
  query/        TanStack Svelte Query setup
  state/        app-wide local state: a tab's module state written only in the browser (`device-location`),
                or a context scoped to the page tree (`search-dock`), never a server singleton
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
- `/el` and `/el/**` redirect to the Greek canonical URL without the locale prefix, always on the site's own origin:
  `hooks.server.ts` builds the target with `$shared/preferences/i18n` `canonicalGreekPath` (one leading `/`, the
  search kept), so `/el//evil.example` is `/evil.example`, never `//evil.example` (D-W3-38, `src/hooks.server.test.ts`).
- Every request to the API says the page's language (D-W3-39, `shared.md` `requestLanguageHeaders`).
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

Use the application's glyphs from the icons bucket (U-03.3):

```svelte
<Ionicon name="search" class="icon-md" />
```

Older screens still use Icones virtual imports (`~icons/lucide/*`) until their units are rebuilt.
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

Architecture tests (`tests/architecture`) enforce:

- Every non-layout page route has its mirrored screen folder with `index.ts`, `page/index.svelte`, `hooks/index.ts`,
  `hooks/use-screen.svelte.ts` and `types.ts`, and renders it through `$screens/<path>`
  (`route-mirror.test.ts`, «U-29.3: …»).
- The import boundaries (`import-boundaries.test.ts`, «U-29.3: …»): shared imports no module, screen or route; no
  module → module, no module → screen or route, no screen → screen or route; a slice's and a screen's private files
  only from inside them; a relative import never leaves its unit (the slice, the segment folder, the screen); no
  `$lib`, no `export *`, `$generated/api` only in `src/shared/lib/api-client`; the shared UI's atomic layers never
  import upward (primitives < molecules < organisms < templates, stories and harnesses aside).
- The modules' segments (`module-segments.test.ts`, «U-29.1: …» and «U-29.3: …»): a module root holds only
  `api/ lib/ config/ ui/` and `types.ts`; `lib/` and `config/` hold no runes and no Svelte file; `config/` computes
  nothing and imports only types; every `types.ts` of `src/` is type-only; `api/` never imports `lib/` (no exception
  since U-32.1, a type import included); no rune state is typed with an `api/` answer and a runes file calls the
  transport only inside a TanStack `queryFn` (BLOCKER-1 of the audit).
- The doctor card and its skeletons share ONE photo map (`card-media.test.ts`, D13, «U-29 (MINOR-5): …»);
  `maplibre-gl` reaches no first bundle (`map-bundle.test.ts`, «U-24.4: …»).
- shadcn-svelte primitives live under `src/shared/ui/primitives`.
- i18n keys have Greek and English parity.
- Icons of the kit are the application's Ionicons from `src/shared/ui/icons` (no icon package).
- The shared UI is generic (`tests/architecture/shared-ui-generic.test.ts`, «U-02.1: …»): no
  import from modules/screens/routes, no product word, no fixed text, keys only `common_*` or the
  component's own name, colours and shadows only from tokens, no route/locale reading.
- The web palette is the application's (`tests/architecture/color-parity.test.ts`, «U-03.4: …»).

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

Wave 1.0 (D1) adds, in the same shape:

- `src/modules/shell/ui/site-frame` — the frame (apple.com's bar from 744, the capsule below it, the ☰ menu, the
  «Ρυθμίσεις» dialog, the footer) and `ui/consent-prompt` (the consent card and its tools dialog; `api/consent`
  reads `GET /consent/registry`, `config/consent-fallback-registry.ts` when it cannot, `config/social.ts` the
  networks' ONE list, U-26.2).
- `src/modules/search-doctors/ui/popular-searches` — the footer's popular searches. A module never imports another:
  the route layout composes it into the frame as a snippet (`+layout.svelte`: `<SiteFrame {popularSearches}>`).
- `src/modules/articles` — the home's last row (`api/feed.ts`, `lib/article-card`, `ui/home-row`), composed with the
  doctors' rows by `src/screens/home`.
- The addresses of wave 1.5 (built since: screen 5 and screens 6–10, below): `/articles`, `/articles/[slug]`,
  `/help`, `/doctors/[slug]`, `/legal`, `/legal/[slug]` (only the application's three slugs; any other is a 404), each
  screen mirrored under its route as the application's (`src/screens/articles/[slug]`, `src/screens/doctors/[slug]`,
  `src/screens/legal`, `src/screens/legal/[slug]`).
- The guest's account menu is ONE list (`site-frame/lib/frame.ts` `buildAccountEntries`) drawn by the ☰ menu from
  744 and by the capsule's «Προφίλ» sheet below it (U-19.1).

Wave 1.0 (D2) adds the search «Τι / Πού / Πότε», the application's logic file for file (S-01.6):

- `src/modules/search-doctors/lib/*` — the pure rules: `search-criteria` (types, static options, the URL both ways
  with the application's names), `criteria-suggestions`, `criteria-locations`, `effective-criteria`,
  `search-query` (the scope a search sends; an empty «Πότε» asks `next3Days`), `availability-dates` (U-22's dates),
  `criteria-messages` (the catalog keys the libs carry); `config/criteria-icons.ts` the ONE glyph config of the rows
  (its static maps; the lookups `specialtyIcon`, `serviceIcon`, `whatIcon` are `lib/criteria-icons`, U-29.1; U-122:
  an English qualifier, `specialtyIconQualifiers`, is one word with the next, as Greek's «Παιδο…», so each id wears one
  glyph in both languages).
- `src/modules/search-doctors/api/marketplace/*` — the reads: `suggestions.ts` (TanStack query options of
  «Τι» / «Πού» / the popular specialties / the ready areas), the adapters, the application's query keys.
- `src/modules/search-doctors/ui/search-criteria` — the slice: `page/index.svelte` the phone's window of cards
  (default export), `CriteriaPanel` the bar's panel, the hooks `CriteriaState`, `CriteriaLists`, `useCriteriaBar`
  (public API in `index.ts`); `discovery-home` composes them (the pill opens the window, the big bar and its drop
  from the top bar's pill open the panel).
- Shared: `$shared/lib/debounce`, `$shared/lib/location` (the device's position, 10″), `$shared/lib/query-state`,
  `StepCard`, and the new props of `OptionRow`, `OptionRowSkeleton`, `SuggestionGroupHeader`, `HighlightText`,
  `ActionBar`, `SearchBar` (see `styling-guidelines.md`).

Wave 1.0 (D3) adds the results `/doctors` (screen 4: list, map, filters), the application's logic file for file:

- `src/routes/doctors/+page.server.ts` — the first page of five on the server (`api/results/load.ts`
  `loadResultsFirstPage`); a client navigation (`isDataRequest`) and «Κοντά μου» ask nothing there.
  `src/screens/doctors` composes `ui/search-results` with the frame's `LegalLine` (no footer on the results,
  `site-frame/lib/frame.ts` `showsSiteFooter`).
- `src/modules/search-doctors/lib/*` — `search-filters` (the application's names, `readSearchDoctorsFilters` the
  ONE reader of the address's filters), `results-count`, `results-empty`, `filters-label`; `search-query` carries the
  filters in the scope; `search-criteria` `searchResultsHref` writes them after the criteria.
- `src/modules/search-doctors/api/marketplace/*` — `build-search-query`, `search-source`, `facets-source`,
  `facets-adapter`, `search-results.ts` (the infinite read, the live count, the facets as query options),
  `card-adapter` (the card's facts, its map point among them; since U-32.1 the list card and its pin price are
  `lib/doctor-card` `buildSearchResultCard`'s, from the SAME facts).
- `src/modules/search-doctors/ui/search-results` (the page, `SearchResultsState`, the map and its pins),
  `ui/search-filters` (the window, `FiltersState`, `lib/options`), `ui/search-doctor-card` (the ONE card,
  `variant` `rail | list`, moved out of `discovery-home`), and `search-criteria` `CriteriaSearchBar` (the big bar,
  moved out of `discovery-home`; `inline={false}` on the results: it exists only while dropped from the top bar).
- 🔴 The results address is read ONLY through `readSearchDoctorsCriteria` and `readSearchDoctorsFilters`
  (`tests/architecture/results-url.test.ts`: nothing outside their libs calls `resolveSearchDoctorsCriteria` or
  `resolveSearchDoctorsFilters`, and no file of the search's module, the results' screen or route reads a query
  parameter itself — the old link's detector only asks `.has`).
- The capsule marks «Εξερευνήστε» on the search's pages, the home and the results (`site-frame/lib/frame.ts`
  `isExploreFlow`, U-25.2).
- Shared: `$shared/config/map` (the ONE map look), `MapView`, `MapSheet`, `MapPricePin`, `MapPinCard`,
  `FilterButton`, and the new props of `ActionBar`, `Chip`, `SelectableCard`, `FullscreenModalTemplate`
  (`styling-guidelines.md`).
- Round f1 (U-27): the `MapSheet` drag and `mapSheetRestFor`, `MapView` `zoomControls`, the `MapPinCard` link under
  its lines (`styling-guidelines.md`); `ui/search-doctor-card` exports `FeeSignIn` (U-27.4: the hidden
  fee's «🔒 Συνδεθείτε για κόστος», its own action beside the card's one link — f1b: INLINE in its line, a `span` with
  the button's role and keys, as a `<button>` is always an atomic box; no change of layout, its target grown 4 on
  every side by a pseudo-element, the line's `-m-1 p-1` giving it room, a listed exception of
  `tests/architecture/touch-targets.test.ts`), which the results' pin card uses through the slice's public API; the
  card and the pin card take `onSignIn` (the pages' `signIn`: the sign-in page, pushed, the page beneath it in the
  history).
- Round f2 (U-28, web only): the results' map on 1/3 from 1128 and its three states (`desktopMap` of the page,
  through `ResultsMap` `expandControl` / `hideControl` onto `MapView`), `SelectableCards size="sm"` in the filters,
  and the pressable rule and hovers of the kit (`styling-guidelines.md` «Pressable»).
- Round f3 (U-29 ⇒ U-31, the architecture audit closed): the modules' segments (U-29.1, above); the home's «Όλοι» rows
  are TanStack queries (`discovery-home/hooks/use-streamed-sections.svelte.ts`, U-29.3); the visit's position of
  «Κοντά μου» is `$shared/state/device-location` and `lib/device-location` the pure `criteriaWithDeviceLocation`; the
  legal slugs' ONE list is `shell/config/legal.ts` (`lib/legal.ts`: `isLegalSlug`, `legalPath`); the results' page
  is a skeleton of its units (`components/{header,list,map-pane,map,pin-card,map-switch,map-toggle,card-skeleton}`,
  `hooks/{use-state,use-stage}`, `types.ts`) and the home's (`components/rows`, `types.ts`); both wire the search
  with `search-criteria`'s `useCriteriaWiring` and sign in with `search-doctor-card`'s `useSignIn`, and draw their
  states' glyph with the shared `StateGlyph`; the card's and its skeletons' photo is `searchDoctorCardMedia` (D13);
  the row controls' zone classes are `$shared/design/scroll-controls` (Π2); `modules/doctors/ui/doctor-card` is
  `modules/doctors/ui/card` (Π6).
- Round f4 (U-32, the owner's «Ναι σε όλα», 29/10): the api answers facts and the libs write them (U-32.1, «Module
  Segments» above); the home's header is its own slice, `src/modules/search-doctors/ui/discovery-header` (U-32.6, the
  application's name and role: the phone's search pill and the categories' rail, `components/category-rail`), composed
  by `discovery-home`'s page as `search-criteria` is (its state — the chosen category, the search's window — is the
  home's; the big bar from 744 stays `search-criteria`'s `CriteriaSearchBar`); the old card's heart takes the
  palette's `bg-overlay` and `accent` (U-32.2, `modules/doctors/ui/card`); the 744 map switch stands
  `bottom-map-switch-bottom` (U-32.3, `design-tokens.md`). Round f4c (U-33.3): the card's «🔒 Συνδεθείτε για κόστος»
  is `search-doctor-card/components/fee-sign-in.svelte`, exported as `FeeSignIn` — the application's `fee-sign-in` /
  `FeeSignIn` (formerly `fee-action`, `SearchDoctorFeeAction`; its `data-slot` `doctor-card-fee-action` unchanged).

Wave 1.5 · screen 5 adds the doctor's profile `/doctors/[slug]` and its windows, the application's logic file for file
(S-01.6) in the module of its name, `src/modules/doctor` (the old `src/modules/doctors` stays as a library, U-30.2):

- `src/routes/doctors/[slug]/+page.server.ts` — the profile on the server (`api/profile/load.ts`
  `loadDoctorProfile`: ONE read through SvelteKit's `fetch`, never throws), so the page is whole without JavaScript
  and its `<head>` speaks for it (U-28.4). Its language is the address's PATH (`getPathnameLocale`,
  `shared/preferences/i18n/page-locale.ts`): the load depends on the path, so a change of language reads again, and
  never reads the query (a window's `?office=` asks nothing). A profile nobody may see is a 404, a failed read a 503:
  `routes/doctors/[slug]/+error.svelte` renders the screen's `page/error.svelte` (`DoctorProfileErrorScreen`, the
  slice's `DoctorDetailError`) — its own `<title>`, `robots=noindex`, no canonical; «Δοκιμάστε ξανά» is
  `invalidateAll`. `src/routes/doctors/[slug]/details/[section]/` is a window's own address (an unknown section is a
  404, the same error page); both screens (`src/screens/doctors/[slug]`, `…/details/[section]`) compose the SAME slice
  (a test holds the two hooks equal): the addresses on the site's public origin (`$shared/config/site`
  `siteUrl`, `PUBLIC_SITE_ORIGIN`: canonical, `og:url`, `hreflang`, the shared link — never the request's host, never
  a relative `resolve()`), «Δείτε παρόμοιους γιατρούς» as the search module's results (the application's names:
  `api/marketplace` `resolveSimilarDoctorsArea` — the active office's city through `resolveLocationSlug`, asked when
  cases 1 and 2 show — and `lib/similar-doctors` `buildSimilarDoctorsCriteria`: the specialty, and the area ONLY as a
  `location` by its slug; without one no «Πού» at all, U-37.2) and the cards' `useSignIn`.
- `src/modules/doctor/api/{profile,reviews,availability,office}` — the facts (the application's mappers; the
  services' `isSpecialized`, U-36.2; `doctor.responseMetrics` ⇒ `DoctorResponseMetricsFacts` by `buildResponseMetrics`,
  the wire's `WITHIN_HOUR`… as the design's `within-hour`…, each `null` left out, U-43; `doctor.isPatientsChoice` ⇒
  `isPatientsChoice`, only a `true`, U-45.2 — the laurels of the identity and of the reviews only then; every score
  — average, aspects' averages, a review's overall and aspects — on the 5 stars, U-49: `$shared/lib/rating-stars`
  `toStarScore` keeps 0…5 and drops anything else, a review off the scale included; the cards' average too) and the browser's reads as TanStack query options: every office's 28 days at
  once (U-37.1, D-103), a non-main office's facts once (U-39.1), the reviews while their window is open.
- `src/modules/doctor/lib/detail/*` — the view model, the application's units and names (S-01.6): `build-content`
  (`buildSpecializations`, …), `booking` (`buildDoctorBookingContent`, `buildDoctorSimilarSearch`; U-37 / U-38.1 /
  U-40.3), `availability` (`resolveDoctorAvailabilityServiceId`, the section
  and the window), `office` (`resolveDoctorActiveOfficeId`, `buildDoctorOfficeView`, `buildOfficeTabs`,
  `buildDoctorAvailabilityElsewhere`; U-39), `metrics` (`buildDoctorResponseRows`: `AUTO` «Άμεση επιβεβαίωση»,
  `MANUAL` the 6-month metrics, unknown none; `buildDoctorCompletedVisits`; U-36.1 / U-43), `share`
  (`buildDoctorShareContent`), `sections` the windows' addresses and hints (the application's `focus`: a review's id,
  in `photos` a photo's place from 0, `readDoctorPhotoFocus`), `seo` the title, description, canonical, `hreflang`,
  Open Graph and JSON-LD `Physician`; `detail.sample.ts` is the tests' doctor, never imported by production code.
- `src/modules/doctor/ui/detail` — the slice: `page/index.svelte` (the profile), `page/error.svelte` (the route's
  error page), `hooks/use-state.svelte.ts` `DoctorDetailState` (the reads, the ONE active office, the service, the
  confirmed time, the open window), `components/*` (one per section, the booking card from 744, the phone's bar, the
  section bar, the windows, the share window, the head).
- `src/modules/doctor/ui/availability-picker` (wave 3, moved with `mv` out of `ui/detail`, D-W3-30) — the days and
  hours of an office (`page/index.svelte`, `OfficeTabs`, `AvailabilityElsewhere`, `useDoctorOfficeSlots`), ONE slice
  for the profile's section and window and the booking's «Διαθεσιμότητα» (`screens/doctors/[slug]/booking`): the
  profile's slice and the booking's screen compose it, a module never imports another. Its hover stays the
  profile's (D-W3-30, `styling-guidelines.md` «Pressable»).
- 🔴 The windows are shallow routing (`pushState` / `replaceState`, `App.PageState.doctorDetails`): a link to
  `details/<section>` opens in place with its own history entry (`inPlace`), «×», Escape and «back» close it; the
  same address loaded directly draws the profile with the window open (canonical: the profile).
- The frame hides the phone's capsule on a profile and its windows (`site-frame/lib/frame.ts` `showsBottomNav`): the
  page's own booking bar takes the bottom, as in the application; there the footer keeps the bar's measured room
  (`SiteFooter` `reservePageBar`, `StickyActionBar` `room="page"`, `pb-page-bar`) instead of the capsule's.
- Shared: `$shared/lib/format-day-time` (the ONE day-and-time phrase, moved out of `search-doctors/lib/doctor-card`,
  which re-exports `formatInstantDayTime`; `msUntilNextPlatformDay` for the midnight redraw, S-34.1), the new
  `MediaGallery` and `RevealingPhoto` (the application's names and props), and the new props of `TwoColumnDetail`,
  `StickyActionBar` and `MapView` (`styling-guidelines.md`).
- Wave 2 · screens 14, 15, 16, 24 (U-70 … U-76): `details/services` and `details/specializations` are the two pages of
  one window (`window-services.svelte`; «Τομείς εξειδίκευσης ›» is its own history step, `fromServices`), each row's
  glyph from the backend's `kind` (never `online`, U-89.1). The biography is a page of its own,
  `/doctors/[slug]/about` (`routes/…/about`, `screens/…/about`, the slice's `page/about.svelte`, `lib/detail/about`):
  `details/description` answers `308` to it. Below 744 it is one element shaped as a sheet by CSS (no second tree, no
  second read). The profile's last section is «Τι πρέπει να γνωρίζετε» (`know-section.svelte`, `lib/detail/know`), its
  three windows `details/know?focus=cancel|booking|before`, on the active office's `bookingPolicy`; the office pills
  only when the limits differ.

Wave 1.5 · screens 6–10 (U-57 … U-62, common v2) add the text pages and the site's status page; from 744 the approved
prototypes 06–10, below 744 the application's design (U-58.1) — but the articles' list itself (its featured and its
cards) the prototype 06 v3's at every width (U-63) — the zones by CSS only (U-03.1). One declared exception,
in a module and for behaviour only, never for drawing: the help centre's field reads `matchMedia(min-width: 744)` while
it is typed in, to filter as typed below 744 (the application's) and suggest from 744 — the server's page and every
look stay CSS (`help/ui/center/page/index.svelte`, NIT-r2-2):

- Articles (`src/modules/articles`): `api/list.ts` (the list as ONE infinite query of 12 a page, `?type ?q ?service`
  validated at the route, the envelope's `meta` through `httpGetWithMeta`, the suggestions' query asked after 250 ms
  of quiet), `api/article.ts` `loadArticle` (the article and «Περισσότερα άρθρα» at once, never throws), `lib/article-list`
  and `lib/article` (the views, the SEO and the JSON-LD `Article`), `ui/list` (the list page and its hook),
  `ui/detail` (the article on `DocumentPage`), `ui/article-card` (`rail` the home's, `grid` «Περισσότερα», `list` the
  list's — the prototype 06 v3's card at every width, U-63; `framed` the application's framed card below 744, kept
  unused, U-30.2). Routes `routes/articles/+page.server.ts` and
  `routes/articles/[slug]/+page.server.ts` (a 404 the site's 404, a failed read its 503).
- Legal texts (`src/modules/legal`): `api/page` `loadContentPage` (ONE CMS read, never throws; also the FAQ's),
  `lib/document` (the edition notice, the language note, the meta), `ui/document` (a text on `DocumentPage`, `phone="app"`),
  `ui/directory` (the «Νομικά» page at `/legal`, U-59.3 Ε2).
- Help centre (`src/modules/help`): `config/faq.ts`, `types.ts` (`HelpFaqSource`), `lib/faq` (`buildFaq`: an H2 a topic,
  an H3 a question, an H4 part of the answer — the application's levels; popular by `attrs.popularRank`; a page
  without that structure is `text`, drawn as a legal text, an empty one says so), `ui/center` (ONE page: search with
  suggestions from 744, filtering as typed below 744, topic chips, popular, accordions, anchors). Route
  `routes/help/+page.server.ts`.
- Account deletion (`src/modules/account/ui/deletion`, `lib/deletion`): the legal texts' template (U-62.1).
- Messages (`src/modules/messages`, wave 2, screens 18 + 21, U-84): `api/{conversations,preferences}`, `lib/{time,thread,
people,paths,refusals,client-id}` (the copy's hand-over is `$shared/lib/save-file` since wave 4, its name `lib/time`'s
  `conversationCopyName`), `config/limits.ts`; `ui/inbox` (ONE page for `/messages`, `/messages/<id>` and
  `/messages/archive`, the same for a patient and a doctor; a route's `load` refuses what is no id), `ui/contact` (the button
  and the #18, composed by the doctor's screens through a snippet of `DoctorDetail` and `DoctorAbout`), `ui/unread-host` (the
  badge's one read, in the root layout).
- Booking (`src/modules/appointments`, wave 3, screens 30 + 31, the application's module name): `api/{patient,readiness,
appointment,relatives,phone,keys}` (the generated contract's views and bodies, `ApiRequestBody<operationId>`, mapped to
  facts; every read `personalQueryMeta`), `lib/booking/*` (the application's rules unit for unit: `url` the closed hints,
  `summary`, `blockers`, `submission`, `failure`, `details`, `success` …; «Νέος συγγενής»'s form is `lib/relatives/form`
  since wave 4.0), `config/`, `ui/booking-draft` (the
  `BookingDraftHost` of the root layout), `ui/booking` (ONE slice for the whole flow: the 30, its seven «Αλλαγή» screens
  and the 31). ONE route `routes/doctors/[slug]/booking/[...step]` with a closed list of steps (D-W3-28: an unknown one is
  a 404, the site's own through `booking/+error.svelte`; `+layout.server.ts` reads the public profile once for every
  step, its failures the profile's error page; the 30 with no hour in its address goes to «Διαθεσιμότητα» first, the
  31 with no `?appointment=` is a 404) ⇒ `screens/doctors/[slug]/booking/[...step]`, which composes the doctor
  module's `ui/availability-picker` and profile reads (a module never imports another).
- Doctor's sign-up (`src/modules/doctor-onboarding`, wave 3, screens 33–42, the application's module name):
  `api/{progress,address-search,professions,town,terms,keys}` (the generated contract's views and bodies; the Places
  proxy's token in a hook's closure, D-W3-02), `lib/{steps,validation,values,payload,content,office,professions}`,
  `config/`, `types.ts` (the draft's fields; the enums are the contract's, named in `api/progress`), `ui/draft-host` (the
  `OnboardingDraftHost` of the root layout), `ui/steps` (ONE slice: a page per screen, the controller
  `hooks/use-step.svelte.ts`, the address search's hook). ONE route `routes/doctor/onboarding/[...step]` with a closed list
  of 21 screens (D-W3-28) ⇒ `screens/doctor/onboarding/[...step]` (the language, the addresses, the help, the home, the
  sign-in's reading of a refused code).
- The patient's pages (wave 4.0, screens 50–55, D-W4-20 / D-W4-51): three routes, each a closed list read at the
  boundary (U-65.6) and nothing read on the server (U-80.1 Ε6) — `routes/appointments/[...path]` (`''` the list,
  `?tab=history` its «Ιστορικό», `<id>` an appointment, `<id>/{time,for-whom,relative,note,cancel}` what it opens;
  `modules/appointments/lib/paths` `readAppointmentsAddress`), `routes/ratings/[invitationId]` (the email's link,
  `readRatingInvitationId`) and `routes/profile/[...path]` in the place of `/profile` (`''` the «Προφίλ» tab,
  `relatives`, `relatives/new`, `relatives/<id>`; `modules/profile/lib/paths` `readProfileAddress`; the 4.5 comes under
  it too) ⇒ `screens/appointments/[...path]`, `screens/ratings/[invitationId]`, `screens/profile/[...path]`. The frame
  (`site-frame/lib/frame.ts`): the capsule's fifth tab «Ραντεβού», «Τα ραντεβού μου» and «Οι συγγενείς μου» in a
  member's menu, the capsule kept only on the two lists, no footer on any of them (D-W4-55) but on an error page.
  The «Προφίλ» page gives a member «Οι συγγενείς μου» first in «account» (D-W4-56, the application's place); «Ραντεβού
  γιατρού» and «Ταμείο» stay hidden (U-82.2).
- «Ρυθμίσεις λογαριασμού» (wave 4.5, screens 57 + 61, D-W45-01 … D-W45-09) under the same `routes/profile/[...path]`:
  `account-settings` the shell and `account-settings/language` «Γλώσσα και θέμα», read by `readProfileAddress` against
  the module's closed register `modules/profile/config/settings` (`settingsSections`: the five sections in their fixed
  order — personal, security, privacy, notifications, language — each with its glyph, its address of D-W45-01, whether
  only a member reads it, and whether its screen is BUILT). 🔴 D-W45-02: a section has an address and a row only once
  built (`built: true` + its page in the shell); until then it is a 404 and no row. `lib/settings`
  `buildSettingsSections(options, { member })` is what the shell shows (🔴 D-W45-05: a guest «Γλώσσα και θέμα» alone);
  `lib/paths` `accountSettingsPath`, `settingsSectionPath(section)`. `ui/settings` is the shell — the `SplitView` with
  `widths="menu"` and `centred` (🔴 U-167): from 950 the menu and the section in the middle of the right column, the
  shell's own address showing its first section in place; below 950 the list OR one section on its own page, the rows
  links to each section's address; it waits for the session with a skeleton (U-80.1 Ε6). `ui/language` is screen 61 —
  two shared `EditableRow`s whose choices hold at their press; the theme is `theme.set('system' | 'light' | 'dark')`;
  the language goes to the same page in the other language and, for a signed-in person, first writes the account's
  `locale` (`api/user`: `accountLocaleQuery` keeps of `GET /user/me` the `locale` ALONE, `updateAccountLocale` is
  `PUT /user/me` `{ locale }`; 🔴 D-W45-06: only when it differs, a failure never stops the change). The frame
  (`SETTINGS_PAGES`, D-W45-07): no footer and no capsule on the shell or under it, the «Προφίλ» tab current. On the
  «Προφίλ» page a member's «Ρυθμίσεις λογαριασμού» is a link to the shell; a guest's still opens the frame's small
  window (D-W45-05).
- «Ειδοποιήσεις», the settings (wave 4.5, screen 60, card w45-w3; D-W45-22 … D-W45-24) at
  `account-settings/notifications`, a section only a member reads. It is the `notifications` module's
  (`api/preferences`, `config/groups`, `lib/preferences`, `ui/settings`), and a module never imports another: the
  shell (`profile/ui/settings`) takes the page of a section it does not own from the SCREEN, as a snippet
  (`sectionContent: { notifications }`, composed in `screens/profile/[...path]`), and gives it the section's place, its
  title and its «←»; «Γλώσσα και θέμα» stays the profile module's own page. A section that becomes `built` in the
  register has its page handed in the same change (the screen's spec guards it: no built section draws empty).
  🔴 A guest whose address names a member's section is asked to sign in over the shell, once and only when the page
  arrived as a guest's (`session.requireSignIn()`, the rating page's way): under the sign-in the guest's own shell,
  signed in the section the address names. `config/groups`: the page's three groups and the kinds each lists, a fixed
  table (🔴 D-W45-22: the PATIENT's side alone, also on a doctor's account); `lib/preferences`
  `buildNotificationGroups(facts, options)`: the rows — title, what is on («Ενεργό: …», «Πάντα: …» when every channel
  of the kind is the server's to keep on, «Ανενεργό»; `SET_BY_DOCTOR` is never counted as on), the window's line and
  cells — a kind the server does not send has no row, one outside the table joins the last group, one the page cannot
  name is left out. `ui/settings`: «Αλλαγή» (only where the kind has a switch) opens the shared `ActionDialog` at every
  width, one row a channel — a `Switch`, or «Πάντα» / «Ορίζει ο γιατρός». 🔴 D-W45-24: every press is ONE write of ONE
  cell (`state-management.md`). The card «Ενεργοποίηση ειδοποιήσεων» is the application's alone (D-W45-25).
  The centre (`GET` / `PUT /notification/preferences/me`) is read by two modules — this page and the inbox's
  «Ρυθμίσεις μηνυμάτων» — through ONE reader and writer, `$shared/lib/notification-preferences` (`shared.md`).
- «Προφίλ», the page (wave 4.5, screen 56, cards w45-w2; U-164, D-W45-17 … D-W45-21) at `/profile`, the
  `profile/ui/tab` slice: below 744 the application's tab, from 744 the same one column in the middle for a direct
  link. A MEMBER reads the title, the name card (`components/name-card`, a plain box — 🔴 U-164 Ε2 Β: never pressed),
  «Είστε γιατρός;» as a card (`components/doctor-card`, a link to the doctor's sign-up the screen resolves, D-W45-20)
  and the rows of `lib/menu` `buildProfileMenu(options, { member })` — Ρυθμίσεις λογαριασμού · Οι συγγενείς μου ·
  Βρείτε βοήθεια · Απόρρητο · — · Νομικά · Αποσύνδεση, the last a button with no «›» that the page itself carries out
  (`session.signOut`, one press). A GUEST reads the title, the words, «Συνδεθείτε ή εγγραφείτε», the same card and
  the rows without the two a session brings. Until the session is known the page waits (`lib/viewer`
  `profileViewerOf`: `waiting | guest | member`, the one reading every page of the «Προφίλ» shares). The name card's
  words come from `lib/identity` `buildProfileIdentity(session.member)` (D-W45-18): the initial and «Όνομα Επώνυμο»
  over the sign-in address — else the mobile — 🔴 U-168 as the SERVER hides it (`GET /patient/me`
  `loginEmailMasked` / `loginPhoneMasked`; the `auth` module's read keeps a value only when it is a mask, and nothing
  on the web hides an address itself). The title row takes a `headerAction` snippet (the bell of screen 63,
  D-W45-17). 🔴 U-164.1: no row of a doctor's — «Λειτουργία γιατρού» is the application's alone. The menu at the top
  right from 744 (`shell/ui/site-frame/lib/frame` `buildAccountEntries`, D-W45-21): a member's «Ρυθμίσεις» is
  «Ρυθμίσεις λογαριασμού», a link to the shell; a guest's stays the small window.
- «Απόρρητο» (wave 4.5, screen 62, card w45-w4; D-W45-26 … D-W45-31) at the application's addresses, all under
  `routes/profile/[...path]`: `privacy` is a section of the shell (built, a member's row); the pages it opens are the
  register's closed list `settingsPages` (`profile/config/settings`) — `third-party-tools`,
  `account-settings/deletion`, `account-settings/deletion/code` — read by `readProfileAddress` as
  `{ view: 'settings', section: 'privacy', page }`. The shell draws a page in the section's place with its own title
  and a «←» at every width (`pageContent`, handed in by the screen as `sectionContent` is). 🔴 D-W45-29: a GUEST reads
  «Απόρρητο» and the tools' page too — the register's `guestPage` — as ONE column of its own (`SplitView` `solo`,
  «←» to the «Προφίλ»), never a row of the guest's shell and never a sign-in. Three modules, composed by the screen:
  `profile/ui/privacy` (the group «Απόρρητο δεδομένων», the card-rows, the box; «Διαγραφή λογαριασμού» only for a
  member; the Privacy policy at its start, D-W45-27: the legal pages anchor only headings of the CMS text, and the
  rights' section is a plain line), `shell/ui/consent-prompt` (`ConsentTools`: the window «Διαχείριση προτιμήσεων»
  as a page, on the SAME body `components/tool-sections`, catalogue and decision — `hooks/use-consent-tools`;
  `useConsentSummary` is the row's line, 🔴 D-W45-28 `lib/consent` `consentSummaryLine`) and
  `account/ui/deletion-flow` (🔴 D-W45-30, U-173 Ε1 Α: the application's two steps on the server's existing
  `auth/account-deletion/me`, `/start`, `/confirm` — `api/deletion`, `lib/deletion-flow`, `useAccountDeletion`; the
  public page `account/ui/deletion` does not change). The screen keeps the flow's one state, sends a deletion address
  without a session to the «Προφίλ» and the code step with no code out back to step 1 (both `replaceState`), and
  draws the end (`DeletionDone`) in the shell's place once the browser's session has closed
  (`session.accountDeleted()`). 🔴 U-65.6: the code is digits only, lives in the page's memory alone and travels only
  in the body of the confirm — never an address, a storage or a log. The frame (`SETTINGS_PAGES`) covers
  `/profile/privacy` and `/profile/third-party-tools` too.
- «Προσωπικά στοιχεία» (wave 4.5, screen 58, card w45-w5; U-168, D-W45-10, D-W45-14 … D-W45-16) at
  `/profile/account-settings/personal`: the register's FIRST section (`built`, a member's alone). The slice
  `profile/ui/personal` — the page that composes, one form per row under `components/` (`name-form`,
  `birth-date-form`, `gender-form`, `email-form`, `phone-form`, `identifier-form` for the ΑΜΚΑ and the ΑΦΜ,
  `code-step`), `hooks/use-personal` (who is read, which ONE row is open, each row's write) and
  `hooks/use-code-challenge` (the two steps of the email's and the mobile's challenge) — draws seven `EditableRow`s;
  a row's form is mounted while it is open and goes with it, so «Ακύρωση» drops what was typed. The view models are
  `profile/lib/personal` (`buildPersonalRows`, the words of each refusal), the constants `profile/config/personal`.
  🔴 Each call lives in the module that OWNS it and the screen composes them (a module imports no other):
  `profile/api/user` (`accountPersonQuery`: the gender and the day of birth of `GET /user/me`; `updateAccountGender`;
  `updateAccountBirthDate` for an account with no patient profile), `appointments/api/patient`
  (`updateBookingPatientProfile`, `updatePatientIdentifiers` = `PUT /patient/me`), `appointments/api/phone` (the
  booking's three calls, with `readPhoneChangeFailure`) and `auth/api/login-email` (`start`, `resend`, `verify`,
  `readLoginEmailChangeFailure`, `keepLoginEmailMask`). They reach the page as its PORTS
  (`profile/ui/personal` `PersonalPorts`), built by `screens/profile/[...path]/hooks/use-personal` and handed to
  the shell as `sectionContent.personal`. On the web the mobile is edited IN its row at every width (no sheet, no
  window). An account the server names no patient for reads the four rows that have a source (the date of birth,
  the gender, the email, the mobile). 🔴 A refused code is a `401` too: only `EC401` is a session that ended.
- «Σύνδεση και ασφάλεια» (wave 4.5, screen 59, card w45-w6; U-168, D-W45-35 … D-W45-40) at
  `/profile/account-settings/security`: the register's SECOND section (`built`, a member's alone — with it all five
  are built). Every call of it is the `auth` module's own, so the whole screen lives there and needs no ports: the
  screen only hands the page to the shell as `sectionContent.security`. `auth/api/password-credential`
  (`changePassword`, beside the sign-in flow's own `initSetPassword` / `setPassword`, which the page calls AS THEY
  ARE — no second copy), `auth/api/sign-in-methods` (`signInMethodsQuery`, `unlinkSignInProvider`,
  `readProviderUnlinkFailure`) and `auth/api/sessions` (`accountSessionsQuery`, `endAccountSession`,
  `readSessionEndFailure`); the refusals of the password's writes are read by the flow's own map
  (`auth/lib/failures` `readAccountPasswordFailure`). The view models are `auth/lib/security` (the password's row
  from the server's two booleans — 🔴 D-W45-39 no «Ορισμός» without a sign-in email — the providers' rows, 🔴
  D-W45-35 a device's words composed HERE from the three closed vocabularies, the refusals' words), the names no
  language changes `auth/config/security`. The slice `auth/ui/security`: the page that composes, one component per
  part (`password-part`, `providers-part`, `devices-part`), the two forms of the password's row (`change-form`,
  `code-form`), `unlink-dialog` (the one window, the shared `ActionDialog`), `hooks/use-security` (the two reads,
  each with its own wait and failure; whether the password's row is open) and `hooks/use-password-code` (the code's
  sends and their 60″). The password is changed or set IN its row at every width (`EditableRow`); the other rows
  fade meanwhile. 🔴 Only `401 EC401` is a session that ended: a wrong current password (`EC412`) and a wrong code
  (`EC011`) are said under their field. 🔴 D-W45-38: «Αποσύνδεση» of a provider that may not go opens no window and
  sends no request. 🔴 D-W45-40: this device has no «Αποσύνδεση». A session's id is in the page's memory and in the
  request's path alone — in no attribute and no address. The web sends no `x-device` (the server reads the
  User-Agent).
- «Ειδοποιήσεις», the list (wave 4.5, screen 63, card w45-w7; U-174, D-W45-45, D-W45-49, D-W45-59) at
  `/notifications` — a route of its own (`routes/notifications`, `screens/notifications`), not under `/profile`. The
  word «center» is the preferences' table (screen 60): the list is `inbox` everywhere. `notifications/api/inbox`
  (`listNotifications` with `filter`, `lang` = the PAGE's language, `limit`, `cursor`; `countUnreadNotifications`;
  `markNotificationRead`, `markAllNotificationsRead`; `map` — the answer as facts; `cache` — the keys, the count's one
  place, what a press shows before the answer and its way back; `readNotificationInboxFailure`), `config/inbox` (the
  three choices in order, the glyph of each kind, the most characters of a line), `lib/paths`
  (`readNotificationsAddress`: `?filter=` against the closed list of three) and `lib/inbox` (the view models: which
  choice opens, «Νέες (n)», what the page shows, when a line came by the Greek clock, its row, and
  `notificationTargetOf`). The slice `ui/inbox`: the page that composes, `components/` (`menu` from 950, `row`,
  `round-link` for the gear and the bell, `skeleton`, `bell`), `hooks/use-inbox`. From 950 it is the settings'
  template (`SplitView` `menu` `centred`, U-167): the three choices the left menu, the list in the middle of the
  right column under its choice's title; 744–949 one column with the pills under the title; below 744 the pushed
  page with «←» to the «Προφίλ». A guest's words, the wait, a failure and an account with no notification draw no
  choices and are one column (`solo`). The frame (`shell/ui/site-frame/lib/frame` `NOTIFICATIONS_PAGES`): no footer
  at any width, no capsule. 🔴 D-W45-45: the module says WHAT a line opens (`appointment` | `rating` | nothing) and
  the SCREEN says where — `/appointments/<id>`, `/ratings/<id>` — since a module never imports another; 🔴 D-W45-59:
  a line about a question (no such page on the site) or of an unknown kind opens nothing — new, it is a button that
  only reads it; read, plain text. A line's words are the server's, drawn as text whatever their shape. The second
  slice `ui/unread-host` is in the root layout beside the messages': the one read of «how many are new». 🔴 D-W45-17:
  a member's menu has «Ειδοποιήσεις» (the first row under the rule; `buildAccountEntries`' fifth argument lights its
  dot, the row then named «Ειδοποιήσεις, νέες»), the pill's dot lights for it too, and the «Προφίλ» page has the
  module's `NotificationBell` at the end of a member's title, below 744 only — the screen hands it to the tab
  (`headerAction`). The deletion's preview names the new kind `notificationInboxItems` («Ειδοποιήσεις»).
- The patient's facts and rules (wave 4.0, P-W4 §4.7, card W4-3) in the same module: `api/appointment` (+ the list's
  infinite read `appointmentListQuery`, the ONE scan of the upcoming `upcomingScanQuery` (D-W4-21), the change
  `changeAppointment` and `cancelAppointment` with `readAppointmentChangeFailure`, `storeAppointmentDetail`; the facts
  carry the office's snapshot with its languages, the relative's relationship and gender, the lines, how it ended and
  the trail — 🔴 never `canceledLate` (U-137.5); P-B4 §13.1's new fields are read since W4-9, see screen 54's
  paragraph below),
  `api/rating` (the invitation, the submit, the person's own review), `api/relatives` (+ list, change, delete); `lib/`
  `when` (the hours on the office's clock), `status` (the patient's pill, `canAmendAppointment`), `list`, `detail`,
  `change`, `cancel`, `rating` (the server's grade), `relatives/{words,form,upcoming}` (🔴 U-139.5's ONE helper,
  D-W4-22); `config/` the limits, the patient's cancel reasons and the rating's aspects and weights, read against the
  backend by `tests/architecture/appointment-rules.test.ts`. The doctor of an appointment is the doctor module's
  `doctorPublicProfileQuery(doctorId, lang)` (D-W4-29: personal, a key of its own), composed by the screen; «Πώς
  λειτουργούν οι κριτικές» is `doctor/lib/detail` `buildDoctorReviewHowBlocks` (D-W4-24).
- 🔴 The rules of the patient's pages live in the module, not in a screen's page (contract «Screens compose»; review
  w4-arch-frontend L-1, card w4-w9): `ui/list/hooks/use-pages` `useAppointmentsPages({ page: 'appointments', address })`
  for screens 50–53 and `({ page: 'rating', invitationId })` for screen 54 — who reads, the read of the appointment on
  the right (and of the invitation), the list's tab, when the list is read, 🔴 U-139.1 `paneEmpty`, `paneKey`, the
  doctors to read (`doctorIds`), the page's memory (`doneOf`, `justCanceled`; let go when another appointment opens or
  the pages are left), `signIn` / `retry`. A screen's page calls it once and joins the OTHER modules to it (doctor,
  messages), nothing else; what is the screen's own stays in its `hooks/` (`use-screen`: the addresses; `use-time`: the
  picker of «Αλλαγή ώρας», started again by `paneKey`). The forms of screens 52 (note), 53 and 54 are the shared
  `createForm` with `form.field(name)` (L-2, `state-management.md`).
- A module's link is an address the SCREEN already resolved (`links.*`, `href`): a module knows no route, so its
  `<a href>` and its `goto` carry `eslint-disable … svelte/no-navigation-without-resolve` with that one reason (the
  booking's, the messages' and the appointments' way) — never a path built inside a module.
- `createQueries` is read through `combine` as ONE object with a constant key, never as the library's array (🔴 Σ1,
  live check of wave 4.0: `@tanstack/svelte-query` 6.1.27 throws «'deleteProperty' on proxy» when the array shrinks by
  two or more at once): `doctor/ui/public-profiles` `{ byId }`, `doctor/ui/availability-picker` `use-office-slots`
  `{ reads }` — the only two readers.
- Screens 50 + 51 (wave 4.0, card W4-4): ONE page for `/appointments` and `/appointments/<id>` — `ui/list` (its page is
  the `SplitView`: the column with the title, the tabs as links that keep the tab in the address, the groups and the
  cards, the states; from 950 the first appointment opens beside it with `replaceState`; 🔴 U-139.1: ONE column in the
  middle while nothing stands on the right; `useAppointmentsList` the infinite read), `ui/detail` (the 51: head,
  notices, «Πώς ήταν η επίσκεψη;», the card with its «Αλλαγή» links, the doctor's terms, the rows of actions, the cancel
  link, its own states; `useAppointmentDetail`, a `404` and a `403` alike; the place of «Η κριτική σας» is a snippet
  the screen fills), `ui/status-pill` (the one pill of 31, 50, 51), `ui/change-screen` (the «Αλλαγή» link of the
  booking's card and of the 51), `ui/memory` (D-W4-33: what was just saved, in the page's memory and never in the
  address, provided by the module's root host `BookingDraftHost`), `lib/calendar` (🔴 D-W4-31: the `.ics` the browser
  writes, byte for byte the email's — `tests/architecture/calendar-golden.test.ts` runs it on the backend's golden
  vectors — `PUBLISH`, `SEQUENCE:0`, `DTSTAMP` the appointment's `updatedAt`, never a note or a relative's name). The
  screen `screens/appointments/[...path]` composes what a module may not import: the doctors (the doctor module's
  `ui/public-profiles` `useDoctorPublicProfiles`, one public profile per different doctor, shared with screen 54),
  «Μήνυμα στον γιατρό» (the messages' `useContactDoctor` + `ContactDialog`), «Η κριτική σας» (below), the addresses
  (`lib/paths` `buildAppointmentsLinks`, ONE set for screens 50–54, through the screen's `href`); the list is read where it shows (on its own address, and from 950 beside an appointment once that one has
  told its tab; until then its wait, never «no appointments»; an appointment's address from 950 is two columns from the
  first paint — the list's wait and the 51's, the shot `w-loading-1440` — one column only once the right has nothing).
  From 950, once shown, the list stays — its cards, scroll and focus, on the tab it last showed — while the next
  appointment is read (P-W4 §3.6), its cards open in place
  (`data-sveltekit-noscroll` / `-keepfocus`), and the first opens in the same paint as the cards (the 51's wait on the
  right, `pane({ opening })`). An appointment's tab is its own (`appointmentTabOf`), never the address's.
- Screens 52 + 53 (wave 4.0, card W4-5 / W4-6; 🔴 U-102 / U-136 / U-137: screens, never windows): the steps of
  `/appointments/<id>/{time,for-whom,relative,note,cancel}` stand in the 51's place — a page of their own below 950,
  the right column beside the list from 950 (U-136.2) — once a member's appointment is read (its states stay the
  51's). `ui/change` (52: its entry `page/index.svelte` picks the screen the address names — `time`, `for-whom`,
  `relative`, `note`, also exported one by one; `useAppointmentChange` the ONE `PATCH` and what follows it) and
  `ui/cancel` (53) stand on
  `ui/change-screen` — the booking's «Αλλαγή» pieces moved there with `mv` (P-W4 Σ-27: `ChangeFrame` with its
  `placement` `page` (the booking, unchanged) / `pane` (a `<section>` in the appointments' `<main>`), `RoundLink`,
  `ChoiceList`, `FirstVisit`, `NoteField` with its `maxLength` and `height` (`note` 104, `short` 96 for the 53), `RadioRows`, `ChangeLink`, the box «Το ραντεβού σας»
  `ChangeContext`, and `useAppointmentSteps`: open one step on, leave the steps that were opened, once) — and on
  `ui/relative-form` (the booking's «Νέος συγγενής» moved with `mv`, ONE form for the booking and the 52; each caller
  says where it goes back and what follows a save; 🔴 D-W45-14, wave 4.5: a relative's ΑΜΚΑ / ΑΦΜ are known only by
  the server's masks — `RelativeFacts.amkaMasked` / `afmMasked` — so on a relative on file the two fields open EMPTY
  with the mask as their hint («Έχει δοθεί: …»), an empty field is left untouched, a number typed travels, and
  «Αφαίρεση» marks it to go as `null` with the form's one save: `lib/relatives/form` `toRelativeUpdate(…, removed)`). The screen composes the doctor module's picker on the
  appointment's ONE office (`hooks/use-time`: the profile's slot reads, its own hour and the taken ones left out) and
  the auth module's rule for a mobile. Each screen gives way to the appointment when it may not open (the hour without
  `canReschedule`, the person and the note outside pending / booked, the cancel of a closed visit; the deadline that
  passed is screen 53's own view).
- Screen 54 and «Η κριτική σας» (wave 4.0, cards W4-7 / W4-9 = w4-w6; 🔴 U-102 / U-138: a screen, never a window):
  `/ratings/<invitationId>` IS the form (U-138.3, the email's link) — `screens/ratings/[invitationId]` composes the
  same `ui/list` page as the appointments (`open`: its right column is the form's whatever the address says;
  `autoOpen={false}`: the list never opens another appointment there), so below 950 the form is its own page and from
  950 the right column beside the visit's «Ιστορικό», the visit selected; two columns from the first paint, one only
  for a guest or with nothing on the right (a refusal, a failure) beside a list with nothing either (U-139.1). The list
  is read from 950 once the visit has told its tab (D-103). `ui/rating` (its page: the states — the wait, a guest's
  «Σύνδεση» with the sign-in over the form once, «Η πρόσκληση δεν είναι διαθέσιμη», a failure, a blocker with one way
  back — and the form on `ChangeFrame` (`bar={false}` for the states with nothing to save): «Η επίσκεψή σας»
  (`buildAppointmentContext`), the five aspects on the shared `StarInput`, «Βαθμός κριτικής» (`lib/rating` `gradeOf`, the
  server's formula), the words (`clampRatingComment`, 2000 UTF-16 units, no `<` `>`), the preview, the four lines
  (`ratingThenLines`), «Πώς λειτουργούν οι κριτικές» (D-W4-24: the profile's `InfoDialog`, information — the one window
  the slice imports) and «Πολιτική κριτικών»; ONE submit; D-W4-23: an invitation already answered puts its visit in the
  address's place; `useRatingInvitation` the read (`403` / `404` alike); `OwnReview` + `useOwnReview` the 51's card).
  The screen composes what is the doctor's: the name the review carries — the server's `patientName` / `patientInitial`
  (D-W4-26) written by the profile's `reviewAuthorName` — and the preview, the profile's own list card
  (`buildDoctorReviewListCard`, D-W4-25: «Σήμερα»); the appointments' screen composes «Η κριτική σας» on the 51 by the
  `ratingId` the appointment names (P-B4 §13.3.5), never a list of reviews per appointment, with the doctor's reviews at
  this one (`doctorDetailsPath(…, 'reviews', { focus })`) and the review policy. The facts (W4-9): `ratingInvitation`
  and `ratingId` on every appointment, the three of `actions` (`cancellationDeadline`, `rescheduleDenial`,
  `reschedulesLeft`) on one, each read only as what the contract names (D-118: anything else is `null`).
- Wire ⇒ facts (W-4, the one statement of this rule; `shared.md` «Shared API Client» points here): only `api/` of
  these two modules imports `$shared/lib/api-client` (or any path under it, as
  `…/wire-types`: the guard `tests/architecture/import-boundaries.test.ts` reads both); their `lib/`, `ui/`, screens and
  routes meet facts and the bodies `api/` names (`AppointmentCreateRequest`, `DoctorOnboardingOfficeInput` …), each a
  narrowing of the generated body, so a body the contract does not take does not compile. A read's endpoint answers
  its view only to the `queryFn` of its `queries.ts`, which maps it (`getBookingPatient`, `getAppointment`). A write answers facts too,
  its mapper inside the endpoint (`createAppointment`, `createBookingRelative` — an id and both names, never the
  relative's ΑΜΚΑ or ΑΦΜ — `saveDoctorOnboardingStep` and `pickDoctorOnboardingAddress`), `null` for an answer that is
  none, or nothing at all when no page reads it (`updateBookingPatientProfile`: the whole patient with their and the
  relatives' ΑΜΚΑ / ΑΦΜ stays in `api/`; the page reads the person again). The address search's mappers and the
  relative's `201` type no longer leave their barrels (review w3-w6 R1 MINOR-1, R2 MINOR-1 / NIT-2).
- Status page: the root `routes/+error.svelte` ⇒ `src/screens/home` `SiteErrorScreen` ⇒ `modules/shell/ui/status-page`
  (`lib/status.ts`: the words and the ways on of a 404 and of a failure; `noindex`, inside the frame, the capsule shown,
  `frame.ts` `showsBottomNav(path, status)`). A doctor nobody may see draws the same `StatusPage`.
- Shared (`shared.md`): `DocumentPage`, `PageBar`, `ListHeader`, `StatusPage`/`StatusArt`, `SearchPill`, `RichText`,
  `LinkRows`, `StatePanel`, the `Chip`'s `phoneVariant`, the `AccordionDetails` and `$shared/lib/rich-text`, `seo`, `text`.
