# Testing Strategy

## Current gate

The required quality gates are:

```txt
bun run check    # Paraglide compile + svelte-kit sync + svelte-check
bun run lint     # Prettier + ESLint (implementation work)
bun run test     # Vitest run (unit + component)
bun run build    # routing / provider / config / env / public UI changes
```

## OpenAPI drift gate

`bun run openapi:check` is a separate CI drift gate for the generated API types:
it regenerates from the committed vendored spec and fails if
`src/generated/api/schema.ts` is stale (mirrors the backend's `openapi:check`).
Codegen is intentionally **not** wired into the hard `check` gate — the generated
types are committed, so `bun run check` stays hermetic and offline and
type-checks the committed output. `openapi:types` is wired into `prepare` (like
`paraglide:compile`) so types are present/fresh after `bun install`.

Before starting a large implementation that touches API data, run
`bun run openapi:check` to confirm the generated types
(`src/generated/api/schema.ts`) are still in sync with the vendored contract
(`src/generated/api/openapi.json`). If the backend contract has moved, run
`bun run openapi:generate` first (sync + regenerate types) and reconcile any
resulting type changes in the affected adapters/feature `types.ts`. The
`pre-push` hook (`verify:push`) also runs `bun run test` and `openapi:check`,
but verifying up front avoids building on a stale contract.

## Tooling in place

- **Vitest** `^4` (jsdom) — `vitest.config.ts` loads only the Svelte + icons
  plugins and mirrors the `$`/`$app` aliases; `vitest-setup-client.ts` registers
  jest-dom matchers and shims jsdom gaps (matchMedia, ResizeObserver,
  `Element.animate`, pointer-capture). jest-dom matcher types are declared in
  `src/vitest.d.ts`.
- **Svelte Testing Library** `^5` + `@testing-library/user-event`.
- **SvelteKit virtual modules** (`$app/environment`, `$app/state`, `$app/paths`,
  `$env/dynamic/public`) are mocked for jsdom under `vitest-mocks/` and aliased in
  the Vitest config. Tests set `page.url` to render a locale (`/en/...` for
  English) and set/delete `PUBLIC_*` keys on the mocked `env` object, resetting
  both in `afterEach`. Values computed once at import (`src/shared/config/env.ts`)
  are tested by setting the keys after `vi.resetModules()` and importing the
  module again. Storybook aliases the same `$env/dynamic/public` stand-in
  (`.storybook/main.ts`).
- Playwright (browser flows) is still to be added.
- **Storybook** `^10` (`@storybook/sveltekit`) is the component workshop. Stories
  are Svelte CSF (`*.stories.svelte`) co-located next to every `src/shared/ui/**`
  component, with an axe a11y panel (`@storybook/addon-a11y`) and autodocs.
  `bun run build-storybook` compiles and bundles every story and is the new
  Storybook gate (currently informational, not yet a hard CLAUDE.md blocker).

## Storybook story tests (deferred)

Browser-mode story tests via `@storybook/addon-vitest` are **not yet wired**.
When added they would:

- install `@vitest/browser` + `@vitest/browser-playwright` and run
  `bunx playwright install chromium`,
- convert `vitest.config.ts` into a two-project workspace (`unit` jsdom +
  `storybook` browser) so the fast jsdom suite stays the default `bun run test`,
- add `.storybook/vitest.setup.ts` (`setProjectAnnotations`) and
  `test:stories` / `test:all` scripts.

Until then, story `play` functions (e.g. dialog/popover/tabs open, cookie-consent
accept, account-menu) run only in the Storybook UI's interactions panel and are
not executed headlessly. The existing jsdom specs remain the authoritative
component test coverage, so `play` stories are kept minimal (one per
overlay/interactive component) to avoid duplicating them.

## File placement

- Unit/helper and component tests: colocated under `src/**` as `*.test.ts`.
- Component tests that need children/slots or composition render a small
  colocated `*.harness.svelte` (or `*.form-harness.svelte`) component.
- Architecture tests: `tests/architecture/**` (Vitest `include` covers `tests/**`).
- Tests of a root-level script: `tests/scripts/**` (`tests/scripts/check-secrets.test.ts` for `scripts/check-secrets.mjs`; the Vitest `include` does not reach `scripts/`).
- Browser tests: `tests/browser/**` (to be added).

## Component & form testing notes

- Prefer role/label queries (`getByRole`, `getByLabelText`) and assert ARIA
  state (`aria-checked`, `aria-expanded`, `aria-selected`) over implementation
  details.
- Overlays portal to `document.body`; query them through `screen`/`within` and
  use `findBy`/`waitFor` for transition-driven mount/unmount.
- The page before hydration: `mount(Component, { target })` without `flushSync`
  runs no effect, as a server render runs none, so it shows what the markup
  already has (the `ChipGroup` Tab stop, `chip-group.ssr.test.ts`). A true
  `svelte/server` render does not run here: Vitest resolves `svelte` to its
  browser build for jsdom.
- jsdom has no `inert` property: Svelte sets `inert={…}` as the property on an element without a props spread
  (assert the property) and as the attribute on one with a spread (assert the attribute, a leaving layer's case).
- The kit's motion is CSS (U-12.2) and jsdom runs no CSS: assert the classes (`starting:…`,
  `data-[state=closed]:…`, `transition-[…]`, `duration-<token>`) and the `data-state` / `inert` of a leaving
  layer. A leaving layer (`Presence`) finds nothing moving in jsdom and goes at once; `holdTransitions(match?)`
  in `vitest-mocks/css-transitions.ts` makes the nodes it matches report a running transition of their own
  (`getAnimations()`) until `end(node)` fires its `transitionend`, so a spec sees the way out (removed when the
  test finishes). No Svelte transition remains: a spec may assert that `Element.animate` is never called.
- The setup's `window.matchMedia` is a `vi.fn`: `vi.spyOn` returns that same mock
  and its implementation outlives `restoreAllMocks`. Swap the function for one
  test and put it back in `onTestFinished`: the one helper is `reduceMotion()` in
  `vitest-mocks/reduce-motion.ts`, next to the setup; the list it returns has the setup's shape, listeners
  included. Since U-12.1 it serves the negatives that show the motion is the same under reduced motion.
- A pill measured from a box (`Tabs`, `SearchBar`) is tested by spying on the `offsetLeft`, `offsetTop`,
  `offsetWidth` and `offsetHeight` getters of `HTMLElement.prototype` (`vi.spyOn(…, 'get')`), keyed by the
  element's `data-*`; the `offsetWidth` read of the list or the pill is the commit before it may slide, where a
  spec can record its classes. A box of 0 (a hidden parent) is no measure: the pill stays `hidden`.
- jsdom has no CSS: a unit that reads its CSS-chosen shape (`SearchPanel`'s `coversScreen`)
  is tested by stubbing `getComputedStyle` for that element and `getClientRects`. jsdom draws
  no box either (`getClientRects()` is empty), so a test that needs the open `SearchPanel` to
  take Escape or an outside press stubs one rect (`drawn()` in its spec, `beforeEach` in the
  `SearchBar` spec); without it the panel counts as hidden and takes neither (NIT-2).
- A unit that measures its own box (`DateStrip`, `StatStrip`, `ReviewCard`) is tested by giving jsdom the sizes it
  lacks: `Object.defineProperty` on the element (`clientWidth`, `scrollWidth`, `scrollLeft`, then a `scroll` event) or
  `vi.spyOn(Element.prototype, 'clientWidth', 'get')` keyed by the element's `data-*`, and a hand-fired
  `ResizeObserver` (`vi.stubGlobal`, undone with `vi.unstubAllGlobals()`); the setup's observer never fires. jsdom
  has no `document.fonts` either: a font that arrives is `Object.defineProperty(document, 'fonts', { configurable:
true, value: new EventTarget() })` + a `loadingdone` event, undone with `Reflect.deleteProperty(document, 'fonts')`.
- Form fields wired through `createForm` support fine-grained reactivity; cover
  it with per-field render probes (`$effect` reading only one field's value) and
  assert no `console.error`/`warn` during interaction.

### Wave 1.0 test helpers

- `$app/navigation` is mocked for Vitest (`vitest-mocks/app-navigation.ts`): `goto`, `invalidateAll` … are spies a
  spec reads with `expect(goto).toHaveBeenCalledWith(…)`; `clearMocks` resets them between tests.
- A component that reads TanStack Query renders inside `$shared/query/query.harness.svelte` (its own client, no
  retries); the home has its own harness (`discovery-home.harness.svelte`) that also sets the page tree's
  `SearchDock` (and takes `client`, a client the spec reads or filled first: the «Όλοι» rows' queries, U-29.3).
  Network calls are mocked at the module's API (`vi.mock('$modules/shell/api/consent', …)`), at the leaf the code
  imports (MINOR-4 of U-29: the home's rows at `api/marketplace/build-section-query` and `…/category-scope`). Since
  U-32.1 a mock of the api answers FACTS (`fetchHomeSection` a `SearchDoctorsSection`, `fetchSearchResults` pages of
  `SearchDoctorsCardFacts` with a fixed `readAt`), and the page writes them; a spec of an api function whose input
  became the scope reads the address as its caller does (`readResultsScope`, `readResultsPress`) and keeps its
  assertions.
- The results (D3) mock their reads one level up, at `api/marketplace/search-source` (`fetchSearchResults`) and
  `api/marketplace/facets-source` (`fetchFilterFacets`), and stub `IntersectionObserver` to bring the list's end
  into view; the page's address is the `$app/state` mock's `page.url` (set before the render). The map is MapLibre
  mocked (`vi.mock('maplibre-gl')` + its worker `?url`) with `clientWidth`/`clientHeight` spied (a box with no size
  makes no map: jsdom, a hidden 744 map, the server). A spec that reads the server's first page as fresh renders in
  the app's own client (`search-results.harness.svelte`, `createQueryClient`: 30 s fresh; `client` a client a
  test already prefetched into, `dock` the page tree's `SearchDock`). The stubbed observer is told ONCE where the
  end is: the page asks every next page while it stays in view (D3 r1 MAJOR-2). The filters' 350 ms window is
  measured with fake timers (`vi.advanceTimersByTimeAsync`, real timers back in `finally`). The home mocks
  `search-source` too: its «Αναζήτηση» prefetches the results' first page. The filters' and the results' specs
  port the application's titles («S-31.7», «S-34.6» …).
- The search (D2) mocks its three reads at `$modules/search-doctors/api/marketplace/endpoints` (`getFacets`,
  `getDoctorSuggestions`, `getLocationSuggestions`) and the device's position at `$shared/lib/location`
  (`resolveDeviceLocation`), in its own spec and in the home's: opening the search never calls out of a test. Its
  specs port the application's, title for title (`module::useCriteriaModalState`, `CriteriaWhatResults`,
  `CriteriaWhereResults`, the libs' «S-xx: …»); where U-23.2 replaces a step (a choice opens the next card, one card
  always open) the test is rewritten and says so. A rune class (`CriteriaState`, `useDebouncedValue`) is set up in
  `$effect.root` (its teardown is the unmount); a hook's arrow must not return a function (`beforeEach(() =>
mock.mockReset())` runs the mock as its cleanup). The position's memory (`$shared/state/device-location`, U-29.1)
  is module state of the tab: a spec that reads it calls `forgetDeviceLocation()` in `beforeEach`/`afterEach` (the application's
  `resetAppStoreState`). `$shared/lib/location` keeps the application's eight «S-34.3: …» guards on a stubbed
  `navigator.geolocation` / `navigator.permissions` and `vi.getTimerCount()`. The window's focus is guarded by
  keyboard (`card.focus()` + Enter): it never falls to `document.body` when a card changes (MAJOR-1 of r1).
- The profile (wave 1.5, screen 5): `src/modules/doctor/lib/detail/detail.sample.ts` is the tests' doctor (two
  offices, three services, made-up names) and `sampleAvailability(office, times)` an office's 28 days; the page's
  spec renders `ui/detail/page/doctor-detail.harness.svelte` (the app's own client) and mocks the browser's reads one
  level up, at `api/availability` `doctorAvailabilitySlotsQuery` and `api/office` `doctorOfficeQuery` (query options
  that answer FACTS), with `Date` faked at the sample's clock; shallow routing is the `$app/navigation` mock's
  `pushState` and the `$app/state` mock's `page.state`. Its titles are the owner's «U-34…U-42: … (app = web)».
- jsdom has no `inert` IDL attribute: Svelte sets the property, so a spec reads `element.inert`, not the attribute.
- The consent card's inline policy links are a touch-target exception added in this wave (WCAG 2.5.8 inline
  links, `data-slot="cookie-consent-link"` in `tests/architecture/touch-targets.test.ts`); round f1b adds the card's
  inline «Συνδεθείτε για κόστος» (`data-slot="doctor-card-fee-action"`: words of its line, its target grown 4 on every
  side by a pseudo-element, ≥ 24 × 24, WCAG 2.5.8 AA), the owner's explicit exception U-29.2 (`design-tokens.md`).
- The sheet's drag (U-27.1, `map-sheet.test.ts`): jsdom has no CSS, so the computed `position` is the initial
  `static` — the spec stubs `getComputedStyle` for the sheet (`absolute` below 744, `static` from 744, the
  `SearchPanel` precedent); the stage's height is a `clientHeight` spy keyed by its `data-testid`; the release's speed
  comes from the events' `timeStamp`, which jsdom takes from `Date.now()` (a `vi.spyOn(Date, 'now')` clock); the
  non-passive `touchmove` is a `new TouchEvent('touchmove', { cancelable: true, touches: [{ clientX, clientY }] })`
  whose `defaultPrevented` is read (jsdom has no `Touch`, plain objects pass). The map's zoom (U-27.2) is the
  MapLibre fake's `zoomIn` / `zoomOut` spies and its `getZoom` / `getMinZoom` / `getMaxZoom`, a `zoom` event read again;
  whether the zoom's column shows (from 744) is one stubbed rect of `getClientRects` on `[data-slot=map-view-zoom]`.
  U-28.2: the map's «⤢» / «×» and «Απόκρυψη χάρτη» are the harness's `expandControl` / `hideControl` (a `rerender`
  with `expanded: true` shows the same node renamed, the focus kept); the hide pill's band is a stubbed rect on
  `[data-slot=map-view-hide]`. The results' three states are read on `data-desktop-map` and their classes; «below 1128
  nothing changes» is the classes of the stage, the sheet, the grid, the pane and the switch with every `laptop:`,
  `desktop:` and `wide:` class left out, equal across the states; the page's top is `document.scrollingElement`
  (jsdom keeps a `scrollTop` it is given).

## Architecture coverage

In place:

- `tests/architecture/i18n-parity.test.ts` — every locale declared in
  `project.inlang/settings.json` has a `messages/<locale>.json` catalog (and no
  catalog exists for an undeclared locale), with the same keys as the base locale,
  non-empty texts, and the same `{placeholders}`. Paraglide silently falls back to
  the base locale for a missing translation, so this test is the only guard.
- `tests/architecture/scale-vocabulary.test.ts` — every class in `src/**`
  (components, stories, harnesses, demos, CSS) stays on the central size scale:
  no arbitrary size values, numeric steps only 0–6 in halves, every name known
  to its family (spacing/controls/media/web-only names, containers, roles,
  leadings, radii, icons), no `sm: md: lg: xl: 2xl:` prefix and no container
  query outside the container names, no length in any arbitrary value, no line
  height on a text size (`text-body-sm/7`), a leading only after a role, and no
  size written as a number in code or CSS (props, object keys, size and gesture
  constants, `step(n)` above the scale, `style=`/`style:`/`el.style`). Comments
  are blanked by a string-aware pass (`source-scan.ts`).
- `tests/architecture/touch-targets.test.ts` — every `<button>`, `<a>`,
  `<input>`, `<select>`, `<textarea>` and ARIA widget has a box of at least the
  48px touch target on both axes (from its classes, same-file definitions or the
  shared recipes `buttonVariants`/`toggleVariants`/`inputSizes`/`fieldSizes`:
  the height of each size and the width of each recipe `base`). It fails on a
  class that shrinks the box again (`min-w-0` after `min-w-touch`), on a size
  passed to a target component (`<Button class="size-6">`) and on an `IconButton`
  whose `class` sizes it at all (`size-*`, `w-*`, `h-*`, `min-*`, `max-*`, at any
  breakpoint: its size is the `size` prop, delta R1 of the application); hidden form mirrors
  are skipped. Three listed exceptions (`EXCEPTIONS` with file, marker and reason,
  and a stale entry fails): the inline links of `InlineLinkText` and of the consent
  card (WCAG 2.5.8 «inline») and U-29.2, the card's «Συνδεθείτε για κόστος»
  (`design-tokens.md`). The 8 gap between targets is not tested (see `design-tokens.md`).
- `tests/architecture/color-parity.test.ts` (node environment) — transpiles the
  application's theme palettes (`application/src/shared/preferences/theme/{light,dark}/index.ts`,
  read only) and compares them with the `:root` / `.dark` blocks of
  `src/routes/layout.css`: missing, extra or reordered names, different values,
  and names `@theme inline` does not map to `--color-<name>` («U-03.4: …»).
  `chart-*` and `sidebar-*` are the web-only exceptions.
- `tests/architecture/shared-ui-generic.test.ts` — the shared UI
  (`src/shared/ui/**` implementation files, not stories, harnesses, showcases,
  mocks or `*.sample.ts`) is generic («U-02.1: …», rules of
  `study/20-web-components.md` §6): 1 no import from modules/screens/routes,
  2 no product word or brand mark (and in `src/shared/design` only the
  `brandName` token), 3 no fixed user text (text nodes, `aria-label`/`title`/
  `placeholder`/`alt`, prop defaults, `??`/`||` fallbacks, text keys of data),
  4 Paraglide keys only `common_*` or the component's own name, 5 colours only
  from the palette (no `bg-red-500`, hex or `style` colour), 5a shadows only
  from elevation, 5b status read as text uses `*-text`, 6 no `$app/*` (except
  `$app/environment`), Paraglide runtime or i18n preference: routes and locale
  come from the caller. Listed exceptions carry a reason and fail when stale.
  Since wave 0 dyad 2 (with the application's delta R1) it also reads: a net over
  every literal of code that reads as words (a constant, a ternary, a template,
  an argument), leaving out module names, thrown messages, `case`, type members,
  compared values (`key === 'Enter'`), object keys, context and selector names,
  SVG paths and CSS text; `description` and every `*Title`/`*Message`/
  `*Placeholder`/`*Label`/`*Text` prop; the catalog read any other way than
  `m.key(…)` (a computed key, an alias, a hand-off, a re-export); and `require`.
  Rule 2 reports the whole word or class a domain word sits in
  (`bookingNotice`, `min-h-bar-booking`), and an exception may name one exactly
  (`exact`), so it never covers a whole file.
- `tests/architecture/css-zones.test.ts` — the shared UI reads the width zone only
  through CSS: no width `matchMedia` (nor one whose query is held in a name),
  `innerWidth`/`outerWidth`/`screen.width`/`visualViewport.width`/the root's
  `clientWidth`, `resize` listener or `<svelte:window bind:innerWidth>`,
  `MediaQuery` of `svelte/reactivity` or `breakpoints` import («U-03.1: …»).
- `tests/architecture/scale-parity.test.ts` (node environment) — transpiles the
  application's canonical `values/index.ts` (read only, from the sibling
  `../application` repo) and `src/shared/design/tokens/tokens.ts`, and fails on
  the first differing export path. It fails, with the path, when the sibling
  repo is missing.
- `tests/architecture/story-widths.test.ts` — no story of the kit runs past the 375 phone («U-06.2: …»): a width
  wider than the canvas (375 less the preview's 16 a side, from the scale's containers, controls, media and web
  names) only beside a cap that fits the phone in the same class string (`max-w-full`, `max-w-screen`, a named
  `max-w-X` ≤ 343); a minimum that wide or an arbitrary `w-[…]` never.
- `tests/architecture/scroll-rows.test.ts` — every sideways scroller of the shared UI (`overflow-x-auto|scroll`,
  `overflow-auto|scroll`) takes the `scrollbar-none` utility («U-06.4: …»); `ScrollArea` is the one listed exception
  (its own bar), and a stale exception fails.
- `tests/architecture/motion.test.ts` (U-12, it replaces the R2 «U-09.8» / «U-09.13» guards) — no code of `src/`
  reads the motion setting (`motion-reduce:`, `motion-safe:`, `prefers-reduced-motion`, `prefersReducedMotion`,
  «U-12.1: …»); no `svelte/transition | animate | motion` import, no `transition:` / `in:` / `out:` / `animate:`
  directive, no class of `tw-animate-css`, every `duration-*` of the kit a motion token, and every floating layer
  of the shared UI (a `use:portal`, `use:floating` or `use:focusTrap` tag, or a `z-50` `fixed`/`absolute` one) has
  `starting:` + `data-[state=closed]:` + `transition-…` + `duration-<token>` in its classes or the file's class
  maps it reads («U-12.2: …»).
- `src/shared/lib/headless/presence.test.ts` — `Presence`: it waits for the node's own `transitionend` (not a
  child's), the safety clock, the same node on opening again mid-way, `inert` + `data-state` on the way out.
- `src/shared/ui/primitives/floating-label/floating-label.consumers.test.ts` — every field with a floating label
  keeps the same `<label>` through focus, typing, emptying and blur («U-12.5: …»).
- `tests/architecture/class-merge-imports.test.ts` — `tailwind-merge` and
  `tailwind-variants` are imported only by `src/shared/lib/utils.ts`.
- `tests/architecture/pressable.test.ts` (U-28.4) — the `@layer base` cursor rule of `layout.css` (`pointer` on
  buttons and the pressable roles, never while disabled; `not-allowed` on `:disabled` / `[aria-disabled=true]`; no
  cursor rule outside `base`), a sample of the kit with its `can-hover:` hover (outline chip, selectable card,
  segmented control: none on the chosen look; every `Button` tone, guarded by `not-disabled:`), and (γ) no `div` /
  `span` / `li` of `src/` with a press or key handler and no role, outside `aria-hidden` backdrops and the listed
  slider track.
- `tests/architecture/results-url.test.ts` (D3) — the results address is read ONLY by `readSearchDoctorsCriteria`
  and `readSearchDoctorsFilters` («S-07.3 (κανόνας 11, web): …»): nothing else calls their resolvers, and no page,
  screen or route of the search reads a query parameter itself.
- `tests/architecture/route-mirror.test.ts` («U-29.3: …») — every page route has its mirrored screen with the five
  files and renders it through `$screens/<path>` (the root ⇔ `home`, a `(group)` adds no folder).
- `tests/architecture/import-boundaries.test.ts` («U-29.3: …») — routes ⇒ screens ⇒ modules ⇒ shared: no import
  against the direction (shared → feature, module → module, module or screen → page layer, screen → screen), no
  private file of a slice or a screen from outside it, no relative import out of its unit (MINOR-3), no `$lib`, no
  `export *`, `$generated/api` only in the api client, no atomic layer of the shared UI importing one above it (Π2).
- `tests/architecture/module-segments.test.ts` («U-29.1: …», «U-29.3: …») — the modules' segments, rune-free `lib/`
  and `config/`, a static `config/`, type-only `types.ts`, «`api/` never imports `lib/`» with no exception (U-32.1:
  the list is empty, a type import counts, and the former shapes are its negative),
  and the remote answers out of runes (no `$state<…>` of an `api/` type, the transport only inside a `queryFn`; the
  negative is the former streamed-rows hook, BLOCKER-1 of the audit).
- `tests/architecture/card-media.test.ts` (D13, «U-29 (MINOR-5): …») — the doctor card and its skeletons draw the
  same aspect, from `searchDoctorCardMedia`, and none writes its own; `tests/architecture/map-bundle.test.ts`
  («U-24.4: …», NIT-1 of U-29: moved out of the map's spec) — `maplibre-gl` reaches no first bundle.
- `tests/architecture/raw-html.test.ts` (common v2 §B) — no `{@html}` in `src/` but the page's JSON-LD: inside
  `<svelte:head>`, in a file that builds it with `jsonLdScript` (its `<` `>` `&` escaped); a CMS text is drawn by
  `RichText` from its allowlist, never as markup.
- Each checker ships with negative fixtures next to the project scan, plus a
  proof that the scan read the code (file, token and tag counts).

The token registry and the class merger have unit specs next to them:
`src/shared/design/tokens/tokens.test.ts` (value rules, unique names, generated
theme) and `src/shared/lib/utils.test.ts` (`cn`/`tv` keep a role beside a color,
merge named sizes, drop a leading written before its role, keep the reading sizes `text-article-body` /
`text-document-body` beside a colour).

Architecture tests should also enforce (not yet in place; the route mirror, the screen files and the shared imports
are, above):

- module UI slices follow the slice contract
- shadcn primitives live under shared UI primitives
- runtime code uses leaf imports instead of broad parent barrels
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
