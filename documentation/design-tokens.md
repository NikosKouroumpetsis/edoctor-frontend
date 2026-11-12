# Design Tokens (sizing & non-color)

Canonical reference for every **non-color** size in the web app: the step scale,
typography, line height, touch targets and control heights, spacing roles,
gutters, media and card sizes, container widths, breakpoints, icons, radii,
elevation and sheet heights. Colors are documented separately in
[`styling-guidelines.md`](./styling-guidelines.md) and live in
`src/routes/layout.css`.

The rule (owner decision, search-ux S-05 … S-08): **no rem, no per-component
sizes.** Every size is a named Tailwind class from one central scale, so changing
a value in the centre changes it everywhere. A component never writes its own
`[15px]`.

## Source of truth: one scale, shared with the application

```
application/src/shared/design/tokens/values/index.ts   ← CANONICAL (edit here first)
frontend/src/shared/design/tokens/
  tokens.ts        ← copy of the canonical file (same exports, same order, web Prettier)
  index.ts         ← registry: re-exports + web-only names (`platform`) + `step()` + theme lists
  to-css.ts        ← tokens → Tailwind `@theme` CSS (pure)
  vite-plugin.ts   ← writes src/generated/design-tokens.css (dev + build + HMR)
  build.ts         ← `bun run tokens:build`
```

- `tokens.ts` holds **only** the shared values (no imports, no functions). The
  test `tests/architecture/scale-parity.test.ts` transpiles both files and fails
  on the first difference, naming its path (`radius.md: 12 ≠ 8`). To change a
  value: edit the application file, copy it here, run `bun run tokens:build`.
- `index.ts` adds what only the web has (`platform.spacing`, `platform.motion`, the `motion` durations and curves)
  and the derived lists both the theme and the class merger read
  (`spacingScale`, `mergeTheme`).
- `src/generated/design-tokens.css` is generated and committed; never edit it.
  The Vite plugin regenerates it on dev start, on every build, and when a token
  source changes.

## Step scale

`--spacing` is **4px** (not rem), so `p-4` is 16px whatever the browser's root
font size. Small internal gaps and small geometry use the numeric steps **0–6
(≤ 24px), in halves** (`p-3`, `gap-1.5`, `size-6`). Anything above 24px, and
every text, control height, width, icon and radius, is **only** a name. `p-3.75`
(a hidden `[15px]`) and `h-14` are rejected by the architecture test.

Runtime code reads small lengths through `step(n)` (`sideOffset = step(2)`), never
as a raw number.

## Typography (`text-<role>`)

Each role bakes size + weight + line height; add `font-*` only for an
intentional override. Never under 12px; running text is `body-lg` (16).

| Role         | Size / line / weight | Role       | Size / line / weight |
| ------------ | -------------------- | ---------- | -------------------- |
| `display-xl` | 48 / 1.08 / 700      | `title-lg` | 20 / 1.40 / 600      |
| `display-lg` | 44 / 1.10 / 700      | `title-md` | 19 / 1.40 / 600      |
| `display-md` | 40 / 1.12 / 700      | `title-sm` | 18 / 1.45 / 600      |
| `display-sm` | 36 / 1.15 / 700      | `title-xs` | 17 / 1.45 / 600      |
| `display-xs` | 34 / 1.18 / 700      | `body-lg`  | **16** / 1.50 / 400  |
| `heading-xl` | 30 / 1.20 / 600      | `body-md`  | 15 / 1.50 / 400      |
| `heading-lg` | 28 / 1.25 / 600      | `body-sm`  | 14 / 1.45 / 400      |
| `heading-md` | 24 / 1.30 / 600      | `label-lg` | 13 / 1.40 / 500      |
| `heading-sm` | 22 / 1.32 / 600      | `label-md` | **12** / 1.40 / 500  |

Tailwind's `text-xs … text-9xl` do not compile (`--text-*: initial`).

Two reading sizes live as `@utility` in `src/routes/layout.css` (common v2 §A, the approved prototypes 06/07/10):
`text-article-body` 18 / 28 / 400 (an article's text) and `text-document-body` 16 / 26 / 400 (a legal text, the
deletion page, an FAQ answer). `cn` knows both as text sizes (`readingTextSizes` in `src/shared/lib/utils.ts`), so a
colour after them never drops them. `scroll-mt-document` stops an anchor under the phone's bar and the sticky ToC row.

