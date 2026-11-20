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
  messages' pages keep between them, as the application's tab stays mounted: the doctor's 🔍 open and its words (the
  chips it once kept went with U-182.3), and per conversation what has
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
- 🔴 U-182.3 (wave 5.1, screen 74, D-W51-77 / 85): each mode reads ONLY its own side, never both, never chips — the
  patient's `/messages` asks `side=patient`, the doctor's `/doctor/messages` (inside the doctor's frame) `side=doctor`;
  the badge counts the side of the page's mode (`$shared/lib/mode-side` `modeSideOfPath`, shared since screen 75 with the
  notifications' dots: the doctor's dashboard, the sign-up aside, reads the doctor's), each side a cache of its own (`messagesQueryKeys.unread(side)`; a write asks every side
  again, `unreads()`). «Δέχομαι νέες συνομιλίες» is the doctor's mode's only.
- The doctor's side (D-W51-79 / 80 / 86 / 87): under each patient's name the appointment it is about
  (`appointmentLine`, read at the boundary by `api/conversations` `mapAppointmentLine`, worded by `lib/appointment-line`
  with the shared «πότε» of `$shared/lib/appointment-when` `appointmentNearWhenLabel` / `appointmentNearDayLabel`),
  never «Ασθενής»; the name and the first row of ⋯ open the card of screen 73 (`patientId`, a server id only). 🔍 asks
  `q` (no control characters, ≤ 40, `lib/search` `readInboxSearchQuery`) after 500 ms of quiet; closed or emptied, the
  whole list at once. «Μήνυμα» of 68 / 73 opens the conversation, else `/doctor/messages/new?kind=account|relative&id=`
  (the screen reads the card of 73 and hands its facts to the slice, `InboxFreshPatient`): its first message is the
  doctor's start (`POST …/messaging/doctor/conversations`, the same id while the words stay the same), and the
  conversation replaces the address; a card that already names one replaces it at once.
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

- 🔴 D-W45-17 · D-W45-49: «how many are new» has ONE place in the cache per side (since screen 75, below),
  `notificationInboxKeys.unread(side)` (`['notifications','inbox', side, 'unread']`, `notifications/api/inbox`), personal. Its one standing reader is the root
  layout's `notifications/ui/unread-host`: enabled for a member in the browser only (a guest and a session not known
  yet ask nothing), on NO timer, asked again whenever the page comes back to the front
  (`refetchOnWindowFocus: 'always'`). It gives the count to the page tree as `NotificationBadge`
  (`$shared/state/notification-badge`, context, the `InboxBadge` pattern): the frame's menu row and pill dot and the
  «Προφίλ»'s bell draw it and import nothing of the module. Every other source of the number WRITES into the same
  place (`keepUnreadNotificationCount`): each page of the list (its `unreadCount`) and the answer of each «read» —
  never a second request. It stands beside the messages' `InboxBadge` and never in its place.
