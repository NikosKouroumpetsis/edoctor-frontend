# Shared Layer

## Purpose

`src/shared` contains app-wide contracts that are stable enough to be reused across screens and modules. Shared code must be boring, explicit, and difficult to misuse.

## Promotion rule

Keep code feature-local first. Promote to shared only when one of these is true:

- at least two real consumers need the same behavior
- the behavior is an app-wide contract, such as config, env, theme, locale, query, storage, or providers
- the behavior is a design-system primitive

Do not promote speculative abstractions.

## Folder map

```txt
src/shared/
  config/       app env, variants, public config parsing (`env`, `api`, `support`, `map`: the ONE map look,
                `time-zone`: the product's zone, Europe/Athens; `consentStorageKey` beside `preferencesStorageKey`)
  design/       design assets, tokens, and design-system helpers (`scroll-controls`: the rows' ‹ › zones, Π2)
  lib/          pure framework-agnostic helpers (`format`: clocks, numbers, amounts and counts per locale,
                `calendar-day`: `formatCalendarDay`, `formatCalendarDayParts`, the application's, `format-day-time`:
                the ONE «Σήμερα · 10:00» phrase of the cards and the profile, `debounce`, `location`,
                `query-state`, `server-clock`, `rich-text`: the CMS document as allowlisted blocks and the
                headings' ids, the application's `createAnchorIds`, `seo`: `jsonLdScript`, `text`: the search's
                fold, words and highlight runs, `http`: `httpGet` and `httpGetWithMeta` (the envelope's `meta`),
                …), and the runes-based building blocks in `.svelte.ts`
                (`form`, `headless`, `debounce`)
  preferences/ theme, language, and preferences resolution
  providers/   root and subtree providers
  query/       TanStack Svelte Query setup (`personalQueryMeta`, `removePersonalQueries`, `resetPersonalQueries`,
                `removeMutations`: a sign-out or another account takes every write's body too, D-W3-37)
  state/       app-wide local state: a tab's module state written only in the browser (`device-location`, the
                visit's position of «Κοντά μου»), or a context scoped to the page tree (`search-dock`, `session`:
                who is signed in and `requireSignIn`, `site-dialogs`: the frame's windows a page may ask for);
                `session`'s `openSignOutChannel`: a sign-out reaches the browser's other tabs, the event only
                (`BroadcastChannel` `edoctor.<appEnv>.session.v1`, the one word `signed-out`, D-W3-37)
  storage/     browser/server-safe storage adapters (`consent-storage`)
  ui/          reusable UI hierarchy
```

Create-on-demand folders (not present; add one only when an existing folder is insufficient, Β4 of U-30): `hooks/`
for app-wide Svelte hooks, and `ui/atoms/`.

## UI hierarchy

```txt
src/shared/ui/
  primitives/  shadcn-svelte and low-level wrappers
  molecules/   composed controls
  organisms/   larger reusable sections
  templates/   reusable layouts
  icons/       the application's Ionicons (`ionicon/`) and brand marks (U-03.3)
```

shadcn-svelte generated components belong in `primitives`. Feature-specific composition belongs in `src/modules/<feature>`.