## Line height (`leading-<name>`)

`flat` 1 · `tight` 1.25 · `normal` 1.5 · `relaxed` 1.75 · `loose` 2. Write a
leading **after** the role in the same class string (`text-body-sm
leading-tight`): `cn` drops a leading that precedes a role. Numeric `leading-N`
and `leading-none` are rejected.

## Touch targets and control heights (`--spacing-*`)

| Name                 | px       | Use                                                           |
| -------------------- | -------- | ------------------------------------------------------------- |
| `touch`              | 48       | minimum box of **every** target (`min-h-touch`, `size-touch`) |
| `touch-gap`          | 8        | gap between neighbouring targets (`gap-touch-gap`)            |
| `control-xs` / `-sm` | 32/40    | a **visible** shape inside a 48 box (circle buttons, tracks)  |
| `control-md/-lg/-xl` | 48/56/64 | control heights: inputs, selects, buttons, fields             |
| `row` / `row-lg`     | 56/72    | list and suggestion rows                                      |
| `bar-bottom`         | 88       | space the mobile bottom bar takes                             |
| `bar-booking`        | 112      | space a booking bar takes                                     |
| `field-inset`        | 36       | field padding next to a leading icon                          |

Every `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>` and ARIA widget is at
least 48×48. The visible shape may be smaller (`size-control-sm` inside
`size-touch`); `hitSlop`-style tricks do not count — U-29.2 below is the one listed exception.
`tests/architecture/touch-targets.test.ts` checks the height and the width of
each target and of each recipe `base`, and fails on a class that shrinks the box
again (`min-w-0`, `h-8`) or on a size passed to a target component
(`<Button class="size-6">`).

The test lists its exceptions (`EXCEPTIONS` in `touch-targets.test.ts`, file +
marker + reason; an entry without a match fails):

- **Inline links:** the link of `InlineLinkText` (`data-slot="inline-link-text-link"`),
  the consent card's policy links (`data-slot="cookie-consent-link"`, U-16.5), a link
  inside a CMS text (`RichText`, `data-slot="rich-text-link"`, common v2 §B) and the
  author's name in an article's «Από <γιατρός> · ημέρα · N΄ ανάγνωσης»
  (`data-slot="article-meta-author"`, U-57.4) are words of a running sentence and take
  the sentence's line height — the WCAG 2.5.8 «inline» exception, as in the application.
- 🔴 **U-29.2 (the owner, 29/10): the card's «🔒 Συνδεθείτε για κόστος»**
  (`data-slot="doctor-card-fee-action"`, U-27.4) stays as it is. WCAG 2.2 SC 2.5.8
  (AA) asks at least 24 × 24 CSS px, or a target inline in a line of text; the
  44 × 44 is SC 2.5.5 (AAA) and is not required, and EN 301 549 rests on WCAG 2.1 AA,
  which sets no size. Measured (20:3x): on the web the list's and the pin card's
  target 181 × 26 (words of the card's line, grown 4 on every side by a
  pseudo-element), on the home inline in the line « · ★»; in the application the line
  plus `hitSlop` 4 (list, pin card) and inline on the home. The 48 of this repository
  is a stricter rule of our own; this target is within the international one.

Known exceptions (written down here, not checked by a test):

- **No 8 gap** between the adjacent segments of one control (language switcher,
  tabs list, toggle group), between menu rows and between calendar cells. Between
  separate targets `gap-touch-gap` is a review rule, not a test.
- **Calendar cells** are fluid (`h-touch w-full` in a `w-narrow max-w-full`
  grid): 48 wide only in a container of at least 354; about 41 in a popover and
  about 36 inline on a 320 screen.
- **Switch:** the web draws the application's track from the shared `switchGeometry` (38 / 48 / 56 × 22 / 28 /
  32, a 2 inset, the thumb 18 / 24 / 28) inside the 48 box, as inline sizes read from the token (U-07.1).