- The list is an infinite read per side, choice and language (`notificationInboxQuery(side, filter, lang)`,
  `['notifications','inbox', side, 'list', filter, lang]`), personal: the cache keeps the facts `api/inbox/map` made of the
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
- 🔴 Wave 5.1 · screen 75 (D-W51-81, D-W51-89 … 91): every read and write is of ONE side — `?side=patient` (screen 63,
  `/notifications`) or `?side=doctor` (screen 75, `/doctor/notifications`, inside the doctor's frame); the single
  «read» names none (the server knows the line's side). Each side has its own place in the cache, under
  `$shared/lib/notification-inbox` `notificationInboxSideKey(side)` (`['notifications','inbox', side]`): the count
  `notificationInboxKeys.unread(side)`, the lists `list(side, filter, lang)`; a press, «Σήμανση όλων» and their settling
  touch their side alone. The root layout's `unread-host` asks the side of the page's mode (`$shared/lib/mode-side`, the
  messages' rule), so the frame's ☰ dot and the bell of the doctor's «Μενού» are the doctor's, every other dot the
  patient's. 🔴 U-200.1 / D-W51-91: after each of the doctor's answers (66 / 68 «Επιβεβαίωση» and the outcome, 69, 70,
  «Υπηρεσίες και κόστος», 71) the `doctor-dashboard` hooks call `refreshNotificationInboxSide(client, 'doctor')` — the
  server read «Νέο αίτημα» / «Τι έγινε;» itself, so the dot goes out without a reload; the patient's side is never asked.
  A line of the doctor's opens his 68 one step on in the history (`links.open`, `page.state.doctorNotification`), so its
  «‹» comes back to the list.

## The doctor standing and the two modes (wave 5.1, screens 64 / 65 / 76)

- **One read, one write** (D-W51-10, D-W51-11): the `doctor-dashboard` module's `DoctorStandingHost`
  (`src/routes/+layout.svelte`, inside the session, above both frames) reads `GET /doctor/me/dashboard` for a member
  only (TanStack, `personalQueryMeta`, asked again when the page comes back to the front) and owns
  `PUT /doctor/me/dashboard/mode`. Every other part reads the shared `DoctorStanding`
  (`$shared/state/doctor-standing`, context): its `kind` — `none` · `pending` (a completed registration without a
  licence, U-183.5) · `doctor` (a licence of the marketplace, an expired one too, U-185.1) · `payments` (the till's alone:
  no doctor mode on the web in 5.1, D-W51-16) — the notice, the mode in force and the name card. None of the patient's
  frame, the «Προφίλ», the sign-up or the doctor's frame imports another module (the `NotificationBadge` way).
- **`nameLocked`** (D-W52-47 / D-W52-50, U-207.1): the same read says whether the doctor's first licence locked the
  account's name — the server's own `true`, whatever the kind (a revoked licence is `pending` and its name stays
  locked). `DoctorStanding.nameLocked` is `false` before the answer and for a guest: the server refuses such a write by
  itself (`409 DOCTOR_NAME_LOCKED`). «Προσωπικά στοιχεία» (58) reads it: the row «Ονοματεπώνυμο» has no «Επεξεργασία»;
  a lock that arrives while the row is open closes it; a `409` asks the standing again (`standing.retry()`).
- **The switch** (U-185.3): `standing.switchTo(mode)` draws the shared `ModeTransition` for about a second, keeps the
  mode on the server and opens that mode's page (`/doctor`, the home); a refusal moves nobody and the site's frame says
  so (`switchFailures`, the sign-out's way).
- **Before the first paint** (D-W51-19): the device remembers the kind and the mode only, versioned —
  `edoctor.<appEnv>.doctor-mode.v1` — written from the answer, forgotten when the page knows nobody (a sign-out, an
  ended or deleted account). `app.html` reads it before the first paint: a licence of the marketplace marks
  `<html data-doctor-mode="doctor">` (the bar's «Για γιατρούς / Λειτουργία γιατρού» share one cell and the CSS variant
  `doctor-mode:` shows the right one, so nothing changes under the eye, U-100), and the bare home of one who left in the
  doctor's mode opens `/doctor`. After a sign-in the host makes the same decision on the home, once.
- **The doctor's frame** is a route group of its own (`src/routes/doctor/(dashboard)/+layout.svelte`): the patient's
  frame draws no bar, capsule or footer on `/doctor` and `/doctor/menu`, and the group's gate waits for the answer —
  a guest signs in, anyone without a marketplace licence goes home. Every page of the group is named in the closed
  list `site-frame/lib/frame` `DOCTOR_DASHBOARD_PAGES` (since wave 5.2 `/doctor/profile` and `/doctor/profile/preview`
  too): a path that is not there draws the patient's bar over the doctor's.

## The doctor's «Σήμερα» (wave 5.1, screen 66)

- **The reads** (D-W51-22): `modules/doctor-dashboard/api/appointments` — ALWAYS `as=doctor` — the requests
  (`status=pending`), yesterday-and-today of the server's clock (`from` yesterday 00:00 Athens, `to` the last millisecond
  of today: the server keeps both ends) and «from tomorrow» (`scope=upcoming`), each read to its end (100 a page, ten
  pages at most), under `doctorDashboardQueryKeys.appointments()`; `api/readiness` only when there is no appointment at
  all. All personal (`personalQueryMeta`). `lib/today` splits them into the groups, each appointment once.
- **Fresh** (D-W51-24): every read asks again every 60″ while the page shows (`refetchInterval`, never in the background)
  and at once when it comes back (`refetchOnWindowFocus: 'always'`); a `401` / `403` / `404` stops the asking.
- **«Now»** is the server's (`readServerNow`), drawn again every minute, at the platform's midnight (the day's window
  moves) and at the earliest deadline of a request (D-W51-23: the card goes, the toast says «Το αίτημα έληξε»).
- **One tap** (D-W51-25): «Επιβεβαίωση» / «Δεν ήρθε» / «Ολοκληρώθηκε» write at once; the card's buttons wait until the
  lists are read again; `409` reads them again (the request gone ⇒ «Το αίτημα έληξε»), `401` ends the session
  (`Session.expire`), anything else says «Κάτι πήγε στραβά. Δοκιμάστε ξανά.». The toast is the site frame's
  `ToastState` (the frame wraps the doctor's routes too).
- 🔴 The hook reads every query result's `data` and `isError` on every pass, never behind a `&&`: the library tells a
  result only the properties it saw read, so a read skipped once would never learn that its answer arrived.
- **The desk** (card w51-w3): the clocks and the one-tap answers live in ONE hook, `ui/card` `useDoctorDesk`, with the
  card itself; «Σήμερα» and «Ραντεβού» (screen 67) both use it — never a copy of the mutation.

## The doctor's «Ραντεβού» (wave 5.1, screen 67)

- **The address** (D-W51-31): `/doctor/appointments` under the doctor's frame (`«Σήμερα»` stays the current tab,
  `isDoctorTodayTab`), `?tab=requests|upcoming|history` (any other word «Επερχόμενα»), `?office=<id>` (any other value
  every office); `/<id>` (a server id, one level) is screen 68 with the same pill and office; anything else a 404. The
  pills are links that keep both.
- **Screen 68 beside it** (D-W51-36): the list stands on the shared `SplitView` with `from="laptop"`: from 1128 the
  list of 460 and the appointment in the middle of the rest, the first card of the pill opened in place
  (`goto(…, { replaceState, noScroll, keepFocus })`, screen 50's way) and the open one dark-bordered; below 1128 a card
  opens the 68 as a page of its own, with «‹» back to the list. The screen composes the two slices (`pane`).
- **The reads** (D-W51-29), ALWAYS `as=doctor`, each only while its pill shows: «Αιτήματα» (`status=pending`, to the
  end; its number is on its pill on every pill, so it is always read), «Επερχόμενα» (`scope=today`, the still-ahead
  kept by `lib/appointments`, + `scope=upcoming`), «Ιστορικό» (`scope=history&sortDir=desc`, an infinite query, 20 a
  page, the closed ones only — the open of the days before are «Τι έγινε» of screen 66). With no office «Αιτήματα» and
  «Επερχόμενα» share «Σήμερα»'s cache keys; one office has keys of its own (`requests(officeId)` …, whose prefix is
  `requests()`, so a write still invalidates them all).
- **The office filter**: `api/offices` (`GET /doctor/profile/offices`, the id and the street per language only); shown
  only with more than one office; an office of the address that is not the doctor's reads every office; with an office
  in the address the lists wait for that answer. A choice is `goto(…, { replaceState: true })`.
- **The next page**: `$shared/lib/near-end` on a node drawn again after each page (`{#key}`), so a page whose closed
  rows are few still asks for the next; a first page with none at all reads the next at once, never «nothing».

## The doctor's «Το ραντεβού» (wave 5.1, screen 68)

- **The read** (D-W51-38): `doctorAppointmentQuery(id)` (`GET /appointment/appointments/{id}`, the side the
  appointment's own) under `doctorDashboardQueryKeys.detail(id)` — beside the lists' root, not under it. Personal
  (`personalQueryMeta`): the WHOLE ΑΜΚΑ / ΑΦΜ / mobile / email (🔴 U-182.7) live in this cache only and go at a
  sign-out; the lists' facts keep the names alone. A `403` and a `404` read the same «Δεν βρήκαμε αυτό το ραντεβού».
- **The writes** (D-W51-25, the desk of `ui/card`, the same mutation as 66 and 67): every write's answer IS the
  appointment's detail, so `onSuccess` puts it in `detail(id)` as it came (never read twice for one tap) and
  invalidates the lists alone; a `409` / refusal invalidates the detail too. `doneOf(id)` remembers this page's last
  answer for the green card («Γράφτηκε «Ολοκληρώθηκε».»), the page's memory, never the address.
- **Its clocks**: the desk's minute and midnight; at a request's deadline and at the end of a correction window the
  detail is read again (D-W51-23, D-W51-61).

## The doctor's refusal and cancellation (wave 5.1, screen 69)

- **The address** (D-W51-46): `/doctor/appointments/<id>/reject|cancel` — the same route as 67 / 68
  (`readDoctorAppointmentsAddress`: `step` `'reject' | 'cancel'`, only those two words, else a 404), with the list's
  `?tab=&office=`. From 1128 it stands in the 68's place beside the list (the card stays chosen); below 1128 alone;
  below 744 over the tabs (the frame hides the capsule, `isDoctorAppointmentStepPage`).
- **Opened** (D-W51-49) from the 68 («Απόρριψη» of a request, «Ακύρωση ραντεβού» of a kept one with `canCancel`) as
  one more step of the history (`useHistorySteps('doctorAppointment')`, depth 1), and from the cards of 66 / 67 as a
  plain link. «‹», «Να μείνει» and the done action go back that step, else replace with the 68 (same pill and office).
- **The read**: the 68's `doctorAppointmentQuery(id)` (the same cache; `staleTime` 0, so the opening reads the
  server's `actions` again). The form only while they allow the step (`doctorReasonEntry`: `canReject`; `canCancel`
  and not a request), else «δεν γίνεται πια» with one way back.
- **The write** (`ui/reason` hook, D-W51-48): `POST …/reject` `{ reasonCode, message? }` or `POST …/cancel`
  `{ reasonCode, reasonText? }` — the reason of the server's list (`DOCTOR_REJECT_REASONS` / `DOCTOR_CANCEL_REASONS`),
  the words trimmed, left out when blank, cut at `DOCTOR_REASON_TEXT_MAX_LENGTH` (500, the contract's `maxLength`,
  guarded by `tests/architecture/appointment-rules.test.ts`). Success: the answer goes in `detail(id)` as it came, the
  lists (`appointments()`) are invalidated, the toast, back to the 68 (its «από εσάς» block). `409`: its words, the
  detail and the lists read again (the closed view follows); `422` / a lost request / `429`: its words, the form
  stays; `401`: the sign-in. One press: refused while one is on its way and once the server took it.

## The doctor's «Αλλαγή ώρας» and «Υπηρεσίες και κόστος» (wave 5.1, screen 70)

- **The address** (D-W51-51 / 52): `/doctor/appointments/<id>/time|services` — the same route and parser as 69
  (`step` `'reject' | 'cancel' | 'time' | 'services'`, any other word a 404; `DoctorReasonStep` keeps 69's two), the
  same split and the same push over the tabs below 744.
- **Opened** from the 68 (a request's «Αλλαγή»; «Αλλαγή» of «Ημέρα και ώρα» with `canReschedule`, of «Υπηρεσίες» and
  «Κόστος» with `canEditCharges`) and from 69's «Θέλετε απλώς άλλη ώρα;» as one more step of the history
  (`useHistorySteps('doctorAppointment')`), and from the request cards of 66 / 67 as a plain link.
- **The reads**: the 68's `doctorAppointmentQuery(id)`; then, only while the step is allowed, the doctor's REAL free
  hours (`doctorRescheduleSlotsQuery(id)`, U-189.1: an infinite query, a week a page from the server's «today», the
  next from the day after the last one while the server lists a whole week — «Επόμενες ημέρες») or the doctor's own
  services (`doctorServicesQuery(locale)`). Both personal, `staleTime` 0.
- **What the page keeps** (runes, never the address): the day and the hour chosen (an hour the server said was taken,
  or that passed on the server's clock, leaves the grid), the services chosen (with the counts the appointment had;
  the last one stays) and «Τελική τιμή» as typed (read strictly: a comma or a dot, two decimals, 0 to the contract's
  bound; a new choice starts it again from the total).
- **The writes**: `PATCH …/{id}` `{ startTime }` (U-190.2: a request is confirmed in the same write) and `PUT
…/charges` `{ services, finalTotalAmount? }` (the price only when it differs from the total). Success: the answer in
  `detail(id)` as it came, the lists invalidated, the save remembered in the screen's `DoctorAppointmentMemory`
  (`ui/memory`, a context of the appointments screen; another appointment, a reload or a sign-out forgets it) for the
  68's green card, back to the 68. `409` of the move / `422 RESCHEDULE_INTO_THE_PAST`: the hour leaves the grid and the
  hours are read again; `409 CHARGES_DO_NOT_FIT`: «Δεν χωράει…» from the server's `details`; `403` / `404`: «δεν
  γίνεται πια»; a lost request / `5xx` / `429`: its words, the choice stays; `401`: the sign-in. One press at a time.

## The doctor's outcome and «Διόρθωση έκβασης» (wave 5.1, screen 71)

- **The 68's blocks** (D-W51-61, `lib/detail` `buildDoctorAppointmentBlock`): while the server offers `NO_SHOW` /
  `COMPLETED` — «Η επίσκεψη είναι σε εξέλιξη.» from the hour to the server's `endTime`, «Ο ασθενής είναι στο
  ιατρείο.» once `checked_in`, else «Τι έγινε με την επίσκεψη;» — with «Δεν ήρθε · Ολοκληρώθηκε», «Ήρθε, είναι
  ακόμα στο ιατρείο» (`ARRIVED`, one tap of the desk, only while the visit lasts and the server offers it) and what
  each answer means. A settled visit with the server's `actions.correction` says who wrote it («Γράψατε «…». Αν έγινε
  λάθος, …» for `outcomeSource: DOCTOR`, U-196.1; «Το «…» γράφτηκε αυτόματα, …» for `SYSTEM`) until
  `outcomeCorrectableUntil` (`doctorUntilPhrase`: «σήμερα, …», «αύριο, …», else the day with its article — never
  computed), with «Διόρθωση». At the end of the window the detail is read again (its «Διόρθωση» goes with it).
- **The address** (D-W51-62): `/doctor/appointments/<id>/correction` — the same route, parser, split and push over the
  tabs as 69 / 70; opened from the 68 as one more step of the history.
- **The read**: the 68's `doctorAppointmentQuery(id)`; the form only while the server opens the opposite verdict
  (`doctorCorrectionEntry`), else «δεν γίνεται πια» with one way back. The verdict chosen is the page's rune (the
  current one checked first); only the server's `correction.to` ever travels (`doctorCorrectionTarget`).
- **The write**: the existing `POST …/outcome` `{ outcome }` with the opposite verdict. Success: the answer in
  `detail(id)` as it came, the lists invalidated, `{ kind: 'corrected', to }` in the screen's `DoctorAppointmentMemory`
  for the 68's green card «Διορθώθηκε σε «…».», back to the 68. The `409` whose `details.reason` is
  `PATIENT_ALREADY_RATED` (U-196.1, `DOCTOR_CORRECTION_RATED`, bound to the backend's mark by
  `tests/architecture/appointment-rules.test.ts`; since card w51-w8 the mark alone, never the words) ⇒ «Ο ασθενής έχει
  ήδη γράψει κριτική· η διόρθωση δεν γίνεται.»; any other `409`, `403`, `404` ⇒ «δεν γίνεται πια»; a lost request /
  `5xx` / `422` / `429`: its words, the choice stays; `401`: the sign-in. One press at a time.

## The doctor's «Νέο ραντεβού» (wave 5.1, screen 72)

- **The address** (D-W51-53 / 69): `/doctor/appointments/new` — the same route and parser as 67 – 71 (`view: 'new'`),
  with `?kind=account|relative|record&id=<uuid>` (a patient already chosen, the 73's «Νέο ραντεβού») and `?from=today`
  (opened from «Σήμερα»). From «Ραντεβού» («+», `doctor-appointments-new`) it stands right of the list from 1128 (the
  list's pill and office stay in the address); from «Σήμερα» («+», `doctor-today-new`) a centred page of its own;
  below 744 over the tabs (`isDoctorAppointmentStepPage`). Opened as one more step of the history
  (`useHistorySteps('doctorAppointment')`); «←» / «Άκυρο» go back that step, else replace with its page.
- **The reads** (all personal): «οι ασθενείς μου» (`doctorPatientSearchQuery`, the words cut at 40 and asked after
  300 ms; none = the most recent), «ίδιο κινητό» (`doctorPatientPhoneQuery`, only for a valid Greek mobile), the one
  patient of the address (`doctorPatientQuery(kind, id)`; a `404` back to the search with its words), the offices
  (only more than one is a choice), the doctor's services, the free hours of the office for the chosen services
  (`doctorNewSlotsQuery`, an infinite query a week a page, `staleTime` 0) and the SMS switch / balance of «Ενημέρωση».
- **What the page keeps** (runes, never the address): the step (search · new · picked), the chosen patient's KEY (its
  facts stay in the cache), the new patient's form (U-197.3: name and surname letters only, 80 each; the mobile
  required and Greek; the email optional, 254), the office, the service, the day and the hour.
- **The write**: `POST /appointment/appointments` `{ doctorId, officeId, startTime, status: 'booked', services, … }`
  with exactly one of `patientId` (+ `bookedForType` / `relativeId`), `patientRecordId` or `newPatient`. Success: the
  answer in `detail(id)` as it came, the lists and the searches invalidated, `{ kind: 'booked', told }` in the screen's
  `DoctorAppointmentMemory` for the 68's green card («Το ραντεβού κλείστηκε.» and who was told), replace with the 68.
  `409`: the hour leaves the grid and the hours are read again; `404`: back to the search; `422` / `400` naming a field:
  the form marks it; `429` / a lost request: its words, the choice stays; `401`: the sign-in. One press at a time.
- **Without an account** (D-W51-71): a `patientKind: 'RECORD'` appointment has no «Μήνυμα» on the 68 and shows
  «Χωρίς λογαριασμό eDoctor» there and on the cards of 66 / 67.

## The doctor's «Οι ασθενείς μου» (wave 5.1, screen 73)

- **The address** (D-W51-73): `/doctor/patients` (the list, from the row «Οι ασθενείς μου» of «Μενού»; «Μενού» stays
  the current tab, `isDoctorMenuTab`), `/doctor/patients/<kind>/<id>` (one card; `kind` one of `account | relative |
record`, `id` a uuid) and a record's `/edit` («Στοιχεία ασθενή») and `/merge` (the join) — ONE route
  `routes/doctor/(dashboard)/patients/[...path]` and ONE parser (`readDoctorPatientsAddress`); anything else is a 404. From 1128 the card stands right of the list (the first opens by itself, 67's way); below it alone; the two
  record screens are pushed over the tabs below 744 (`isDoctorPatientStepPage`).
- **The way back** (3β, `sw.js` `pt-open` / `pt-back`): every way INTO a card — the 68's name, a row of the list
  below 1128 — and every way out of it — «Επεξεργασία», «Ένωση» — is one more step of the history
  (`useHistorySteps('doctorPatient')`, `App.PageState.doctorPatient`); «‹», «Άκυρο» and the done action go back that
  step (to the 68, the list, the same card), else replace with the list (the card's «‹») or the card. From 1128 the
  card's «‹» shows only when the history holds where it came from. «Νέο ραντεβού» opens the 72 with the patient
  chosen (`?from=patient&kind=&id=`, a page alone; its «Άκυρο» comes back to the card).
- **The reads** (all personal, `api/patients`): the list page after page (`doctorPatientsQuery`, the words cut at
  40 and asked after 300 ms, 20 a page by the server's `nextCursor`), one card (`doctorPatientCardQuery`, a key of its
  own beside the 72's `patient(kind, id)`, which holds another shape), the pages of the card's «Επόμενα» /
  «Προηγούμενα» after its first (`doctorPatientAppointmentsQuery`, only on «Περισσότερα»). A `404` / `403` is the one
  «δεν βρέθηκε» (D-W51-63). The 72's booking reads them again (`patients()` `list`, `card`, `appointments`).
- **The writes**: «Αποθήκευση» `PATCH …/record/{id}` (the six fields, the mobile its 10 digits, an emptied one
  `null`; the rules of the 72's form and of the relatives' ΑΜΚΑ / ΑΦΜ before the write) and the join `POST
…/record/{id}/merge { patientId }` (only the server's `mergeCandidate`). Success: `patients()` and the appointments
  invalidated, `saved` / `merged` in the screen's `DoctorPatientMemory` (by the card's `kind:id`, never the address),
  back to the card, which says «Αποθηκεύτηκε.» / «Οι καρτέλες ενώθηκαν.». `422` names its fields under them, `409`
  «δεν αλλάζει πια» / «δεν είναι πια δυνατή», `404` gone, `429` / a lost request its words, `401` the sign-in.

## The doctor's «Το προφίλ μου» (wave 5.2, screen 77)

- **The addresses** (D-W52-22, D-W52-23, D-W52-26): `/doctor/profile` (from the first row of «Μενού»; «Μενού» stays the
  current tab) and `/doctor/profile/preview` («Δείτε πώς σας βλέπουν», a page of its own, pushed over the tabs below
  744); since screen 78 also `/doctor/profile/photos` and `/doctor/profile/photos/<id>/crop` (the next section). Every
  other path is a 404 in the site's frame. All are personal pages (`noindex`, no canonical, no alternate) and read
  nothing on the server — the cookies live on the API.
- **The reads** (personal, under ONE root `doctorDashboardQueryKeys.profile()`, so a section's write of screens 78–83
  reads both again): `doctorMyProfileQuery(locale)` — `GET /doctor/me/profile`, asked again whenever the page comes back
  to the front — and `doctorMyProfilePreviewQuery(locale, read)` — `GET /doctor/me/profile/preview`, anew at each
  opening, never again by itself while it is read. Nothing in either request names a doctor. `mapDoctorMyProfile` reads
  the answer field by field (U-65.6: an unknown reason or helper left out, a broken count 0, an oversized name none, an
  answer without a server id a failed read); the preview's cache keeps the FACTS the screen's reader made, never the wire.
- **What the page says** is built from the facts alone by pure rules (`lib/profile`): `buildDoctorProfileRows` (what each
  section holds — only what is not zero, each count in its own number, «από» only when the prices differ — and what it
  lacks, from the four helpers the server keeps for this page) and `buildDoctorProfileStatus` (D-W52-25: the green note
  of a doctor the search shows; the orange one with the team's check, or with the day the licence ended; for a missing
  marketplace licence or a profile the search cannot draw the title and no reason — none is made up — and, D-W52-25α,
  the counter only while a section asks for something: «Το προφίλ σας είναι πλήρες.» is never written under «Δεν
  φαίνεστε» there, as in the application).
- **The states**: the wait draws no fact; a read without an answer says so with «Δοκιμάστε ξανά»; a `401` ends the
  session (`session.expire`); the server's `doctor: null` of the preview draws what the public page draws for a doctor it
  cannot show, under the same band.
- **From 950** (D-W52-41, since screen 78) the page is a `SplitView` of the menu's widths with the section in the middle
  of its right column (U-167): the list's own address shows the FIRST section that has a page beside it (in place, the
  address stays the list's — the settings' way, the one width read in JS), its row the current one on the grey pill.
  The menu folds to a rail (D-W52-14; `folded` is the page's own state, kept while the one route lives): the button and
  the glyph of every section that HAS a page, with the dot where something is missing. No «‹» from 950 (U-217). Below
  950 the list is the page, and a section is a page of its own at its own address with «‹» back to the list (U-102).
- **«Δείτε πώς σας βλέπουν» is only to look at** (D-W52-26α): what stands under the band — the public page, or its «δεν
  βρέθηκε» — is one `inert` body for every doctor: no press, no focus, no window, no page left, nothing sent; the page
  scrolls with the document and «Κλείσιμο» of the band is the one control. The band's line has three forms: the search
  shows the doctor; it does not yet; it does not while the licence has ended.

## The doctor's «Ειδικότητα και εξειδικεύσεις» (wave 5.2, screen 80)

- **Screen 80 reads and writes nothing** (U-209, D-W52-59). Three reads of the session's own doctor, all under the
  profile's root: `doctorMyProfileQuery(locale)` — the list's own read, observed with `refetchOnMount: false` — for the
  specialty's name, `hasCatalogue` and the lock (`sections.about.nameLocked`, the name's own rule, D-W52-51);
  `doctorMyPracticeLicenceQuery()` — `GET /doctor/profile/base`, of which the cache keeps ONLY
  `{ number, obtainedDay }` (never the email, the phone or a policy of the bookings); and, only when `hasCatalogue`,
  `doctorSpecializationsQuery(locale)` with `refetchOnWindowFocus: 'always'`: the team's answer on a title of the
  Gazette («Ελέγχεται» ⇒ shown, or «Δεν εγκρίθηκε») shows without a reload. A specialty without a list asks for no
  specializations and draws none.
- **The choice** (D-W52-54): `doctorSpecializationOptionsQuery(locale)` and `doctorSpecializationsQuery(locale)`, never
  asked again by themselves while the page is worked on. The choice is the page's own rune (`draft`, `null` until the
  first press: until then the choice IS the saved picks) — never a copy of the answer — and only codes the list still
  holds count. «Αποθήκευση» is ONE `PUT { codes }` of the whole set behind the write's own gate; nothing is shown as
  saved before the server answers (no optimistic change). Done ⇒ the answer is put in the picks' cache, the profile's
  root is invalidated («Το προφίλ μου», the preview, the lists), «Αποθηκεύτηκε.», and the page closes. At three the
  limit's sentence is the shared `StepScreen`'s `barNote` (D-W52-59α): over «Άκυρο · Αποθήκευση», always in sight
  under a list of up to seventeen rows, announced when it comes; under the list stays «N από 3».
- **Refusals** (`readDoctorSpecializationsFailure`): `422` past three or out of shape ⇒ the limit's own sentence;
  `422` with `DOCTOR_SPECIALIZATION_NOT_OF_SPECIALTY` ⇒ «Ο κατάλογος άλλαξε…» — with these and a `409` the profile's
  root is read again, and a code the new list lost leaves the choice; `429` ⇒ «Πολλές προσπάθειες…»; anything else ⇒
  the change was not saved. The choice stays. A `401` ends the session.
- **U-65.6**: `mapDoctorSpecializationOptions` leaves out a line that is no line of the catalogue (it cannot be
  picked); `mapDoctorSpecializations` answers `null` — a failed read — for ANY broken pick, because a save replaces the
  whole set and a pick must never be dropped in silence. `kind` and `status` are the contract's enums, never guessed.

## The doctor's «Βιογραφικό» (wave 5.2, screen 81)

- **Screen 81 reads and writes nothing** (U-210, D-W52-63). ONE read of the session's own doctor,
  `doctorCredentialsQuery()` — `GET /doctor/profile/credentials`, one key whatever the page's language
  (`doctorDashboardQueryKeys.profileCredentials()`, under the profile's root) — with
  `refetchOnWindowFocus: 'always'`: a row saved in another tab, or by the team, shows without a reload. The cache keeps
  FACTS in GREEK alone (U-207.3: `title`, `organization`, the years, «σήμερα», `position`), never the wire and never
  another language. The order is the answer's own: the clients do not sort (U-210.1).
- **The page of one row** observes the same read and settles what it is by the FIRST answer (the row as the server
  keeps it, a new one, `missing`, `full`): a read that comes back later never writes over what is typed. Its fields
  live in the shared `createForm`; the rules are closures over the form's own values (an end needs a start, «σήμερα»
  needs one too) that speak only after the first «Αποθήκευση», then at every change.
- **A save is the whole group, from the server's LAST answer** (D-W52-63): `changeDoctorCredentialGroup(kind, change)`
  reads the biography AGAIN, hands the fresh rows of the group (in their written order, `position`) to the pure
  `change` of `lib/cv` (`doctorCredentialSaved` / `doctorCredentialRemoved`), and sends what it answers in ONE `PUT`,
  each row with its Greek text alone. Never from the cache: a row saved elsewhere meanwhile is not written over. Nothing
  is sent when the read fails, the row is `gone`, or the group already holds twenty (`full`). No optimistic change:
  done ⇒ the answer is put in the cache, the profile's root is invalidated («Το προφίλ μου» of 77 follows),
  «Αποθηκεύτηκε.» / «Διαγράφηκε.», and the page closes.
- **Refusals** (`readDoctorCredentialsFailure`): `422` ⇒ «Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τον τίτλο και τα έτη…»;
  `429` ⇒ «Πολλές προσπάθειες…»; `409`, `403`, anything else ⇒ the change was not saved; `gone` / `full` ⇒ the page has
  nothing left to offer and says so with one way back. What was typed stays. A `401` ends the session. A row deleted
  elsewhere while its deletion was asked is deleted: that is what was asked.
- **U-65.6**: `mapDoctorCredentials` answers `null` — a failed read — for ANY broken row, because a save replaces a
  whole group and a row must never be dropped in silence. The one row it leaves out is a row WITHOUT a Greek text (the
  backoffice wrote it in another language): the doctor's page has no words to show or send for it, and a save of its
  group keeps Greek alone (D-W52-61α).

## The doctor's «Κριτικές» (wave 5.2, screen 84)

- **Reads** (D-W52-84 / 85 / 89), all under `doctorDashboardQueryKeys.reviews()`, personal, in the browser only:
  `doctorReviewsListQuery(filter)` — the doctor's PUBLISHED reviews (`as=doctor`, `APPROVED`), page after page by the
  server's cursor, for «Όλες» (`reviewList('all')`) and «Χωρίς απάντηση» (`reviewList('unanswered')`,
  `replyModerationStatus=NONE`; its first page's `total` is the N of the choice, read on the list's page too);
  `doctorReviewsSummaryQuery(locale)` — the summary for the doctor alone with `pendingCount`; `doctorReviewQuery(id)` —
  one review as the server keeps it NOW (the reply and the report pages, `staleTime: 0`); and
  `doctorAppointmentReviewQuery(appointmentId)` — the list's own filter (`appointmentId` + `APPROVED` + `limit=1`): the
  row of 68 (only for a completed visit) and «Το ραντεβού: …» / the report state of the two pages.
- **The review an address names** (`?review=<id>`, D-W52-91): the list reads its next pages by itself until the review
  is there (at most `DOCTOR_REVIEWS_FIND_PAGES_MAX`), then the page goes to its card once per address.
- **The reply** (D-W52-86): the page's mode — a NEW reply (`POST`, after none or after a rejected one) or the CHANGE of
  the one there (`PATCH`, its words in the field) — is settled by the FIRST answer of `doctorReviewQuery`; a `409` of a
  reply that changed in the meantime reads it again and the page becomes what it now is, keeping what is typed.
  «Διαγραφή» (`DELETE`) is asked first in an `ActionDialog` on the list.
- **The report** (D-W52-87): one of the five reasons (rune state holds the word, never an `api/` type) and up to 1000
  words; a review already reported (its `openReports`) or a `409` of an open report shows the card's own sentence.
- **Every write that ends** writes the server's answer into every list held (`keepDoctorReview`,
  `keepDoctorReviewReported` in `api/reviews/cache.ts`), so the card the doctor goes back to already says it, then
  invalidates `reviews()`. A refusal says why and what was typed stays; a `401` ends the session.
- **History** (`App.PageState.doctorReview`): a reply, a report and the 68 opened from a card are one step on
  (`useHistorySteps('doctorReview')`); their «‹», «Άκυρο» and done action go back that step to the same review, a link
  alone to `/doctor/reviews?review=<id>`.
- **U-65.6**: `mapDoctorReviewsPage` keeps ONLY what the server gave (a review out of the contract stays out, each id
  once, a visit only with an IANA zone, the reports only with a server id); of the team's notes only 🔴 D-W52-86α
  `replyRejectionReason`, as text and only for a `REJECTED` reply (the card's «Η ομάδα του eDoctor δεν την ενέκρινε:
  <λόγος> …», the sentence alone without one) — never the review's own note.

## The doctor's «Τα άρθρα μου» (wave 5.2, screen 85)

- **Reads** (D-W52-96), under `doctorDashboardQueryKeys.articles()`, personal, in the browser only:
  `doctorArticlesListQuery()` — the doctor's articles newest first, page after page by the server's cursor (no body); and
  `doctorArticleQuery(id)` — one article as the server keeps it NOW (`staleTime: 0`), for its page.
- **Writes** (D-W52-95): `writeDoctorArticle(id | null, 'save' | 'send', draft)` — ONE call each («Αποθήκευση
  πρόχειρου» `POST` / `PUT`, «Αποστολή για έλεγχο» `POST …/submission` / `POST …/<id>/submission`), the whole form in
  Greek alone (`language: 'el'`), never a slug, an SEO field, an author or a state; `deleteDoctorArticle`;
  `uploadDoctorArticleImage` (an image of the text, base64 in the JSON). Each that ends invalidates `articles()`.
- **One article's page** (D-W52-103): `ui/article` `useDoctorArticle` reads `doctorArticleQuery(id)` (a new one reads
  nothing) and seeds its form ONCE from the answer — the kind, the title, the short description, the text (the editor's
  JSON, kept by the hook) and the uploads of the text (id ⇒ address, then each new upload). The cover is `undefined`
  (kept), `null` (removed) or a new `data:` text. A write first says the page's three messages (`doctorArticleErrors`),
  then sends the text cleaned as the server stores it (`cleanArticleTextDoc`, nothing to send ⇒ `null`); done ⇒ a toast,
  `articles()` invalidated and the list. The editor's own state (selection, history) is Tiptap's, inside the editor.
