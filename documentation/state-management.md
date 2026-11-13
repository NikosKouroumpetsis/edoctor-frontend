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
  `takeResumed`), for a `/login?next=&do=` or a provider's redirect. 🔴 D-W3-37: an action that WRITES when it goes on
  (`'doctor'`: «Ξεκινήστε» starts a sign-up) goes on only from the return this tab wrote before it left for a provider
  (`readResumedAction`, `auth/lib/return-path`), never from an address alone, which anyone can send; the others only
  show again what was asked (a toast, a window, a heart the tab keeps). A provider is left for without asking its start
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
- `Session.forgotten` grows at a sign-out, at a sign-out in another tab of the browser (D-W3-37, below) and when another
  account comes into the tab (the auth host compares
  `tenantUserId`, or `doctorId` from the doctor's read it makes anyway, for an account with no patient's profile): the
  drafts go with it. `Session.expire(request)`, a write refused with `401`: the page learns that it
  knows nobody, the personal reads go, the sign-in opens; the draft stays, so the same person finds it. A provider's redirect
  reloads the page, and memory with it: there the words are lost, and that is the rule, not a slip.
- 🔴 D-W4-78 · `Session.expired` is `true` from that `expire` until the sign-in it opened closes (`completeSignIn`,
  `cancelSignIn`) and falls at once with `forgotten` (a sign-out here or in another tab, another account). A page whose
  FORM stands on a personal read (screens 52 / 53 on the appointment, screen 55 on the relative) keeps that read through
  it with `useKeptThroughExpiry` (`$modules/appointments/ui/memory`): the form stays mounted under the sign-in with what
  was typed, and for the same person after it until their own read is back. It is the ONE place that KEEPS by `expired`
  (`tests/architecture/appointment-structure.test.ts`); its limits are tested one by one: a guest who opens the address
  (nothing kept), a sign-out by hand or another account (gone at once), the sign-in closed (a guest's page), an account
  with no patient, another address. A page that keeps its form mounted on its own (screen 54) needs none of it.
- 🔴 U-153 · the browser's back/forward cache puts a page back exactly as it was left (`pageshow` with `persisted`), so a
  page left with an ended session would come back with the form under its sign-in. The auth host (`auth/ui/host`) — the
  ONE listener, beside the other tab's — leaves it as «×» does (`close` ⇒ `cancelSignIn`): a guest's page, the kept form
  gone. Only while nobody is signed in: a page put back with no ended session, or with the same person already signed in
  again, does not change. It is the one other read of `expired`, and only to end it (same guard).
- U-153 · `AppointmentsMemory.takeFresh(id)` (`$modules/appointments/ui/memory`) is true ONCE per write (`remember`,
  `rememberCanceled`): back on the appointment the page starts at its top, so the notice is in sight on a phone
  (`useAppointmentsPages`). A save leaves through the history (`history.go`), and the router puts the entry's old scroll
  back; `afterNavigate` runs after that (an effect runs before it and would be undone). A later return with nothing new
  written keeps its place. No rune: nothing is drawn from the mark.
- `InboxBadge` (`$shared/state/inbox-badge`, one per page tree, in context): the messages module's `unread-host` reads, the
  frame draws, and neither imports the other (the pattern of `Session`).
- «Επικοινωνήστε με τον γιατρό» asks the server nothing to be drawn: only its press does (D-103). The state of the #18 lives at
  the screen, so a member's new read of the profile beneath it touches nothing.

## The booking (wave 3, screens 30 + 31, U-102 – U-105)

- 🔴 U-112.2: `BookingDraft` (`$modules/appointments/ui/booking-draft`, one per page tree, in context; its host is in the
  root layout inside the `AuthHost`, around the frame) is what the person chose and wrote while the booking lasts: the
  doctor (`doctorSlug`), the hour, the service, who the visit is for (and a relative being added), the first-visit answer,
  the note, the mobile's MASK only (`phoneDestination`) and when the code may be asked again. Never a storage, a cookie, a
  log or an address (`tests/architecture/drafts-privacy.test.ts`); another doctor ⇒ a new draft; `forgotten` ⇒ `forget()`;
  `expire` (a `401`) keeps it; the 31 ⇒ `forget()`.
- `enter(slug, hints, 'review' | 'change')`, by screen: the 30 takes the address's hints (`office`, `date`, `time`,
  `service`, the closed list of `lib/booking/url`) only for hints it never agreed to (a new hour from the profile); a
  change screen never lets its address speak for the same doctor (back, forward, a reload ⇒ the draft speaks).
