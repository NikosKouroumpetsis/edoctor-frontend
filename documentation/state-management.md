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
card adapter (the cards' facts, U-32.1: their words are `lib/doctor-card`'s), the
per-section scope configs, and the slug/id resolvers.

Two complementary mechanisms drive the home, each used where it is strongest:

- **Initial paint — SvelteKit streaming SSR.** `routes/+page.server.ts` returns the
  category rail immediately and each home section as an un-awaited promise
  (`home/load.ts`). SvelteKit streams them into the document, so sections reveal
  serially as the backend responds — skeleton while pending, cards once resolved.
  Streamed promises never reject: a failed section degrades to a per-section error
  state instead of crashing the response. 🔴 U-32.9: every streamed chain ends in its
  `catch` (`api/home/load.ts`, `articles/api/load.ts`, `lib/section-link`
  `buildStreamedHomeRows`, `lib/article-card` `buildStreamedHomeArticles`), so a mapper
  or builder that throws (a backend card of another shape) is the error too — never
  `.then(onOk, onErr)`, whose `onErr` misses a throw of `onOk`: SvelteKit's server
  dies on an unhandled rejection of a promise it has not rendered yet.
- **Category filtering — TanStack Svelte Query.** Selecting a rail category is a
  client interaction owned by `useHomeSections`. The category is resolved into a
  server-side scope fragment (professional ids / service slugs / text) embedded in
  each section's query key, so a category change refetches server-scoped results.
  `keepPreviousData` swaps content in place instead of flashing the skeleton, and
  caching bounds backend load. The `all` view stays disabled here because it is
  served by the streamed SSR load.