- **U-65.6**: `mapDoctorArticlesPage` keeps ONLY what the server gave (a row out of the contract stays out, each id once);
  the team's reason only for a refused article or a refused change; an article's `content` only as a document of the
  closed schema (`readArticleText`) — anything else is no text, never drawn as one.

## The doctor's «Υπηρεσίες και τιμές» (wave 5.2, screen 83)

- **Reads** (D-W52-73 / 79): `doctorServicesListQuery(locale)` — the services of the session's own doctor in the
  doctor's order (`profileServices(locale)`) — and `doctorAllowedServicesQuery(locale)` — the catalogue of the specialty
  with `owned` and eDoctor's Greek texts (`profileServiceOptions(locale)`); both under the profile's root, never asked
  again by themselves while the page is worked on. The page of one service also reads the practice licence (the most
  years, on the server's clock) and, for a new one, `GET /doctor/me/profile` (its `doctorId`).
- **The order** (D-W52-81): the drag's order lives in the slice's `useDoctorServiceDrag` while a row is lifted; the new
  order is written into the cache at once, ONE `PUT …/order` carries it (presses meanwhile become the next call), a
  refusal puts the last server answer back and reads the list again.
- **One service** (D-W52-82): the form is the shared `createForm` (values only); the rules (price 1–9999, years up to
  the licence's) speak once «Αποθήκευση» was pressed. 🔴 U-214.4: a field holds the doctor's own text — a new one starts
  EMPTY — and only `suggest()` (the button) copies eDoctor's into both; 🔴 U-217.3: a new one has NO price. «Αποθήκευση»
  is ONE `PATCH` (a stored one) or `POST` (a new one, Greek alone, never `amount`).
- **Every write that ends** invalidates `profile()` (77, the list, the catalogue) and `servicesAll()` (screens 70 / 72).
- **U-65.6**: `mapDoctorServices` answers a failed read for ANY broken row (the order is written back whole);
  `mapDoctorAllowedServices` leaves out a line out of the contract.

## The doctor's «Γλώσσες και κοινωνικά δίκτυα» (wave 5.2, screen 82)

- **Screen 82 reads and writes nothing** (U-211, D-W52-69 / 70). Two reads of the session's own doctor, under the
  profile's root, both with `refetchOnWindowFocus: 'always'` (a change made in another tab shows without a reload):
  `doctorLanguagesQuery(locale)` — `GET /doctor/profile/speak-languages`, named in the page's language — and
  `doctorLinksQuery()` — `GET /doctor/profile/base`, of which the cache keeps ONLY the four links (never the email, the
  licence or a policy of the bookings), one key whatever the language.
- **The choice of the languages** (D-W52-66 / 69): `doctorLanguageOptionsQuery(locale)` (the public catalogue) and
  `doctorLanguagesQuery(locale)`, never asked again by themselves while the page is worked on. The choice is the page's
  own rune (`draft`, `null` until the first press), never a copy of the answer; only codes the catalogue still holds
  count. The search is the page's own words (`query`, at most 60): every word folded (no accents, `ς` as `σ`) and
  found INSIDE the catalogue's `normalized`. No words: «Οι γλώσσες σας» are the saved ones, as the page opened (no row
  jumps while it is pressed; a language chosen on the page stays ticked under «Όλες οι γλώσσες»). Words (D-W52-69α,
  `sw.js` `slPickPage`): ONE list without a heading of every language they find, the chosen ones ticked among them; a
  chosen one they do not find is out of sight, and «N από 10» still counts it. Greek first, then `Intl.Collator` of the
  page's language — the same at every width. «Αποθήκευση» is ONE `PUT { codes }` of the whole
  set behind the write's own gate; nothing is shown as saved before the server answers. Done ⇒ the answer is put in the
  languages' cache, the profile's root is invalidated, «Αποθηκεύτηκε.», and the page closes. At ten the limit's
  sentence is the shared `StepScreen`'s `barNote` (D-W52-59α); under the lists stays «N από 10».
- **The four links** (D-W52-67 / 70): the fields live in the shared `createForm`, opened ONCE by the first answer (a
  read that comes back later never writes over what is typed). The rule is the server's own (`lib/links`
  `doctorLinkRefusal`): only `https`, at most 2000, no name or password inside, the host as `new URL()` reads it and
  typed as that very name, each network on its own names, a website on a public name. It speaks only after the first
  «Αποθήκευση», then at every change; «Αποθήκευση» sends nothing while a field is refused, else the four fields in ONE
  `PATCH` (`https://` added where no scheme was typed, `null` for an empty one).