Fields (floating label) share one geometry, the class form of the `field`
tokens: the box is `fieldSizes` in `src/shared/ui/primitives/input` (`default` 48,
`lg` 56, `xl` 64; text 16 so iOS Safari never zooms) and the label's places are
`FloatingLabel`'s (`src/shared/ui/primitives/floating-label`), keyed by the same
`FieldSize`. The inline phone field draws its
border as an overlay, so it has the same 48/56/64.

## Spacing roles and gutters

| Name                                    | px           | Use                                         |
| --------------------------------------- | ------------ | ------------------------------------------- |
| `inline`                                | 8            | icon + label                                |
| `rail`                                  | 12           | cards in a horizontal rail                  |
| `list`                                  | 16           | list items (the former `gutter`)            |
| `grid` / `card`                         | 24 / 24      | cards in a grid / card and panel padding    |
| `section` / `section-lg`                | 32 / 48      | between page bands / end of a page          |
| `gutter-sm` / `gutter-md` / `gutter-lg` | 24 / 32 / 48 | page side gutter < 950 / 950–1439 / ≥ 1440  |
| `indent`                                | 36           | room for a leading/trailing check indicator |

`container-page` (centered, `max-w-page`, `px-gutter-sm split:px-gutter-md
desktop:px-gutter-lg`) frames the header, `<main>` and footer;
`container-bleed` lets a rail run into those gutters. The same column as a
component is `Container` (`src/shared/ui/molecules/container`, the application's
K2.1): `width` (a container name, default `page`), `widthByZone` (another cap from
a zone up, `{ split: 'listing' }`), `gutter` (`zone` | `none`) and `as`; its class
maps (`containerWidthClasses`, `containerGutterClasses`) are the one source the
layout units reuse.