- 🔴 D-W3-31 (SvelteKit's shallow routing keeps `page.url` the page that was drawn): the address changes only by a real
  navigation, `goto(…, { replaceState: true, noScroll: true, keepFocus: true, state: page.state })`, never a shallow
  `pushState` / `replaceState`, and never before the router has started; the 30's address follows the draft that way.
- `page.state.booking.depth`: a change screen opened from the 30 knows how many entries lie behind it and leaves by
  `history.go(-depth)`, else `goto(30, { replaceState: true })`; after a reload `readHistoryDepth` (`$shared/lib/navigation`)
  reads it from `history.state['sveltekit:states']`. `page.state.siteBack` is set by the profile's «Κράτηση»: the 30's «×»
  is `history.back()` only with it, else its link.
- `kept`: the profile's screens compose the booking's draft (a module never imports another), so the «back» from the 30
  finds the hour, the service and the office on the profile's card — no request, no change of address.
- Reads (`GET /patient/me`, the readiness, an appointment) are TanStack's, `personalQueryMeta`; every `setQueryData` is
  preceded by `setQueryDefaults(…, { meta: personalQueryMeta })`. The 31 takes the 30's place in the history and reads its
  appointment and readiness again after a reload.

## The doctor's sign-up (wave 3, screens 33–42, U-107 – U-113)

- 🔴 U-112.2: the server's progress (`GET /doctor/onboarding`, `no-store`) lives in TanStack (`personalQueryMeta`, the
  browser only); `OnboardingDraft` (`$modules/doctor-onboarding/ui/draft-host`, one per page tree, in context, in the root
  layout) holds ONLY what the doctor changed and the server does not have yet — an overlay, never a copy: a field reads
  `draft.read(section, field, progress…)` («edits ?? progress»). Every «Επόμενο» writes its step; the write answers with
  the progress, written into the cache (marked first), and `draft.clear(section, fields)` drops that step's edits. A
  reload reads the progress again; only the current screen's unsaved words are lost. `forgotten` ⇒ `forget()`; `expire`
  keeps it; `complete` ⇒ `forget()`. 🔴 D-W3-33: the Places `pointProof` lives in the draft only.