The home's rows are the application's `homeSectionConfigs` (U-20): «Δημοφιλείς γιατροί στην Αθήνα» (an area scope:
an unresolved area hides the row), «Δημοφιλείς Ψυχολόγοι», «Παθολόγοι & Γενικοί Ιατροί», each `popularity` +
`next7Days`, 8 cards (`HOME_SECTION_LIMIT`, the application's 8; up to 7 show from 1440). Each section
also returns the facts of what its «→» opens (`link`), which `lib/section-link` makes the `SearchDoctorsCriteria`
(`lib/search-criteria`, the application's URL names); the card's lines come from `lib/doctor-card` (the application's
day-and-time, fee and rating rules on the Greek clock, against the card's `readAt`). U-32.1: the route's load builds
the streamed rows and articles with those libs (`buildStreamedHomeRows`, `buildStreamedHomeArticles`), the rows'
queries in the browser build theirs in their `queryFn`.
The home's last row, «Άρθρα & συμβουλές υγείας», is the `articles` module's (`loadHomeArticles`, streamed, never
rejects). The rows follow the application's order (`discovery-rows`): waiting ⇒ failed ⇒ rows ⇒ empty; ONE failed
section is the error, and so is a read paused without a network (the application's 'unavailable', never an empty
home; app = web, U-20). «Δοκιμάστε ξανά» asks again only what failed or was paused — a streamed section through
`fetchHomeSection` in the browser (`useStreamedSections`), a category's scope first, then only its failed rows
(`useHomeSections.refetch`, the application's `retry`); the error stays until the answer.
🔴 U-29.3 (BLOCKER-1 of the audit): the `all` view's rows are TanStack queries too, never a copy in runes
(`discovery-home/hooks/use-streamed-sections.svelte.ts`): ONE query per row on the key of its `fetchHomeSection`
(`searchDoctorsQueryKeys.homeSection(id, lang, EMPTY_CATEGORY_SCOPE)`), filled by `fetchQuery` from the streamed SSR
answer as it settles (a failed one is the query's error), off by itself (`enabled: false`, no retry, no read on
focus or reconnect: D-103) and refetched by «Δοκιμάστε ξανά». A new page load (or language) resets every row's query
before it is read (`resetQueries`, which also silently cancels a retry of the previous load), so a row never shows a
former visit's cards; the category rows keep a key of their own until their scope is known (`null`), so the rows
fading out keep the previous category's cards (`keepPreviousData`). A category is asked at
the press (D-103: the queries follow `activeCategory`), alongside the rows' 0.25 s fade-out, during which the
previous cards stay; after the fade the previous category's cards (`keepPreviousData`) never show: the rows show
their skeleton until the new ones land (the application's `isRefreshing`). The articles show
only once the rows neither load nor fail. The category rows write «Σήμερα / Αύριο» on the server's clock
(`$shared/lib/server-clock`, D-118): the home's load sends `serverNow`, the browser keeps the difference.

Category filtering is server-scoped, not client-side tag filtering: backend cards
carry no category tags, and the `online` category requires a service scope only the
server can apply.

The base URL comes from `PUBLIC_API_BASE_URL` (public by design — used by both the
SSR load and browser refetch), read at runtime through `$env/dynamic/public` so a
deploy changes it without a rebuild, and defaulting to `http://localhost:8080/api/v1`
for the local seed-mock server.

Two seed-data alignments live in the marketplace layer: section/category scoping maps
each rail specialty to its professional display term (`SPECIALTY_SEARCH_TERMS`) so the
`/suggestions` lookup resolves real `professionalId`s, and home sections fall back to a
text term the backend matcher recognizes (e.g. `online`) when no service slug applies.
A home card with no backend image is `imageUrl: null` and draws the kit's no-photo silhouette (S-32.8);
`resolveMediaUrl` still resolves relative photo paths against the API origin.

## Page-tree shared state

`$shared/state/search-dock` (`SearchDock`, set by the site frame with `setSearchDock`, read by the home with
`getSearchDockOptional`) is the one meeting point of the top bar and a page's big search (U-16.7): the page
`register`s its search and sets `docked` when it passes under the bar; the bar then shows its small pill, whose
press `drop`s the search under the bar; a press outside or Escape `lift`s it. It is a context, never a module
singleton, so SSR requests never share it. The page also writes `summary` (U-23.2: what its search holds, in
words); the small pill shows each part instead of its own «Οποιαδήποτε ειδικότητα | Οπουδήποτε | Οποτεδήποτε», and
a page that leaves clears it. A page whose search is part of its address gives `languageHref` (the results, D3 r1
MINOR-5: the clean address of its readers' criteria and filters in each language, never the raw query); the
frame's settings and the results' legal line use it for «English / Ελληνικά», else the same path.

## The favourites (wave 2, screen 20, U-83, U-85)

- `useFavoriteToggle` (`search-doctors/ui/search-doctor-card`) is the ONE writer and the rule of every heart: the card's,
  the profile's (composed by its screen), the page's. It reads `['favorites', 'ids']` only for a member, 🔴 never for a
  guest; a press is optimistic in the ids and the lists, and goes back with a toast when refused. Writes run one at a
  time (`scope`) and each invalidates `['favorites', 'list', lang]`.
- A read of one person's own facts wears `personalQueryMeta` (`$shared/query`): the auth host removes them all when the
  session ends (`removePersonalQueries`), so it never has to know them by name.
- The search over the favourites is a rune of the page: never the address, a storage or the server (U-65.6).

## The session and the sign-in (wave 2, screen 19, U-80 – U-82)

- The cookies live on the API's host (U-80.1 Ε6), so the page's server knows nobody: every page is drawn as a guest's
  and `GET /patient/me`, from the browser, fills the header. It is the one source of who is signed in, a TanStack query
  owned by `src/modules/auth/ui/host`; a `401` is the answer «guest», never a retried failure.
- Only `httpSessionGet` / `httpSessionPost` / `httpSessionPut` / `httpSessionDelete` (`$shared/lib/http`) send `credentials: 'include'`, for the session and for
  what is personal (a member's prices: the profile's `getDoctorMemberProfile`; the cards' `searchDoctors` with
  `withSession`, U-34.4). Every other public read says `credentials: 'omit'` (`readEnvelope`), so SvelteKit's server
  `fetch` does not forward the browser's cookies either, whatever the API's port: what the server draws is the guest's.
- U-34.4: the home and the results are drawn as a guest's; a member reads each row and the first page ONCE more with
  the cookies, and `overlayMemberFees` lays only the fees over the cards. Nothing moves: the results' line is one line for
  both, and the home's card keeps the room of the guest's line under the amount (U-99.2, `feeRoomLabel`). A guest asks nothing more
  (guarded); a member's next pages and category rows carry the cookies from the start, so they need no second read.
  That one read never runs again by itself (no focus, no reconnect), a row asks the search the server has already resolved
  (`params`), and a member's reads live on keys of their own, `personalQueryMeta`: a sign-out takes every amount at once.
  What a member read never stands in for a guest's; a guest's open pages may start a member's read, never the other way.
- `Session` (`$shared/state/session`, one per page tree, in context) is how the frame, the pages and the cards meet the
  auth module without importing it: `status`, `member`, `requireSignIn({ action, onSignedIn })`, `signOut()`. What asked
  for the sign-in runs once after it (Ε4); it comes back through an address only as the closed `SignInAction` (`resume`,
  `takeResumed`), for a `/login?next=&do=` or a provider's redirect. A provider is left for without asking its start
  first: every refusal of `GET /auth/register/{google,apple}` answers `/login?error=<provider>`, and a cancelled one a bare
  `/login`. What the page itself must say (no API at all) is the fresh read of the legal versions that goes before it.
- `signOut()` ends the session only if the server did: the cookies are `HttpOnly` on the API, so a logout that failed
  (no network, a server's failure, anything but a `401`) leaves the member signed in, `signOutFailures` grows, and the frame
  says so in a toast. A surface asked from one page closes when the route changes (`afterNavigate`), but for the owed profile.
- `AuthFlowState` (`$modules/auth/ui/flow`) holds the flow's memory in that instance, in memory only: identifier, ticket
  and codes never reach an address or a storage. The browser remembers only `{ firstName, maskedIdentifier, channel,
lastMethod }` for «Καλωσορίσατε και πάλι»; the tab keeps only `{ next, action }` while a provider's redirect runs.
- `SiteDialogs` (`$shared/state/site-dialogs`) lets a page ask for the frame's windows (settings, consent); `ToastState`
  (`$shared/ui/molecules/toast`) is the tree's one toast. Both are created by the frame, never module singletons.

## The messages (wave 2, screens 18 + 21, U-84)

- TanStack Query owns every read (`$modules/messages/api`), each one `personalQueryMeta`: a sign-out leaves none in the
  tab. They run only for a member and only while the page shows: an open conversation asks for what is new every 5 s
  (`after`), the list and the badge every 30 s on the messages' pages, the badge every 60 s elsewhere. A guest asks nothing and
  no timer runs (guarded). The interval stops at a `401`, `403` or `404`.
- 🔴 What a person wrote stays in a rune of the page (`ThreadMemory`, the #18's `useContactDoctor`): never an address, a
  storage, a log, or a persisted cache (`tests/architecture/messages-privacy.test.ts`).
- `InboxMemory` (`$modules/messages/ui/inbox-memory`, one per page tree, in context, on the unread host) is what the
  messages' pages keep between them, as the application's tab stays mounted: the chosen chip, and per conversation what has
  not left, so a send that fails after the person moved on is a «Δεν στάλθηκε» back on its own conversation. The draft
  does not outlive its page.
- `Session.forgotten` grows at a sign-out and when another account comes into the tab (the auth host compares
  `tenantUserId`, or `doctorId` from the doctor's read it makes anyway, for an account with no patient's profile): the
  drafts go with it. `Session.expire(request)`, a write refused with `401`: the page learns that it
  knows nobody, the personal reads go, the sign-in opens; the draft stays, so the same person finds it. A provider's redirect
  reloads the page, and memory with it: there the words are lost, and that is the rule, not a slip.
- `InboxBadge` (`$shared/state/inbox-badge`, one per page tree, in context): the messages module's `unread-host` reads, the
  frame draws, and neither imports the other (the pattern of `Session`).
- «Επικοινωνήστε με τον γιατρό» asks the server nothing to be drawn: only its press does (D-103). The state of the #18 lives at
  the screen, so a member's new read of the profile beneath it touches nothing.

## The results and the filters (wave 1.0, D3)

`$modules/search-doctors/ui/search-results` `SearchResultsState` is the application's
`useSearchDoctorsResultsScreen`: the criteria and the filters come ONLY from the page's address
(`readSearchDoctorsCriteria`, `readSearchDoctorsFilters`), the scope a search sends, ONE `createInfiniteQuery` of
five a page (`api/marketplace/search-results.ts`), the next page while the list's end is in view (the application's
`onEndReached`: an `IntersectionObserver` only records `endInView`, an `$effect` asks again after every page — D3
r1 MAJOR-2, an observer tells only crossings), the count of the first page (S-32.10, «N+» on a lower bound). A
failed next page, or one paused without a network (`isNextPageUnavailable`), keeps the cards and offers
«Δοκιμάστε ξανά» at the list's end, never a loop of calls; its skeleton shows first while a retry runs. The server's
first page seeds the read (`initialData` + `initialDataUpdatedAt`) only when it was drawn for the same scope and
language (`hashKey`); the route reads its query untracked, so a new filter never waits for its load again. D-103:
a press that goes to the results (the home's «Αναζήτηση», «Εμφάνιση N γιατρών», an empty state's button) starts the
first page at once (`api/results` `prefetchSearchResults`, the scope read from the SAME href by the readers,
`lib/results-scope` `readResultsPress`, so the page finds that key; the read holds the cards' facts and the page writes
them in its `select`, U-32.1); «Κοντά μου» without this visit's position prefetches nothing. «Κοντά μου» (S-07.3 rule 11): the address has no position — the
visit's memory (`readFreshDeviceLocation`) gives it, or the device is asked (`resolveDeviceLocation`, 10″); until
then the read is off and the view waits, never the default Αττική; refused ⇒ the message and «Αλλαγή αναζήτησης».
An old link with `whereLat`/`whereLng` is replaced at once by the clean address (`goto(…, { replaceState })`).
Filters and searches are new addresses (a push): the filters by the application's names after the criteria.
`$modules/search-doctors/ui/search-filters` `FiltersState` is the application's `useFilterModalState`: the draft
(seeded at each open), the facets scoped by the criteria alone, the live count of criteria + draft after 350 ms of
quiet; both reads run only while the window is open (D-103) and never without the criteria («Κοντά μου» without its
position reads nothing). The layout state (the phone sheet's rest, the 744 map switch, the open pin, the hovered
card, and from 1128 the map `split | expanded | hidden`, U-28.2) is the page's own `$state`: never the address
(S-07.3 rule 11) or a storage.

## The doctor's profile (wave 1.5, screen 5)

The profile's facts are the ROUTE's load (`routes/doctors/[slug]/+page.server.ts`, `api/profile/load.ts`), never
copied into runes: the page is whole on the server. `$modules/doctor/ui/detail` `DoctorDetailState` is the
application's `useDoctorDetailScreen` on the web: the browser's reads as TanStack queries — every office's window of 28
days at once for the service the page books (`createQueries`, the moment the page lives, D-103, U-37.1), the active
office's facts when it is not the main one (`createQuery`, once, `staleTime: Infinity`, U-39.1; the main office came
with the profile and asks nothing), the whole list of reviews while their window is open — and the reader's choices
as `$state`: the ONE active office (the pill, a link's `office`, else the office with the nearest time, U-39.1/2), the
service of the card's «ΥΠΗΡΕΣΙΑ», the confirmed time (U-40.3), the share window. Every view (the sections, the card,
the bar, the windows) is a `$derived` of the `lib/detail` builders over these; a read that waits claims nothing, a
failed one says «Δοκιμάστε ξανά» and asks again only what failed (`retryAvailability`, `retryReviews`), the server's
page waits (the times are the browser's). The open window is the page's history state (`page.state.doctorDetails`,
shallow routing), else the `details/<section>` route's own section with the address's hints. «Σήμερα / Αύριο» is the
server's clock (`recordServerNow`, D-118), drawn again at Greek midnight (`msUntilNextPlatformDay`, S-34.1).

## The text pages and the lists (wave 1.5, screens 6–10)

Every text is the ROUTE's load, awaited on the server (the article and «Περισσότερα άρθρα» at once, a legal text, the
CMS page `faq`, the list's first page of 12), so each page is whole without JavaScript; nothing of it is copied into
runes. The articles' list is ONE TanStack infinite query per kind, words and service, seeded with the server's first
page (`initialData`, so it asks nothing at hydration); «Εμφάνιση περισσότερων» asks the next page at the press (D-103).
Its suggestions are their own query per words, asked after 250 ms of quiet (`useDebouncedValue`, the application's
value) and never for the words already searched (a page with `?q=`, an Enter: D-103); they show only for the words now
in the field (the application's `isVisible`: none while typing or loading), and the panel never says «none» before its
words' answer. The FAQ is read once per page: the search, the topic and the anchor live in the address (`?q=`,
`?topic=`, `#…`); from 744 the field suggests, below 744 it filters as typed, the words written into the address after
250 ms (the application's). A failed read is «Δοκιμάστε ξανά» (`invalidateAll` for a route's read, `refetch` for a
query), U-61.2.

## The search «Τι / Πού / Πότε» (wave 1.0, D2)

`$modules/search-doctors/ui/search-criteria` is the application's `search-criteria-modal` on the web (S-01.6, the
same logic): `CriteriaState` (`hooks/use-state.svelte.ts`, the application's `useCriteriaModalState`) holds
the open card, the typing page, the criteria (`$state.raw`, replaced whole), the typed words and «Κοντά μου» with
its search that waits for the position (S-32.2, the 10″ of S-34.3 in `$shared/lib/location`, the browser's
Geolocation API). ONE state drives the phone's window of cards (`surface: 'sheet'`) and the big bar's panel from
744 (`'bar'`), so a resize never loses a choice; U-23.2 makes a choice open the next card («Τι» ⇒ «Πού» ⇒ «Πότε»).
`CriteriaLists` (`use-lists.svelte.ts`) runs the application's reads as TanStack queries
(`api/marketplace/suggestions.ts`: the same keys, limits, windows): each starts the moment its list shows (D-103,
never after a motion) — the ready «Πού» rows (S-18.8) the moment the search OPENS, with «Τι» still open (D3, app =
web), so «Πού» reads them from the cache — the typeahead from 3 letters after 500 ms of quiet (`$shared/lib/debounce`, the
application's `useDebouncedValue` with `active`: a list opens on its words at once, as the application's newly
mounted one); the states are `readQueryState`'s (a read paused without a network is the error with «Δοκιμάστε
ξανά», never «no results»). `useCriteriaBar` gives `SearchBar` its segments on the same state. The home and the
results create the three through `useCriteriaWiring` (`hooks/use-wiring.svelte.ts`, MINOR-6 of U-29: a search closes
the window and lifts the bar first); the home sends a search to `/doctors?…` with the application's names
(`searchResultsHref`, through `resolve()`);
a doctor row opens its page. The home keeps what it gathered across opens (the application's: no
`initialCriteria`); the results page (D3) passes its criteria (`readSearchDoctorsCriteria` of its URL) as
`initialCriteria`.

🔴 S-07.3 rule 11 on the web (a declared platform difference, 29/10): the results ADDRESS never carries the
device's coordinates — «Κοντά μου» rides as `whereKind=current-location` + `whereLabel`, and an old link's
`whereLat`/`whereLng` are ignored (`searchResultsParamKeys`). The position just read lives only in the tab's memory,
`$shared/state/device-location` (`rememberDeviceLocation`, `readFreshDeviceLocation`, written only in
the browser; no storage, no cookie, gone with a reload), the application's store on the web. The results page takes
it from there, or asks the device (a shared link opens «Κοντά μου» with the receiver's own position). A browser's
position request may never answer (its prompt is not modal), so an open or a close of the search lets the read go
(«S-32.2 (web)»: the «Πού» rows work again, the late answer writes nothing).

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
edoctor.<appEnv>.consent.v1
edoctor.<appEnv>.consent-recorded.v1
edoctor.<appEnv>.helpful.v1
edoctor.<appEnv>.favorite-pending.v1
```

The consent key keeps the visitor's tracking decision (`$shared/storage/consent-storage`, the application's
`ConsentSnapshot`: the registry version and one boolean per tool, sanitized on read). The card does not show again
while the stored decision covers the registry's web tools. Once a session exists the decision also reaches the
server's append-only record (`POST /consent/record`, `platform: 'web'`): one request per change of it, within a version
too, none per load, marked done in `consent-recorded` (the version and the choice, forgotten when the account leaves),
and never for a guest. The registry is checked at the boundary (`mapConsentRegistryToFacts`, the application's: a tool
without an id, a known category, a platform or both languages is dropped; no usable version ⇒ the bundled
registry), and a version that changed only essential tools is reconciled into the stored decision silently
(`resolveConsentPrompt`).

The helpful key (U-78.1 Ε2) keeps the device's random voter UUID the server gave at its first vote, sent in the
`X-Helpful-Voter` header and never in an address; it names no person. The favorite-pending key lives in the tab's
`sessionStorage`: the doctor id a guest's heart asked for, while a provider's redirect runs, and it runs once (U-80.1 Ε4).
It goes when the visitor leaves the sign-in unfinished: `Session.cancelSignIn` tells the auth host, whose
`onSignInAbandoned` the site's composition (`src/routes/+layout.svelte`) points at the favourites, so the auth module never
names them. The words of the favourites' search are never stored (U-65.6).

The known-account key (`edoctor.<appEnv>.known-account.v1`, «Καλωσορίσατε και πάλι») holds a first name, a mask and the
door used, never an address. After a provider's redirect the browser has seen no answer of its own: the way back carries
the door (`/login?via=google|apple`, a closed list) and the confirming read `GET /patient/me` the rest; `getPatientSelf`
keeps only the mask of its `loginEmail`, and a `null` read (no patient's profile yet) writes nothing.

- Sanitize payloads during hydration.
- When the browser blocks storage (all cookies blocked, storage disabled), reads fall back to the system preferences and writes are skipped without an error, so the theme still switches and stays until the next full page load.
- Do not persist TanStack Query data, auth sessions, or large business payloads in preferences.

## Dependency policy

Do not introduce another global state manager unless a concrete requirement proves that Svelte runes plus TanStack Query are insufficient.