The text pages and the lists of wave 1.5 (screens 6–10, common v2) share: `templates/document-page` (`DocumentPage`:
breadcrumbs, eyebrow, h1, meta, notices, the ToC — right ≥1128, box 744–1127, row + sheet below 744 — the cards, «↑»),
`organisms/page-bar` (the phone's «‹» bar, its title rising with the page's; `ground="background"` on a
grey screen, unused since U-63 put the articles' list on white), `organisms/list-header` (the centred h1, search and chips from 744; below 744 the
application's: the name in the bar, the chips on a dragging row with the `chosen` one brought into view),
`organisms/status-page` (the 404/error page and its own inline pictures, `StatusArt`), `molecules/search-pill` (the
combobox with grouped suggestions in an APG grouped listbox, ↑↓/Enter/Esc, `keep` for the address without JavaScript;
below 744 the application's `SearchField` `inset` pill), `molecules/rich-text` (`RichText`, variants
`article | document | legal | answer`, `highlight` for a search's words), `molecules/link-rows`,
`molecules/state-panel`, the `Chip`'s `phoneVariant` (the application's outline below 744), `AccordionDetails`'s
`highlight` and `Banner`'s `actionLabel`/`actionHref` and `inline`.

The windows of wave 2 (screens 11–13) share: `templates/info-dialog` (`InfoDialog`: a title, its blocks and links, a
second level over another window; the 568 window from 744, the draggable sheet below it, one element by CSS),
`molecules/expandable-text` (four lines and «Εμφάνιση περισσότερων», opening in place), `molecules/review-toolbar` (the
count, the order, the round search that grows over the row), `molecules/mention-chips` (`MentionChips`: a heading, «×
Καθαρισμός», one row of toggles with a glyph, words and a count, the «‹ ›» from 744), `molecules/weekly-hours`, `molecules/breadcrumbs` (the text
pages' own), `lib/directions` (`buildDirectionsUrl`) and `RatingDistribution`'s `scrollLabels` (the «‹ ›» from 744).

Screens 14–16 and 24 add: `molecules/list-row` (`ListRow`: a row that opens, or goes on with «›», its end beside it from a
520 box and its `meta` under the title below that), `molecules/timeline` (`Timeline`: a life's work in time, then
«Εμφάνιση όλων (N)» in place), `molecules/stat-card`, `ProfileSummaryCard`'s `layout="page"`, `InfoDialog`'s `intro` runs
and rows, `ExpandableText`'s `lines`/`chevron` and `TextButton`'s `chevron`.

Screens 18 + 21 add: `molecules/conversation-row` (`ConversationRow`: a row of an inbox), `molecules/message-bubble`
(`MessageBubble`: a message, its words only ever a text node, never a link), `molecules/composer` (`Composer`: the pill
that grows, the application's numbers below 744 and the prototype's six lines from 744, its counter in code points), `templates/action-dialog` (`ActionDialog`: a small title with its rows or
buttons; the 480 window from 744, the draggable sheet below it), `BottomNavItem`'s `badge`, `$shared/lib/headless`
`SheetDrag` (what `InfoDialog` and `ActionDialog` share), `$shared/lib/http` `httpSessionFile` and `$shared/lib/text`
`countCodePoints`, `withDoctorTitle` (U-99.1: «Dr. …» inside a sentence, never doubled).

Wave 3 (the booking 30–31, the doctor's sign-up 33–42) adds, each generic and optional (the default is what was there):

- `templates/wizard-screen` (`WizardScreen`: the steps' frame — the header with the caller's mark and pills, a column of
  628, the fixed bar with `StepProgress` and `ActionBar`, or a `footer` snippet; the page and its bar on `bg-card`, the
  prototype's `--page`, W8-Δ3); the web-only tokens `wizard-column`,
  `wizard-top`, `wizard-pill` and the booking's `checkout-*` (`design-tokens.md`), `layout.css` `grid-checkout`.
- `hover` (default `true`) on `Button`, `ActionBar`, `SelectableCard` / `SelectableCards`, `Checkbox`, `CheckboxRow`,
  `Switch`, `Chip` and `Stepper`; the rule (`hover={false}`, U-100, D-W3-27) is `styling-guidelines.md` «Pressable»,
  and each component's spec guards both values.
- `SelectableCards`' `details` (a snippet under a chosen card, the application's), `Stepper`'s `valueLabel` (words for
  the number, read-only: «Ισόγειο», «3ος») and `variant="counter"` (one 64 box, the title inside, 36 circles: W8-Δ4),
  `DateOfBirthField`'s `allowFuture` and `bind:typed` (a date typed half),
  `phone-field` / `phone-field-inline`'s `maxlength`.
- `MapView`'s `zoomAround="center"`, `zoomControlsFrom="phone"`, `onMoveStart` / `onMoveEnd(center, { byUser })` (a fixed
  pin over a moving map) and `attributionLabel` (the «i»'s name).
- `icons/brand-google-calendar` (Google's official mark, its own colours, U-111.1) and `icons/brand-microsoft-outlook`
  (one colour, `currentColor`); the Ionicons `swap-vertical-outline` and `bus-outline` (the office page's elevator and
  transport, extracted from the application's font by the task's tooling, as every glyph of `glyphs.ts`).
- `lib/navigation`: `useSiteBack` (moved from the doctor module), `readHistoryDepth` / `HistoryDepthFlow` (how many steps
  of a flow lie behind an entry of the history, also after a reload, from `history.state['sveltekit:states']`),
  `isPlainClick` (a press the page may take over: the main button, no modifier, not already handled; moved from the
  booking's `use-navigation`, review w4-w4 R1 NIT-1 — a rule of the click, no word of a feature's).
- `lib/location`'s `resolveDeviceLocation({ highAccuracy })`, `lib/http`'s `httpSessionPatch`.
- U-129 (each screen as its own prototype, through a variant): `TimeSlotGrid`'s `variant` (`solid`, the default, the
  profile's filled time; `outline`, the booking's: a 2 px `foreground` border on `muted`, its words `foreground` 600),
  passed by `AvailabilityPicker`'s `slotVariant`; `DateOfBirthField`'s `variant="single"` (one `type="date"` field in
  the text field's box, its label always up; `typed` is also the browser's `badInput`); `Checkbox` / `CheckboxRow`'s
  `tone` (`primary` default, `foreground`: the doctor sign-up's tick, `secondary`: the register form's);
  `icons/house-cross` (the doctor sign-up prototype's own «clinic», path for path); the application's `chip` and
  `line-2` colours.
- `lib/form`'s `Validators.lettersOnly` (one word of Latin or Greek letters once trimmed, `LETTERS_ONLY_PATTERN`: the
  server's `onlyCharactersSchema`, U-121.2), `Validators.amkaDate` and `Validators.afmCheckDigit` (after a `pattern` of
  11 / 9 digits, the date and the check digit of the server's `GreekIdPolicy`, U-121.3), over `greekIdDigits` (the id
  as the server reads it: trimmed, its digits 0–9 alone) and the ONE `AMKA_LENGTH` / `AFM_LENGTH`. Each leaves an empty
  value to `required` and another length to `pattern`; `tests/architecture/server-rules.test.ts` holds them to the
  backend's files.
- `preferences/i18n`'s `canonicalGreekPath` (the `/el/…` redirect's target, D-W3-38: `architecture-pattern.md` i18n).
- `lib/api-client`'s `ApiRequestBody<operationId>` / `ApiResponseData<operationId, status>`: a write's body and answer
  as the generated contract has them (W-4).
- `lib/http`'s `requestLanguageHeaders()` (🔴 D-W3-39): every request of `lib/http` and of the `api-client` (at each
  request's own moment) says the PAGE's language in `Accept-Language` — the address's (`/en/…` English, else Greek) in
  the browser, Paraglide's on the server — never the browser's own list. A call that mails a code names it in
  `?lang=` as well (`startAccess`, `resendAccessCode`, `initSetPassword`, `sendDoctorOnboardingEmailCode`).

Wave 4.0 (the patient's appointments, screens 50–55) adds:

- `templates/split-view` (`SplitView`, D-W4-52: the inbox's two columns made a template, the inbox its first reader):
  below 950 the `list` snippet or what it opened (`open`), both always in the page; from 950 side by side, each
  scrolling on its own under the bar (`h-split`), the list `widths="wide"` 420 / 460 (`grid-split`) or `"inbox"`
  380 / 400 (`grid-inbox`); 🔴 `solo` (U-139.1) is one 640 column in the middle when nothing goes on the right;
  optional `listLabel` / `paneLabel` make the columns regions; `bind:paneRef` is the right column's scrolling box — a
  reader that scrolls in it is handed that box (the inbox's conversation, `scroller`), never looks it up by the
  template's own attributes.
- `molecules/star-input` (`StarInput`, D-W4-27, U-138.2): stars to give a rating, 0–10 (one point a half star): a
  press whole, the same star again half; ONE `role="slider"` a row, ← ↓ / → ↑ half a star, Home / End, its words
  (`valueText`: «4,5 στα 5») and its name (`aria-label`, required) the caller's; each star a 48 box with the 32
  glyph; no hover colour, no tap flash, no double-tap zoom (U-100). Its rules `toggleStar` and `starInputKey` are
  exported, and stay its own: the rating's `lib/` holds no copy (a press is the component's).
- `lib/save-file` (`saveFile`, moved from the messages with its one reader): a file handed to the browser by a `blob:`
  address revoked at once, named by the caller by a date, never a person (the inbox's copy, the appointment's `.ics`).
- `lib/office` (`officeFloorValue`, `officeDialNumber`, moved from `modules/doctor/lib/detail/labels`, P-W4 Σ-26): an
  office's floor in words and its phone for `tel:`, for the doctor's profile, a patient's appointment and the sign-up's
  office step — ONE set of words, the application's `doctor_detail_office_floor_*` (the older `doctor_office_floor_*`,
  left without a reader, were taken out of the catalogs at the wave's close, D-W4-74). `officePhoneLabel` (🔴 D-W4-36.3): the phone as an appointment reads it, the
  prototype's «210 321 0101» — the national groups joined by no-break spaces, only the digits kept; a number from
  elsewhere whole with its «+»; what is dialled stays `officeDialNumber`'s.
- `lib/text`'s `clampTextLength` (🔴 D-W4-36.8): a text cut to a bound the server counts in UTF-16 code units (its Joi
  `.max`, the browser's `maxlength`), never through an emoji — the booking's and screen 52's note, screen 53's words;
  the review's 2000 is checked in the same units.
- `lib/navigation`'s `HistoryDepthFlow` takes the new `App.PageState` flows `appointment` and `relatives`.
- `lib/ids` (`isUuid`, U-65.6): whether an address's segment is a server id (every id of the API is a UUID), read by
  the closed lists of `/appointments/[...path]`, `/ratings/[invitationId]` and `/profile/[...path]` before a route
  takes it.
- `organisms/bottom-nav`: five tabs since U-134.6 — 384 (`w-tab-capsule-w`) and never closer than 8 to the sides
  (`max-w-tab-capsule`), the words `narrow-phone:tracking-tight` below 360 (D-W4-53). 🔴 D-W4-65 / D-W4-73 (two live
  checks): FIVE tabs are packed at every width — each tab as wide as its own word (never under the 48 target), the room
  left shared out as equal gaps never under 4 (`justify-between gap-1`; five equal shares of the 384 are narrower than
  «Εξερευνήστε» at 12) — and their words are 11 (`text-tab-label`, a role of the web alone, outside the shared scale)
  only in a capsule narrower than its 384 (`capsule-narrow:`, a screen under 400 = `tab-capsule-fit`), 12 from it. Four
  tabs keep equal shares at 12.
- `primitives/chip`'s `size="tab"` (D-W4-66, screen 50's «Επερχόμενα / Ιστορικό»): 36 high, 14 (`min-h-chip-tab`), the
  web's own third size beside the application's 32 and 40.
- `templates/split-view`'s `solo` column is white to the screen's end from 950 too (`split:min-h-page`, D-W4-66).
- `molecules/phone-field-inline`'s `autocomplete` (default `tel-national`): a relative's mobile says `off`, as every
  other field of a person who is not the reader (security review of the web, NIT-1).
- `lib/http`'s `sessionRequest` and `httpSessionFile` ask with `cache: 'no-store'` (🔴 D-W4-60): a personal answer is
  never kept in the browser's HTTP cache past the sign-out.
- `primitives/chip`'s `variant="contrast"` (D-W4-28, screen 50's `.a-chip.on`): the chosen pill filled dark
  (`bg-foreground`), its words `text-card`; the inbox's chips keep `outline` (U-131.4), both held by
  `tests/architecture/prototype-looks.test.ts`.

Everything under `src/shared/ui` is generic (U-02.1, guarded by
`tests/architecture/shared-ui-generic.test.ts`): words, hrefs and the locale
come from the caller as props, a Paraglide key is only `common_*` or the
component's own name (`date_of_birth_field_*`, `image_uploader_*`), and the
product's frame lives in `src/modules/shell`.

## Provider access

Provider internals stay private. Screens and modules consume provider state through exported hooks, context helpers, or explicit props.

Root providers belong in `src/shared/providers` and are composed from `src/routes/+layout.svelte` or a route group layout.

## Storage and preferences

Persist only small, sanitized preference snapshots. The shared storage keys are (`$shared/config`
`preferencesStorageKey`, `consentStorageKey`):

```txt
edoctor.<appEnv>.preferences.v1
edoctor.<appEnv>.consent.v1
edoctor.<appEnv>.consent-recorded.v1
edoctor.<appEnv>.helpful.v1
edoctor.<appEnv>.favorite-pending.v1
```

Do not persist TanStack Query caches, auth sessions, or large business payloads in the preferences store.

## Imports

- Use `$shared/<area>/<leaf>` imports.
- Export explicit named APIs from folder entrypoints.
- Avoid wildcard parent barrels for runtime code.
- Shared code must not depend on feature modules.

## Generated Code

Generated output lives under `src/generated`, not `src/shared`.

```txt
src/generated/
  paraglide/   Paraglide i18n output, imported through $paraglide
  api/         OpenAPI codegen: the vendored spec (openapi.json) and the
               generated wire types (schema.ts), imported through $generated/api
  design-tokens.css
```

Paraglide output is generated into `src/generated/paraglide` and imported through `$paraglide`. Do not edit generated files by hand.

The backend's OpenAPI 3.1 contract is vendored and codegen'd into
`src/generated/api` (see `documentation/framework-stack.md` for the scripts).
The generated types are tracked, never hand-edited, and exempt from the barrel,
Prettier, and ESLint rules (like the Paraglide output). Feature modules may not
import `$generated/api` directly; the wire types they need are re-exported
through the shared client layer at `src/shared/lib/api-client` and consumed via
`$shared`, so the module allowed-import list stays intact.

## Shared API Client

`src/shared/lib/api-client` is the generic building block for the typed
`openapi-fetch` client, mirroring `src/shared/lib/http`. It owns:

- the client base URL (`getApiBaseUrl()`; every contract path carries its module
  segment, e.g. `/doctor/public/doctors`) so request URLs match the hand-written
  `http` client exactly,
- the SSR `fetch` injection seam,
- the response envelope/error guard (`unwrapEnvelope`, reusing `ApiError` from
  `src/shared/lib/http`), since `openapi-fetch` does no runtime validation,
- the `$shared` re-export of the generated wire types: the views by name, and since wave 3 a write's JSON body and an
  answer's `data` by the operation's id (`ApiRequestBody<'createAppointment'>`,
  `ApiResponseData<'addPatientRelative', 201>`). Only a feature's own `api/` narrows them, and only facts leave it
  (`architecture-pattern.md` «Wire ⇒ facts (W-4)», the rule and its guard),
- the page's language on every request (`requestLanguageHeaders`, D-W3-39), as `$shared/lib/http` says it.