- The controller (`ui/steps/hooks/use-step.svelte.ts`, the application's `useDoctorOnboardingStep`): one write at a time,
  gated by the write in flight itself (`writing`), never by the mutation's `isPending`, which TanStack updates a timer
  later (it would refuse 42's `complete` after its `activation-intent`, 41's one retry); `states` (where a page is open) may
  be a function (42 while it completes); «Αποθήκευση και έξοδος» pressed while «Επόμενο» saves waits for that write and
  leaves after it, and is locked while a write is out or the page's own chain runs (`next.loading`: 42's two writes,
  41's version read between its two; review w3-w6 R1 NIT-1). The guard sends a visitor who came as a guest, a sign-out or another account here (`forgotten`) or a
  sign-up not open to the overview, and a page beyond the progress to its first missing step; an `expire` stays.
- D-W3-31 as in the booking: `goto(…, { replaceState?, state: { onboarding: { depth } } })` and `history.back()` only; the
  depth survives a reload (`readHistoryDepth`).
- The address search's session token lives in its hook's closure (D-W3-02), never the draft; the suggestions are never
  asked again for the same words (`staleTime: Infinity`, no focus, no reconnect) and leave the cache with the screen.
- 🔴 D-W3-37: the overview's «Ξεκινήστε» starts a sign-up on a press, or after a sign-in this tab asked for — never from an
  address (`/login?do=doctor`, the session above).

## The patient's appointments (wave 4.0, screens 50–53)

- TanStack Query owns every read of `$modules/appointments/api`, each one `personalQueryMeta`: the list's infinite read
  per tab, one appointment (`404` and `403` read alike: not found), and the doctors of the page — ONE public profile per
  different doctor (`doctorPublicProfileQuery`, anonymous, but personal: which doctors a person sees is a fact of their
  health, D-W4-29). They run for a member in the browser only (U-80.1 Ε6); the list is read where it shows (its own
  address; from 950 beside an appointment once that one told its tab), never under an appointment below 950 (D-103).
  From 950, once shown, it stays read on the tab it last showed while the next appointment is read (P-W4 §3.6), and a
  list shown but not yet read is its wait (`useAppointmentsList`'s `waiting`).
- These rules have ONE home in the module, `useAppointmentsPages` (`$modules/appointments/ui/list`, contract «Screens
  compose; feature behavior … live in modules»): who reads, the appointment on the right (`useAppointmentDetail`) or
  the rating's invitation and its visit, the list's tab, when the list is read (`listSeen`), 🔴 U-139.1 `paneEmpty`,
  the page's memory's lifetime, the sign-in opened once for a guest of screen 54. The two screens
  (`appointments/[...path]`, `ratings/[invitationId]`) call it once and only join the other modules to it (the doctors'
  profiles, the contact of screen 18, «Η κριτική σας», the picker of «Αλλαγή ώρας»): no `$state` and no `$effect` in a
  screen's page for a rule of the feature.
- An appointment's tab is the appointment's own (`appointmentTabOf`: closed, or begun ⇒ «Ιστορικό»), never the
  address's; until it is read the page keeps the tab it last showed (U-137.6: after a cancellation the list moves by
  itself).
- 🔴 D-W4-33: what was just saved on an appointment — the old hour, the new visitor, the note, the rating, the patient's
  own cancellation — lives in `AppointmentsMemory` (`$modules/appointments/ui/memory`, one per page tree, in context,
  set by the module's root host `BookingDraftHost`), never in the address (the browser keeps an address in its history,
  its links and its referrers): said in green on its own appointment, gone once another opens, when the pages are left,
  at a reload and at a sign-out or another account (`Session.forgotten`). The application keeps it in the route's
  parameters (P-A4 Σ10): a difference of the platform, the same look. Screen 52's «Προσθήκη συγγενή» keeps there too the
  relative just added (`choose` / `chosenFor`: an id, never a name), chosen on «Για ποιον…» of its appointment until
  «Αποθήκευση» or «Άκυρο» (a save or a cancellation of that appointment lets it go, review w4-w5 R1 MINOR-2).
- Screens 52 and 53 are real navigations (D-W3-31, never shallow): opened from the 51 one step on
  (`page.state.appointment.depth` 1, 2 from «Θέλετε απλώς άλλη ώρα;» or «Προσθήκη συγγενή»); «‹», «Άκυρο» and a save go
  back exactly those steps (`useAppointmentSteps`, once per screen), else replace the screen with its appointment. A
  write's answer becomes the appointment's page at once (`storeAppointmentDetail`: under the sign-out's mark, every list
  read again). 🔴 D-W4-37: a refusal never takes the patient back in silence — one that names nothing (a `403` / `404`
  with no code, the `409` «changed concurrently», an unknown code) keeps the screen and what was chosen or written, with
  «Η αλλαγή δεν αποθηκεύτηκε…» (D-W4-35) or the 53's «Η ακύρωση δεν ολοκληρώθηκε…»; a refusal with its code says its own
  words; and every answer but the session reads the appointment again (`changeRefusalRereads`, the 53's `onReread`),
  so the 51 never offers what was refused and a screen no longer allowed gives way to it by its own guard (the 53 to
  its deadline's view when that is why). A relative deleted meanwhile keeps «Για ποιον…» and reads the relatives again.
  What a FORM holds while open is the shared `createForm`'s (`$shared/lib/form`, the contract's «Form state»), its
  fields connected with `form.field(name)` and its rules in `lib/`: screen 53's reason and words (`cancelFormRules`),
  screen 52's note (`bookingNoteRule`), screen 54's five aspects and words (`ratingFormRules`, `ratingFormMessages`).
  The bounds stay the lib's (500 / 2000 in UTF-16 units, no `<` `>` in a review): the field cuts a paste at its bound
  before the form sees more (`clamp…`), the rule is the form's second lock, and what travels is still the lib's body
  (`toCancelRequest`, `toNoteChangeRequest`, `toRatingSubmitRequest`). A choice that is no form — the hour the picker
  staged, the person of «Για ποιον…» — is a rune of its screen. All of it goes with the screen.
- Screen 54 (`/ratings/<invitationId>`) keeps its five values and its words in that form; one press sends once (a flag
  set before the mutation's state catches up). A submit goes back to the visit the way the 52 / 53 do
  (`useAppointmentSteps`: the steps opened, else the visit in the form's place), says «Η κριτική υποβλήθηκε.» from
  the page's memory (`{ kind: 'rating' }`), writes the server's review under its `ratingId` (under the sign-out's mark)
  and reads every appointment again — the visit now names its `ratingId` and no invitation. A `401` opens the sign-in
  over the form and keeps the stars and the words. «Η κριτική σας» on the 51 is read by that `ratingId` only
  (`ownReviewQuery`, personal).

## The account's settings (wave 4.5, screens 57 + 61)

- Which row of «Γλώσσα και θέμα» is open is rune state of the slice (`profile/ui/language/hooks/use-preferences`):
  one at a time, gone with the page. The address says which SECTION is open, never which row.
- The theme is the shared preference (`$shared/preferences/theme`, `system | light | dark`, the device's storage): the
  screen only calls `theme.set`. The language is the address (`/` Greek, `/en` English): a choice navigates to the same
  path in the other language, and the message that says so is shown once the navigation has ended, in the new language.
  🔴 D-W45-57 β: that navigation draws no new document, so `<html lang dir>` (the server's, `hooks.server.ts`) follows
  the page's language in ONE place — the frame's effect on `followPageLocale` (`$shared/preferences/i18n/document-locale`);
  no page writes it.
- 🔴 D-W45-06 / U-169: the account's message language is server state — `accountLocaleQuery` (personal: a sign-out
  removes it), whose cache holds `{ locale }` and NOTHING else of `GET /user/me`. It is read when the section opens for
  a member; a choice writes `PUT /user/me` `{ locale }` only when the stored one differs, sets the cache to what was
  written, and never holds the page: a refusal, an outage or three seconds without an answer and the language changes
  all the same (it is the device's), to be tried again at the next change. A guest's choice asks the server nothing.
- Who reads the shell — and the «Προφίλ» page, and «Απόρρητο» — comes from the session (`profile/lib/viewer`
  `profileViewerOf`): `waiting` until the browser has asked (a skeleton, never a guest's page that changes a moment
  later), a guest when the read got no answer.

## The «Προφίλ» page, «Απόρρητο» and the deletion (wave 4.5, screens 56 + 62)

- 🔴 U-168 / D-W45-10: the session's read (`auth/api/session`, `GET /patient/me`) keeps the name and the sign-in
  address and mobile ONLY as the server's masks (`loginEmailMasked`, `loginPhoneMasked`; a value that is no mask is no
  value). `SessionMember` carries them to the pages (`lastName`, `maskedLoginEmail`, `maskedLoginPhone`); nothing on
  the web hides an address itself, and no whole one is ever in a cache, a rune or a storage.
- 🔴 The tracking decision is ONE per page tree: `$shared/state/consent` `ConsentDecision` (context, set by the
  frame), read from the browser's own storage once and shared by the cookie card, its window, the page «Εργαλεία
  τρίτων και cookies» and the row of «Απόρρητο» — what one surface saves the others show at once, and a member's
  choice reaches the server's record once whichever surface made it (`use-consent-record`). The catalogue is one cache
  entry (`['consent','registry']`, anonymous); the row asks for it only on its own page.
- «Διαγραφή λογαριασμού» (`account/ui/deletion-flow` `useAccountDeletion`, made by the screen): the preview is server
  state — `deletionPreviewQuery`, personal, `gcTime` 0, asked again each time, for a member only. The hand-off
  between the two steps (where the code went, when) is rune state of that one hook and NOTHING else: 🔴 U-65.6 never
  an address, a storage or a log, so a reload forgets it and the code step returns to step 1; a sign-out or another
  account in the tab forgets it too (`session.forgotten`). Each press is one request (send, confirm, resend). A
  confirm with no readable answer keeps the code and says so; after one, the session gate's refusal is the deletion.
- The end: `session.accountDeleted()` — the source's `deleted` (`auth/ui/host`) makes the tab a guest's with no request
  (the confirm cleared the cookies), drops every personal read and every write's body, forgets «Καλωσορίσατε» on the
  device (`forgetKnownAccount`) and tells the other tabs; the screen shows the end until its address is left.

## «Προσωπικά στοιχεία» (wave 4.5, screen 58) and the relative's form

- Who the page reads: the SESSION's own facts of the person (`SessionMember`: the names and the server's masks —
  `maskedLoginEmail`, `maskedLoginPhone` and, since this screen, `maskedAmka`, `maskedAfm`) and ONE read of its own,
  `profile/api/user` `accountPersonQuery` (`['profile','account-person']`, personal: the gender and the day of birth
  of `GET /user/me`, nothing else of the profile — U-169). The page keeps no copy of either.
- 🔴 U-168 · where a typed value lives: ONLY in the rune state of the open row's own form (and, for a challenge, of
  `use-code-challenge`: the code and where it went) and in the body of its ONE request. A row's form is mounted while
  the row is open, so «Ακύρωση», Escape, a save or a session's end destroy it. The email, the mobile, the ΑΜΚΑ and
  the ΑΦΜ open EMPTY. Nothing typed is written to a query, a mutation's cache (the writes are plain calls, not
  TanStack mutations), a storage, an address, a history entry or a log; every answer of a write stays in `api/`.
- After a change: `ports.refresh()` (the screen's) invalidates the appointments' reads and awaits
  `session.retryRead()` — it now resolves once the confirming read is back, and never rejects — while the page
  invalidates its own `accountPersonQuery`; only then does the row close, on what the SERVER holds. After a change
  of the sign-in email the verify's own mask is written to the session's read at once (`auth/api/login-email`
  `keepLoginEmailMask`), and the device's «Καλωσορίσατε ξανά» memory takes that mask when it greets by an email
  (`auth/lib/known-account` `renameKnownAccountEmail`) — never the address.
- A session that ended on a write (`EC401`) is `session.expire()`: the shell becomes a guest's and the page — with
  whatever was typed — is destroyed under the sign-in.
- The relative's form (D-W45-14): `RelativeFacts` carries `amkaMasked` / `afmMasked`, never a number; the lists'
  cache after a new relative holds no ΑΜΚΑ / ΑΦΜ at all until the read that follows brings the server's masks. Which
  numbers «Αφαίρεση» was pressed for is rune state of the form (`removed`), gone with it.

## «Σύνδεση και ασφάλεια» (wave 4.5, screen 59)

- Two reads, both the `auth` module's and both personal (`personalQueryMeta`: a sign-out removes them):
  `signInMethodsQuery` (`['auth','sign-in-methods']`: two booleans about the password — never the password — and the
  linked providers, each with whether it may be unlinked) and `accountSessionsQuery` (`['auth','account-sessions']`:
  each device's id, whether it is this one, the instant it was last active and its three words; a word outside a
  vocabulary is kept as `OTHER`, an id that is not the server's is no entry). An answer the page cannot read is a
  failed read, never a default. Each part of the page waits and fails on its own read. The sign-in address of the
  code's line is the SESSION's own fact (`SessionMember.maskedLoginEmail`, the server's mask) — or no address.
- 🔴 U-168 · where a password or a code lives: ONLY in the rune state of the open row's own form (`change-form`,
  `code-form`) and in the body of its ONE request. The form is mounted while the row is open, so «Ακύρωση», Escape,
  «Ξέχασα τον κωδικό μου» (the change's fields go), a kept change and a session's end destroy it. Nothing typed is
  written to a query, a mutation's cache (the writes are plain calls, not TanStack mutations), a storage, an
  address, a history entry or a log; every answer of a write stays in `api/`. `hooks/use-password-code` keeps only
  WHEN the next code may be asked for.
- After the password changed or was set BOTH reads are invalidated and awaited (every other device was signed out);
  only then does the row close. After a provider was unlinked the sign-in methods are read again; after a device was
  signed out, the devices. A `404` of either press (linked no more, signed in no more) is a stale page: the read is
  asked again, with no word of failure.
- Which row is open, which provider the window asks about, which refusal a row shows and which device's press is out
  are rune state of the slice, gone with it; the address says the section alone — never a step, a provider or a
  session's id.
- A session that ended on a write (`EC401` alone) is `session.expire()`: the shell becomes a guest's and the page —
  with whatever was typed — is destroyed under the sign-in.

## The notification centre (wave 4.5, screen 60 · the inbox's «Ρυθμίσεις μηνυμάτων»)

- 🔴 ONE place in the cache for the whole site: `notificationPreferencesKey` (`$shared/lib/notification-preferences`),
  holding the server's answer of `GET /notification/preferences/me` as it came, personal (`personalQueryMeta`: a
  sign-out removes it). Two modules read it, each its own facts through `select` in its own `api/`:
  `notifications/api/preferences` (`notificationPreferencesQuery`: the sides, kinds and cells, a word the contract does
  not name left out) and `messages/api/preferences` (`messagePreferencesQuery`: the two switches of the messages). The
  ONE write is `saveNotificationPreferences(client, cells)`: the `PUT`, and the answer put back under the same key —
  so a switch flipped on either page is the other's at once. No module keeps a copy of the centre.
- Screen 60's switches (🔴 D-W45-24, `notifications/ui/settings/hooks/use-preferences`): a press is one write of one
  cell. The page draws the read with the reader's own presses laid over it (`applyNotificationChanges`) — rune state
  that holds, a cell, the change and how many of its writes are still out, never the server's answer. A write that
  comes back takes its press off (the cache already holds the answer); a refused one takes it off too — the switch is
  back where the server keeps it — and the page says «Η αλλαγή δεν αποθηκεύτηκε. Δοκιμάστε ξανά.» in passing. A `401`
  also ends the session (`session.expire`, U-84). Presses on two switches never undo each other, whichever answers first.
- The inbox's two switches move in the cache itself at the press (`previewNotificationPreferences`, which answers the
  way back for a refusal): its sheet shows nothing but those two.
- Which kind's window is open is rune state of the page, gone with it; the address says the section, never the kind.

## The list of notifications (wave 4.5, screen 63)

- 🔴 D-W45-17 · D-W45-49: «how many are new» has ONE place in the cache, `notificationInboxKeys.unread()`
  (`['notifications','inbox','unread']`, `notifications/api/inbox`), personal. Its one standing reader is the root
  layout's `notifications/ui/unread-host`: enabled for a member in the browser only (a guest and a session not known
  yet ask nothing), on NO timer, asked again whenever the page comes back to the front
  (`refetchOnWindowFocus: 'always'`). It gives the count to the page tree as `NotificationBadge`
  (`$shared/state/notification-badge`, context, the `InboxBadge` pattern): the frame's menu row and pill dot and the
  «Προφίλ»'s bell draw it and import nothing of the module. Every other source of the number WRITES into the same
  place (`keepUnreadNotificationCount`): each page of the list (its `unreadCount`) and the answer of each «read» —
  never a second request. It stands beside the messages' `InboxBadge` and never in its place.
- The list is an infinite read per choice and language (`notificationInboxQuery(filter, lang)`,
  `['notifications','inbox','list', filter, lang]`), personal: the cache keeps the facts `api/inbox/map` made of the
  answer (the server's words as they came, a word out of the contract as none). «Εμφάνιση παλαιότερων» is
  `fetchNextPage`: the pages add up.
- The choice on screen is the ADDRESS's (`?filter=new|previous|all`, `notifications/lib/paths`), as «Ιστορικό» is the
  appointments'. With none in the address the page takes its own — «Νέες» while something is new, else «Όλες» —
  ONCE, when the count is first known (`use-inbox`: rune state of one word, `'new' | 'all' | null`, forgotten at a
  sign-out), so reading the last new line does not move the reader to another choice.
- 🔴 U-174 (Ε2 Β): a line is read only by a press. The press sends ONE `POST …/:id/read` at once and, before the
  answer, writes the caches (`previewNotificationRead`: the line leaves the «Νέες» lists, is read in the «Όλες» ones,
  the count drops by one; in-flight reads are cancelled first so none lands over it). Kept: the count is the
  answer's and the «Προηγούμενες» lists are invalidated (never guessed). Refused: the snapshot goes back and the
  lists and the count are asked again; a `401` also ends the session (`session.expire`, U-84); a `404` (a line that
  is no longer the account's) does NOT put the line back — only the lists and the count are asked again. «Σήμανση
  όλων ως διαβασμένων» is the same with `previewAllNotificationsRead`, and a refusal of it is also said in passing
  (the settings' «Η αλλαγή δεν αποθηκεύτηκε. Δοκιμάστε ξανά.»). Two writes that cross make the page ask for the
  count instead of trusting the last answer. The writes are plain calls, not TanStack mutations.
- The first wait draws no choices; once a choice has been on screen (`use-inbox` `shown`, rune state of one
  boolean, forgotten at a sign-out) another one still being read keeps the three choices over its wait.
- Nothing of the list is in a storage, a cookie or an address; a line's id is in the path of its own «read» alone.

## The session across tabs (wave 3, D-W3-37)

- The cookies are the API's, one jar for the browser: a sign-out in one tab ends the others too. The auth host announces a
  sign-out the server carried out on `openSignOutChannel` (`$shared/state/session`: a `BroadcastChannel`, the one word
  `signed-out`, never a fact of the person); every other tab answers as its own sign-out — the session read says «guest»,
  the personal reads go, `removeMutations` takes every write's body, `Session.signedOutElsewhere()` grows `forgotten`, so
  the drafts go.
- `removeMutations` (`$shared/query`) also runs at a sign-out here and when another account comes into the tab: what a
  write carried (a mobile, an ΑΜΚΑ, a note) never outlives its person in the client's memory.

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