- **Refusals**: languages (`readDoctorLanguagesFailure`) — `422` ⇒ the limit's sentence; `422` with
  `DOCTOR_SPEAK_LANGUAGE_NOT_IN_CATALOGUE` ⇒ «Ο κατάλογος άλλαξε…», with it, any other `422` and a `409` the profile's
  root is read again; `429` ⇒ «Πολλές προσπάθειες…»; anything else ⇒ the change was not saved. Links
  (`readDoctorLinksFailure`) — each `DOCTOR_<FIELD>_LINK_<REASON>` of a `422` is said under ITS field in the page's
  words for as long as the field holds the link that was refused (the page's own memory, `DoctorNetworksRefused`: the
  link and the form's key, never the answer); a refusal that names no field is said over the buttons. What was chosen
  or typed stays. A `401` ends the session.
- **U-65.6**: `mapDoctorLanguageOptions` leaves out a line that is no line of the catalogue (it cannot be picked);
  `mapDoctorLanguages` and `mapDoctorLinks` answer a failed read for ANY broken row or link, because a save replaces
  the whole set and nothing must be dropped in silence. A kept link is text on screen 82, never an `href`.

## The doctor's «Όνομα και περιγραφή» (wave 5.2, screen 79)

- **Read only** (U-207, D-W52-49): the page has no write. Its own read is `doctorMyProfileTextQuery(read)` —
  `GET /doctor/profile/translations/el` of the session's own doctor (Greek whatever the page's language, D-W52-01; the
  backoffice's `tenantUserId` is never sent), under the profile's root (`doctorDashboardQueryKeys.profileText()`),
  asked again when the page comes back to the front (what the team wrote shows without a reload). `read` is the public
  page's reader of a description, handed in by the screen; the cache keeps FACTS — `{ fullName, paragraphs }`, plain
  text, bounded — never the wire. `null` (no text in that language) is an answer; anything else that is no record is a
  failed read.
- **The lock's words** under the name are written only for `sections.about.nameLocked === true` of
  `doctorMyProfileQuery(locale)` — the list's own read, observed a second time by the page with `refetchOnMount: false`
  (it asks only when nobody has yet; opening the page beside a list that holds the answer asks nothing).
- A `401` ends the session once; `403` / `404` are answers that are not asked again by themselves.

## The doctor's «Φωτογραφίες» (wave 5.2, screen 78)

- **The read** (D-W52-36): `doctorProfileImagesQuery()` — `GET /doctor/profile/images` of the session's own doctor, one
  list whatever the language, under the profile's root (`doctorDashboardQueryKeys.profileImages()`), never asked again
  by itself while the page is worked on. `mapDoctorProfileImages` reads it field by field (U-65.6: an entry without a
  server id left out, an address that is no address none — only a path of the API's host or an `http(s)` address — the
  words plain text of the server's bound); the order is the server's, the first is the main one.
- **Every write that ends invalidates the profile's root**: the photos, «Το προφίλ μου» (the row of 77) and the preview
  are read again. What the answer already tells is put in the cache first (the new photo last, the cut in its place,
  the order as the server keeps it), so the page never waits for the read to show it.
- **Ανέβασμα** (D-W52-28 / 29 / 38): the picked files are checked on the device before a byte leaves (`shared/lib/image`
  `checkImageFile` with `lib/photos` `DOCTOR_PHOTO_FILE_RULES`: JPG / PNG / WebP, 10 MB, 800 × 600 by
  `createImageBitmap`) and the ones that pass are sent ONE at a time, each as a base64 `data:` text inside the JSON
  (`httpSessionUpload`, which tells the fraction sent: the tile's ring). Never more than fit under the 20. A file the
  check refused is named with its reason and takes no place; one the server refused for what it IS says the same words
  and has «×» alone; any other failure says «Δεν ανέβηκε» with «Ξανά». The queue is the hook's rune state (ids, status,
  fraction — never an API answer); the `File`s live beside it, outside rune state. Leaving the page stops the queue
  after the photo that is on its way.
- **Σειρά** (D-W52-31 / 39): the new order is written to the cache at once and sent in ONE `PUT order`; orders asked
  while a call is away become one more call (the last one wanted). A refusal puts the photos back as the server last
  kept them, says so on the page and in the `aria-live` line, and the list is read again. A drag (`use-drag`, pointer
  events; a finger holds first) keeps the order it would leave in its own state and hands it over once, at the end.
- **Διαγραφή** (D-W52-34): always asked in the shared `ActionDialog`; a photo the server no longer has (`404`) just
  leaves the list.
- **«Προσαρμογή»** (D-W52-35 / 40): the photo is found in the same cached list; the picture cut is the LARGEST size the
  server keeps (1200 × 900 — it keeps no original), loaded with CORS (`loadImage`) so the canvas can be read back. The
  cut (`imageCropRect`: 4:3, at least 800 × 600 of the picture's own pixels, never more than they are) is drawn as a
  JPEG on the device and sent with `PATCH` in the photo's place. The picture's pixels are the browser's read of a file,
  kept in the hook's state; the element the canvas draws is never state.
- **The gates of the writes**: the library tells of a write that began only a timer later, so «Αποθήκευση» and
  «Διαγραφή» keep their own flag (`saving`, `deleting`) — a second press in between sends nothing.

## The page of the cancel link (wave 5.1, `/a/<token>`, D-W51-72)

- **The address**: `/a/<token>` — no session, the logo alone in the frame, no footer, no tabs. The token is read
  locally first (`readAppointmentCancelToken`: 16 characters of base64url, the backend's opaque token); anything else
  is «Ο σύνδεσμος δεν ισχύει πια.» with no call at all. `+page.server.ts` sets `Cache-Control: no-store`,
  `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex, nofollow`; the page adds the same as `<meta>`.
- **The read** (browser only, the rate limit is the visitor's): `getAppointmentCancelLink(token)` without cookies, at
  once (it waits for no session), never retried or refetched; the facts carry no patient field (only the doctor, the
  office, the hour and the terms). A token never reaches a log, the console or an error: `ApiError.url` names the
  route's pattern. 🔴 It is the link holder's, not the session's: NO `personalQueryMeta` and a key of its own
  (`appointmentCancelLinkQueryKey`, outside `appointments`) — the auth host forgets every marked read at a guest's answer
  (`removePersonalQueries`), and a marked read on its way was ended silently and left the page «loading» (card w51-w8
  round 2; `tests/architecture/drafts-privacy.test.ts` excepts this one slice from the mark and forbids it there).
- **The write**: `POST …/cancel` `{ reasonCode, reasonText? }` with `httpPublicPost` (the 53's form and reasons,
  `PATIENT_CANCEL_REASONS`, the words cut at the contract's bound). Success: «Το ραντεβού ακυρώθηκε.» / «Ο
  γιατρός ενημερώθηκε.» over the link's box (the read kept as it was; nothing is read again). `404` (or a `422` of the read) ⇒ «Ο σύνδεσμος δεν ισχύει πια.»; `403` after
  the deadline / `409` ⇒ read again (the late view: «Για ακύρωση, καλέστε το ιατρείο» with the office's `tel:`);
  `422` of the write ⇒ in the form; `429` ⇒ «Πολλές προσπάθειες…».

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

The same page is what the doctor previews (wave 5.2, D-W52-26: `/doctor/profile/preview`): with `preview` it writes no
head of the public profile, draws neither the phone's top bar nor the sections' bar (the holder's band has the top), and
every step of a window — open, move, close — keeps the page's OWN address (`pushState('', …)`): the open window is the
history state alone. The public address is never written there, because the site's frames read the address and a doctor
the search does not show has no public address. Its facts are the preview's read, handed in by the screen as the same
`load` shape; nothing else about the page changes.

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
edoctor.<appEnv>.doctor-mode.v1
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