Bars pinned to the bottom edge pad themselves with utilities of
`src/routes/layout.css` (not tokens): `pb-safe-area` (8 + the device safe area,
the bottom navigation), `pb-safe-area-action` (16 + the safe area, `ActionBar`)
and `pb-safe-area-sticky` (16, or the safe area + 6 where that is more, the phone
`StickyActionBar`) — the application's formulas. What floats over that edge is
placed by two more: `bottom-safe-area` (16 + the safe area, the glass capsule
`BottomNav`) and `bottom-above-tab-bar` (`bar-bottom` + the safe area: just above the
capsule — the consent card and the results' «Χάρτης» on the phone). The web sets no
`viewport-fit=cover`, so the safe area is 0 in the browser today.

## Media and cards

Named in the shared `media` family (values unchanged from the screens that
introduced them): `avatar-sm/md/lg/xl/2xl` 32/40/48/64/96 · `tile` 56 ·
`card-rail-w` 168 / `-lg` 216 · `card-rail-media` 152 / `-lg` 188 ·
`card-list-media` 188 / `-lg` 224 · `placeholder-sm/md/lg/xl` 64/80/96/160 ·
`search-pill` 64 · `search-bar-w` 850 / `search-bar-h` 66 (the web's `SearchBar` from 950, Airbnb's
850 × 66, U-05.5; the application holds the same two names unused) · `scroll-max` 256 … (full list in the
canonical file).

## Web-only names (`platform` in `index.ts`)

`bar-top` 64 (header) · `cta-inline` 32 (the pill call to action's inline padding,
`StickyActionBar`; the application's own platform name and value) · `menu-max-h` 288 · `menu-min-w` 160 · `popover-sm/md/lg`
224/288/320 · `textarea-md/lg/xl` 64/80/96 · `histogram-sm/md/lg` 80/112/128 ·
`range-field-sm/md/lg` 112/144/160 (the price filter's min / max columns, the application's platform names) ·
`dropzone-min-h` 288 · `drawer-handle` 48 · `drawer-inset` 96 · `brand-mark` 24
(the top bar's «e+» square; the prototype's 26 is off the 4px grid) · `icon-tile` 48 (icon tile of a placeholder page) · `dial-code-w`
56 (dial-code column of the inline phone field), `hover-card-w` 256 (the application's hover card width, `HoverCard`
`md`), the frame of wave 1.0 (U-16/U-17): `bar-content` 1024 (apple.com's bar box: 980 of content and 22 a side),
`window-reviews-sm` 664 and `window-h` 800 (the reviews' window of one column, U-66.2 Ε1), `office-aside` 400 (the office's text column, U-68.1 Ε1), `tab-capsule-w` 384 (the phone's glass capsule: five tabs, U-134.6 / D-W4-53, never closer than 8 to the screen's sides through `max-w-tab-capsule`), `account-menu-w` 260 (the ☰ menu), `consent-card-w` 720 (the consent
card from 744), the search of wave 1.0 (U-23.2): `search-panel-w` 424 (Airbnb's 425 panel under the bar, on the
4px grid), `compact-search-part` 224 (each part of the top bar's small search pill before «…», NIT-7 of U-29: its
own name, the value it had as `popover-sm`) and the corner `platform.radius.panel` 32 (`rounded-panel`, U-25.4), the blurs `platform.blur`
(`--blur-bar` 20, `backdrop-blur-bar`; `--blur-glass` 7, `backdrop-blur-glass`; `--blur-search` 18,
`backdrop-blur-search`, the phone's search window over the page), the results of wave 1.0 (U-24.4, §7.1–7.2):
`map-pin` 28 (the price pin), `map-card-media` 128 (the pin card's photo), `map-card-over-sheet` 184 and
`map-card-over-switch` 96 (the pin card above the phone's sheet / the 744 map switch), `map-sheet-peek` 168 (the
phone sheet's top strip), `results-list-end` 152 (the phone list's end, clearing the capsule; the prototype's 150),
`results-row-gap` 28 (Airbnb's 28 × 24 grid) and `map-switch-bottom` 32 (the 744 map switch's distance from the bottom
edge, `bottom-map-switch-bottom`; NIT-7 of U-29, U-32.3: its own name, the value it had as `control-xs`),
the profile of wave 1.5 (screen 5, U-41.1): `gallery-main` 260 / `gallery-main-lg` 360 (the `MediaGallery` square's
bounds from 744, the application's names; `w-gallery-fluid` of `layout.css` holds 26 % of the window between them)
and `gallery-thumb` 56, `profile-gutter` 40 / `profile-gutter-lg` 80 (the profile's sides from 744 / 1128, Airbnb's),
`section-bar` 80 (the fixed section bar from 744, also `scroll-mt-section-bar`), `card-sticky-top` 104 (the booking
card's sticky top: the bar 80 + 24), `window-wide` 1032 (the reviews' and the location's window), `office-map` 300 /
`office-map-md` 400 / `office-map-lg` 480 (the office map below 744, from 744, from 1128), `profile-columns` 64 (two
columns of a section from 744) and `review-rows` 40 (the reviews' rows), the text pages and the status page of
wave 1.5 (screens 6–10, common v2 §A/§E): `document-column` 600 (the text's column), `document-aside` 320 (the right
column from 1128), `document-wide` 720 (the FAQ's column), `reading-gap` 40 / `reading-gap-sm` 36 (an H2's distance in
an article / a legal text), `reading-crumbs` 28 (the breadcrumbs' top), `reading-row` 52 (the phone's sticky ToC row),
`reading-more` 56 (between the FAQ's topics) and `status-art` 440 (the status picture from 1128), and `platform.motion.dismiss` 80 (drag distance that closes a drawer whose size cannot be measured; the
panels travel their own size, U-09.8). They reach the theme next to the shared names; promote one to the shared
file when the application needs it.

## Motion (`motion` in `index.ts`, U-09.8)

ONE place for every duration and curve of the kit; the theme makes them `duration-<name>` and `ease-<name>`
(`--transition-duration-*`, `--ease-*`), and every motion of the web is CSS on those classes (U-12.2; the way in
`starting:`, the way out `data-[state=closed]:`, `Presence` of `$shared/lib/headless` keeping a leaving layer;
see «Motion» in `styling-guidelines.md`). `motion.ts` keeps only the leave's clocks (`leaveTimeout`: the token
and a 50 ms grace, `isMoving`).

| Name        | ms  | Curve                                                            | Source                                                                                                                                                                                      |
| ----------- | --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `standard`  | 250 | `cubic-bezier(0.2, 0, 0, 1)`                                     | Airbnb (every layer the application does not animate)                                                                                                                                       |
| `sheet`     | 250 | `cubic-bezier(0.16, 1, 0.3, 1)` (`expoOut`)                      | gorhom 5.2.14: Android 250 ms `Easing.out(Easing.exp)`; iOS a spring (damping 500, stiffness 1000, mass 3, `overshootClamping`, ~95 % at 0.26 s); the web keeps 250 ms `expoOut`, near both |
| `accordion` | 220 | `cubic-bezier(0.45, 0, 0.55, 1)` (`quadInOut`)                   | `accordionAnimationDuration` + `withTiming`'s default                                                                                                                                       |
| `zoom`      | 220 | `zoom-in` `(0.33, 1, 0.68, 1)` · `zoom-out` `(0.32, 0, 0.67, 0)` | `MODAL_ANIMATION_DURATION`, open `out(cubic)`, close `in(cubic)`                                                                                                                            |
| `label`     | 200 | `cubic-bezier(0.45, 0, 0.55, 1)`                                 | `FloatingLabel`'s `labelAnimationDuration` + `withTiming`'s default                                                                                                                         |
| `segment`   | 180 | `cubic-bezier(0.33, 1, 0.68, 1)` (`cubicOut`)                    | `THUMB_SLIDE_DURATION_MS` + `Easing.out(Easing.cubic)`                                                                                                                                      |
| `reveal`    | 800 | the `standard` curve (`ease-standard`), no curve of its own      | Airbnb's fade of what arrives (measured, U-14.1): the `CollapsingHero` photo and its pill once it loads (U-14.5)                                                                            |
| `consent`   | 400 | the `standard` curve (`ease-standard`), no curve of its own      | Airbnb's consent card rising in and out (the wave record §4.5): `CookieConsent`                                                                                                             |

The modal panel's pair (`panelFade` in `index.ts`, the application's `panelStyle`): `ease-modal-panel-in` and
`ease-modal-panel-out` are two curves each, for `transition-[translate,opacity]` — the rise on `zoom-in` /
`zoom-out` and the fade on `linear()` points of the same curve (none until it reaches 35 %, then linear in it),
generated by `to-css.ts` (`panelFadeCurve`).

Nothing reads the device's motion setting (U-12.1, which cancels U-09.13): no `motion-reduce:` / `motion-safe:`,
no `prefers-reduced-motion`. The owner's Mac has macOS «Reduce motion» on (System Settings → Accessibility →
Display) and the kit moves there as everywhere (`tests/architecture/motion.test.ts`).

## Containers (`max-w-*`, also `w-*`)

`narrow` 360 · `text` 480 · `form` 560 · `dialog` 568 · `content` 760 · `listing`
1120 · `page` 1440 · `wide` 1920. Tailwind's `max-w-sm … max-w-7xl` do not
compile. `dialog` is the Airbnb filter dialog the modal templates become from 744;
`wide` is the page column from 1920 (U-04, both started in the application).

Container queries use the same names: `@container` on the parent, `@<name>:` on
the child (`@form:inline-flex` = parent at least 560 wide). The header uses them:
the brand word shows from a 360 header, «Σύνδεση» from 560.
Two more, by the box and web only (`layout.css`, their widths are `--spacing-row-wide` 520 and `--spacing-card-wide`
340): `row-wide:` (a `ListRow` keeps its end beside it) and `card-wide:` (a `ProfileSummaryCard` `layout="page"` keeps
its numbers beside the person, and always below 744). One by the viewport (wave 3, `layout.css`): `narrow-phone:` is a
phone narrower than the `narrow` container's 360.
A zone and a box together (U-156, screen 51's band «Πώς ήταν η επίσκεψη;», `appointments/ui/detail/components/ask.svelte`):
`tablet:row-wide:` — the button beside the words only when the screen is from 744 **and** the band (its `@container`
wrapper) is at least 520 wide; in the narrow right column at 950–1035 it stays the phone's column. Tailwind's own
`@lg` (512) does not compile here (`--container-*: initial`), so the nearest name of the scale carries the rule.

The messages (wave 2, screens 18 + 21, web only): `inbox-list-w` 380 and `inbox-list-w-lg` 400 (`grid-inbox`, the list from
950 and 1128), `bubble-max-w` 560 (`max-w-bubble`: 78 %, at most 560 from 744), `bubble-avatar` 28, `composer-min-h` 44,
`composer-send` 36, `composer-field` 156 (six lines, `max-h-composer`; the #18's field starts there), `compose-field-max`
320, `contact-w` 288, `thread-pill-h` 36, `quote-max-h` 140, `inbox-art-w` 168; the corners `rounded-bubble` 20,
`rounded-*-bubble-tail` 6 (U-84.1, the one corner off the 4 grid); the composer's pill is `rounded-xl` 24 at every width; the roles `text-bubble` (16 / 1.4) and `text-row-line` (15 / 1.4); the height `h-split` (it was `h-inbox`: the inbox is the `SplitView`'s first reader, D-W4-52).
`bubble-avatar`, `composer-min-h`, `composer-send`, `composer-field` and the two roles are the prototype's,
from 744. Below 744 the web takes the application's numbers (U-81.2): `min-h-touch`, `size-control-xs`, `max-h-menu-max-h`,
`size-avatar-sm`, `text-body-lg`, `text-body-md`.

The doctor's sign-up (wave 3, screens 33–42, web only, the `WizardScreen` template): `wizard-column` 628 (Airbnb's 630
on the 4 grid, `max-w-wizard-column`), `wizard-top` 80 (the steps' own bar from 744; 64 = `bar-top` below it) and
`wizard-pill` 36 (its pills below 744; `control-sm` 40 from 744). The bar pinned under the steps keeps its room with
`pb-page-bar`. Below 360 `narrow-phone:` (above) gives the pills the prototype's narrower padding (`33-doctor/doctor.css`)
and leaves a pill with a glyph only the glyph (review w3-w1 MINOR-2).

The booking (wave 3, screen 30, web only, record §3.4; Airbnb's checkout, named without the product's word, U-02.1):
`checkout-main-lg` 440 is the one column from 744; from 950
`grid-checkout` sets the two columns, the panel `checkout-main` 384 (Airbnb's 386 on the 4 grid) / `checkout-main-lg`
440 from 1128 / `checkout-main-xl` 524 from 1440 beside the card `checkout-aside` 332 / `checkout-aside-lg` 368 /
`checkout-aside-xl` 372, `checkout-gap` 64 apart (`checkout-gap-lg` 80 from 1128). The card's photo is `checkout-photo` 80
below 744 (`avatar-2xl` 96 from it) and the note is at least `checkout-note` 104 high.

The phone's capsule with five tabs (D-W4-65, D-W4-73): `tab-capsule-fit` 400 is the screen from which the capsule is its
whole 384 (`tab-capsule-w` + 8 a side) — the variant `capsule-narrow:` reads it — and `tab-label` 11 / 600 is the words'
role under it, a role of the web alone (`platform.typography`), outside the shared scale whose smallest text stays 12.
Screen 50's capsules «Επερχόμενα / Ιστορικό» are `chip-tab` 36 high (D-W4-66).

The patient's appointments and relatives (wave 4.0, screens 50–55, web only, the `SplitView` template; the approved
prototype's `appt.css:227-333`, `55-relatives/appt.css:456-463`): from 950 `grid-split` sets the list `split-list-w` 420
(`split-list-w-lg` 460 from 1128) beside what it opened, the screen's height under the bar `h-split`; with nothing for
the right column (U-139.1) one column in the middle, `split-solo` 640. A change screen is `pane-column` 640 wide at
744–949 and, in the right column from 950, `split-sub` 656 / `split-sub-lg` 688 from 1128 / `split-sub-xl` 704 from 1440.
The right column's inset from 950 (the 51 and its change screens, `appt.css:232`, `:242`, `:245`) is `pane-inset` 48 a
side, `pane-inset-lg` 64 from 1128 and `pane-inset-xl` 80 on the left from 1440. The 51's wait draws the card's box
`pane-skeleton` 320 high (`.a-dsk .box`, `appt.css:205-206`) and the short one under it `placeholder-lg` 96 (`.box.s`).

The page column is 1440 and, from 1920, Airbnb's 1920 in the centre (its 4K zone,
U-04.1): `container-page` and `Container width="page"` add `wide:max-w-wide`; the
gutter stays the desktop's 48.

## Breakpoints (mobile-first)

| Variant    | From | Meaning                               |
| ---------- | ---- | ------------------------------------- |
| (none)     | 0    | phone                                 |
| `tablet:`  | 744  | tablet                                |
| `split:`   | 950  | two columns, gutter 32                |
| `laptop:`  | 1128 | desktop header (the bottom nav hides) |
| `desktop:` | 1440 | gutter 48, page centered              |
| `wide:`    | 1920 | 4K: the page column becomes 1920      |

`sm: md: lg: xl: 2xl:` do not exist (`--breakpoint-*: initial`). In hand-written
CSS use `>=` / `<` media conditions, never a one-line range.

## Icons, radii, elevation, sheets

- Icons (`icon-*`, width + height): `xs` 12 · `sm` 16 · `md` 20 · `lg` 24 · `xl` 32.
- Radii (`rounded-*`, closed scale): `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24,
  plus `full`/`none` — the application's five steps, and ONE web-only sixth, `panel` 32
  (`platform.radius`, U-25.4): only the web's panels and windows from 744 (the search panel
  under `SearchBar`, the filters window of wave 1.0). `radiusScale` (index.ts) is the theme's
  list (`to-css.ts`, `mergeTheme`, the scale guard); the shared file stays the application's
  copy. Bare `rounded` and `rounded-2xl … 4xl` do not compile.
- Elevation (`shadow-*`): `raised` · `overlay` · `floating` · `soft` · `bar`. The
  generated theme resets `--shadow-*` (`RESET_NAMESPACES` in `to-css.ts`), so these
  are the only shadows; Tailwind's `shadow-xs | sm | md …` do not compile (U-03.4).
- Motion: `animate-spinner` (8 spokes, one turn a second in 8 steps, the
  application's `ActivityIndicator`), `animate-skeleton` (the application's
  0.9 ⇄ 0.4 breathing, 850 ms each way), `animate-upload-ring` and the code field's
  `animate-caret-blink` (shadcn's, the kit's own since U-12.2), whatever the motion
  setting (U-12.1). They live in the `@theme` block of `src/routes/layout.css`; the transitions' durations and curves are the `motion`
  tokens (above). `can-hover:` (`@media (hover: hover)`, `layout.css`) is the variant for what a pointer reveals.
- Sheet heights (`max-h-sheet-*`, viewport %): `sm` 60 · `md` 70 · `lg` 85 · `xl` 90.
- Focus rings are `ring-3`; field focus is a border-color change (`border` +
  `focus-visible:border-ring`).

## Class merging

`cn` and `tv` come from `src/shared/lib/utils.ts` (one `tailwind-merge` config
built from `mergeTheme`: roles, spacing names, radii, containers, leadings,
elevations). Components never import `tailwind-merge` / `tailwind-variants`
directly (`tests/architecture/class-merge-imports.test.ts`).

A role passed in the `class` of a primitive whose own classes carry a `leading-*`
drops that leading (font size and line height conflict). Pass only what changes
(`<DialogTitle>` without `text-title-md`), or repeat the leading after the role.

## Rules (enforced by `tests/architecture/scale-vocabulary.test.ts`)

- No arbitrary size (`[15px]`, `(--x)`, `[width:…]`) in any size family, and no
  length in any other arbitrary value (`underline-offset-[3px]`,
  `drop-shadow-[0_2px_4px_#000]`, `[mask-size:15px]`); colors and length-free
  grid templates stay allowed.
- No line height written on a text size (`text-body-sm/7`, `text-body-sm/[20px]`).
- Numeric steps only 0–6 in halves; above that, a name. The same for `step(n)`.
- Every name exists in its family (a missing name renders nothing, silently).
- No old breakpoint prefix, no container query outside the container names, no
  Tailwind text size, no numeric leading.
- No size as a number in code or CSS: props (`sideOffset={8}`, `width={160}`),
  object keys (`{ margin: 8 }`), size or gesture constants (`MIN_THUMB = 20`,
  `FALLBACK_DISTANCE = 80`) and lengths in `<style>`, `style=`, `style:width` or
  `el.style.width`. Use `step(n)` or a token.
- Comments are ignored, strings are not: a `/*` inside `'image/*'` opens no
  comment.
- Do not scale font size with the viewport; letter spacing stays 0 unless a
  role says otherwise.
