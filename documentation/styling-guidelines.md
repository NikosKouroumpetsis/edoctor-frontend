# Styling Guidelines

## Baseline

- Tailwind CSS v4 is the styling engine.
- Color tokens live in `src/routes/layout.css`; non-color sizing tokens
  (typography, spacing, radius, elevation, breakpoints, containers, icons) are
  defined in `src/shared/design/tokens/tokens.ts` and generated into the theme.
  See [`design-tokens.md`](./design-tokens.md).
- shadcn-svelte uses `new-york` style.
- shadcn-svelte primitives belong in `src/shared/ui/primitives`.
- Feature-specific UI belongs in modules unless it has a real shared contract.

## Tokens

Prefer semantic tokens:

- `bg-background`
- `text-foreground`
- `bg-card`
- `border-border`
- `text-muted-foreground`
- `bg-primary`
- `text-primary-foreground`
- `ring-ring`

Avoid raw color palette utilities in feature code. If a raw color is required for a one-off visual, keep it local and document the reason in the component only when the reason is not obvious.

## Shared palette — single source of truth

The semantic color tokens in `src/routes/layout.css` are kept in 1:1 sync with
the eDoctor mobile application, which is the **canonical source** (U-03.4). The
canonical values live in:

- `application/src/shared/preferences/theme/light/index.ts`
- `application/src/shared/preferences/theme/dark/index.ts`

Rule: **a colour changes in the application first, then is copied here.**
`tests/architecture/color-parity.test.ts` («U-03.4: …») reads both files and
fails on a missing, extra or reordered name, a different value (light and
dark) or a name `@theme inline` does not map to `--color-<name>`. The shared
names, in the application's order: `background`, `foreground`, `card`,
`card-foreground`, `popover`, `popover-foreground`, `primary`,
`primary-foreground`, `primary-text`, `secondary`, `secondary-foreground`,
`accent`, `accent-foreground`, `rating`, `muted`, `muted-foreground`, `border`,
`input`, `ring`, `media-scrim`, `overlay`, `success`, `success-foreground`,
`success-text`, `warning`, `warning-foreground`, `warning-icon`, `danger`,
`danger-foreground`, `danger-text`, `destructive`, `destructive-foreground`.
The frontend stores them as hex (matching the application) so the two files can
be compared directly. Status read as **text** uses the `*-text` names
(`text-danger-text`, `text-success-text`), never the fill (`text-danger`).
`chart-1…5` and `sidebar-*` are web-only shadcn names without a consumer (the
guard ignores them; they are on the end-of-wave list).

`overlay` (`#00000080`, the same in light and dark) is the dimmed backdrop of the
dialog and the sheet: `bg-overlay`, the application's name (search-ux S-26.6),
never a static colour with an opacity such as `bg-black/50`.

Note: `accent` is the brand pink (`#BE185D`). It is reserved for intentional
brand elements (ratings, favorites, accent CTAs). shadcn primitives that use
`accent` only as a subtle hover/highlight surface (button `ghost`/`outline`,
select item) use `muted`/`foreground` instead so the brand pink is not applied
as a low-contrast background.

## Named tokens over raw values

No rem and no per-component sizes: every size is a named class from the central
scale (owner decision, search-ux S-05 … S-08). Arbitrary values (`text-[18px]`,
`h-[calc(…)]`, `ring-[3px]`), steps above 24px (`h-12`, `w-42`) and hidden
steps (`p-3.75`) are rejected by `tests/architecture/scale-vocabulary.test.ts`.

The scale is defined once, in `src/shared/design/tokens/tokens.ts` — a copy of
the application's canonical `values/index.ts`, kept identical by
`tests/architecture/scale-parity.test.ts` — and generated into the theme. Full
tables and rules in [`design-tokens.md`](./design-tokens.md):

- Step: `--spacing` 4px; numeric steps only 0–6 (≤ 24px) in halves.
- Typography: `text-display-* | heading-* | title-* | body-* | label-*`, never
  under 12px, running text `body-lg` (16). Each role bakes size + weight + line
  height; add `font-*` only for an intentional override.
- Line height: `leading-flat | tight | normal | relaxed | loose`, written after
  the role.
- Touch and controls: `touch` 48 (every target), `touch-gap` 8, visible shapes
  `control-xs/sm` 32/40, controls `control-md/lg/xl` 48/56/64, rows 56/72.
- Spacing roles: `inline` 8 · `rail` 12 · `list` 16 · `grid`/`card` 24 ·
  `section` 32 · `section-lg` 48; page gutters `gutter-sm/md/lg` 24/32/48.
- Containers: `narrow` 360 · `text` 480 · `form` 560 · `dialog` 568 ·
  `content` 760 · `listing` 1120 · `page` 1440 · `wide` 1920.
- Radii: `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 (+ `full`/`none`) — five
  steps and no sixth (the owner's decision, which the Airbnb dialog's 32 does not
  override).
- Elevation: `shadow-raised | overlay | floating | soft | bar` — the only
  shadows: the generated theme resets `--shadow-*`, so Tailwind's
  `shadow-xs | sm | md | lg …` do not exist (U-03.4).
- Icons: `icon-xs` 12 · `icon-sm` 16 · `icon-md` 20 · `icon-lg` 24 · `icon-xl` 32.
- Container: `container-page` (centered, `max-w-page`, gutters per breakpoint);
  `container-bleed` for rails that run into the gutters.

When a dimension repeats or encodes a design decision, add a name to the
canonical file (shared) or to `platform` in `tokens/index.ts` (web-only) rather
than inlining a value.

## Shared control spec

Every interactive element is at least **48 × 48** (`touch`), with 8px
(`touch-gap`) between neighbouring targets; the visible shape may be smaller and
sits centered in the box (`size-touch` button around a `size-control-sm` circle,
a checkbox box, a switch track or a slider dot). This replaces the former
"compact" 28 / 32 / 36 control scale. The few exceptions (segments of one
control, calendar cells, the web switch track) are listed in
[`design-tokens.md`](./design-tokens.md) (touch targets).

Text inputs, selects, comboboxes and search controls share one look with the
application: `rounded-md`, a 1px `border-input`, `bg-card`, a border-color focus
(`focus-visible:border-ring`) and 16px text at every size (iOS Safari zooms into
a focused field under 16). The sizes are the application's (U-07.1): the bare
`Input` is `sm | md | lg` (`md` by default; 48 / 48 / 56 with `px-3 | px-3.5 |
px-4`, `inputSizes`) and the `Textarea` `sm | md | lg` (its min-heights and
insets). The field family (text, password, phone fields, the combobox and the
date of birth) is `FieldSize` = `default | lg | xl` (48 / 56 / 64): the box is
`fieldSizes` in `input.svelte`, the label `FloatingLabel` (below); the select
trigger keeps its own `default | lg | xl` map. A page that relied on the former
Input default keeps its look with an explicit size and class (declared per
consumer in the round's report). Buttons use the same heights (`default` 48, `lg` 56) and keep the
shadcn focus ring (`ring-3`); a round icon control is `IconButton` (48 × 48
touch box around the application's looks), not a button size. Its look is typed
as the application's (its delta R1): the `scrim` is the 48 circle only, the `tile`
the 48 or 64 square, the lift (`elevated`, `shadow-floating`, the application's
`shadowStyle`) only on a shape that is its own target (48 / 64), and a
`decorative` button draws its shape alone (no 48 box). The caller's `class`
places an icon button but never sizes it (`tests/architecture/touch-targets.test.ts`).

The overlays keep the application's sizes: `Dialog` without a `size` is
`max-w-text` (480) with 24 to the screen's edges on the phone (`inset-x-6`, the
application's backdrop `p-6`), a side `Sheet` `w-3/4 max-w-narrow` (360), and their
«×» is the 48 box in the panel's corner with the 16 glyph at 70 %. Every modal layer
(`Dialog`, `Sheet`, `Drawer`/`BottomSheet`, the modal templates) closes on a press on
ITS backdrop and on an Escape pressed inside it (`escapeKeydown`), never on a
pointer-down anywhere on the page: a Select, Popover or menu of its content (in a
portal) keeps it open, and a panel that takes Escape first (`preventDefault`) does
too. The layers that are not modal (popover, menu, combobox, tooltip: the
`dismissable` action, a capture listener on the document) take Escape first and
consume it, so with a popover open in a modal the first Escape closes the popover
and the second the modal. That order holds for one level: two `dismissable` layers
open one inside the other close the OUTER one first (their listeners run in the
order they opened), a known limit, not a regression (review R2, NIT-R2-2). Panels
can take the focus (`tabindex=-1`) and draw no browser outline (`outline-none`): a
modal layer that opens puts the focus on its panel, never on its «×» (U-09.7,
`focusTrap` `initialFocus: 'container'`, the default); the first Tab reaches the «×»
(first in the DOM), the trap and the focus given back on closing stay. Every
floating layer enters AND leaves (U-09.8), in CSS (U-12.2, «Motion» below): the backdrops fade,
a dialog, popover, menu, list or hover card grows from 95 % (a tooltip from 90 %) and
fades (250 ms, Airbnb's curve), a side `Sheet` (the `SiteNavbar` menu) slides in from
its side and back, a `Drawer` / `BottomSheet` rises and descends on 250 ms `expoOut`
(gorhom's Android curve, near its iOS spring of ~0.26 s), the modal templates zoom on
the application's 220 ms. They play whatever the device's motion setting (U-12.1).

`Button` is the application's `atoms/button` (U-03.1, card K1.1): `label`,
`tone` (`primary | secondary | accent | contrast | ghost | muted | outline`),
`size` (`default | lg`), `radius` (`sm | md | lg | full`, default `md`),
`labelCase` (`normal | uppercase`, default `normal`), `bordered`, a `leading`
snippet, `loading`, and `href` (renders `<a>`). An element that must stay
another component (an overlay's trigger or close) takes the same look with
`buttonClasses({ tone, size, radius })`.

The `stepper` molecule is the number control for forms, identical to the
application's `app-stepper` (search-ux S-26.4): its whole title above a 56 box
(`min-h-control-lg`), «−» left, the number centred (typed, `inputmode="numeric"`),
«+» right, both 48 × 48 (Ionicons `remove` / `add`) and disabled at their bound,
the helper/error line below. The input is the one `spinbutton` (ArrowUp/ArrowDown
step it; `aria-valuetext` is the number as shown and a blank box is the caller's
`emptyValueLabel`, never «0»); the buttons stay out of the Tab order. Their names
and the blank value are **required props** (`decreaseLabel` / `increaseLabel` /
`emptyValueLabel`): the shared UI reads no locale (U-02.1, U-03.5), so a page
passes `m.stepper_*({}, { locale })`. The former `number-field` is gone (owner,
U-06.12): the stepper is the one number control.

Each `slider` thumb says its value as the screen shows it: `aria-valuetext`
from `formatValue(value, thumbIndex)`, the plain number by default (search-ux
S-26.9, the application's name). The range-histogram passes its pills' text — the caller's
required `formatValue` (U-03.11: «80 €», «420+ €» at the ceiling) — and the stepped-range the stop's label.

Separately, several visual primitives and overlays expose an **opt-in**,
generic `size` prop (a distinct concept from the control sizes above, and from
the button scale). Where the application has the component, the names and the
geometry are its own (U-07.1): `Avatar` `sm | md | lg | xl`, `Checkbox`,
`RadioGroupItem` (ring 20 / 24 / 32, dot 10 / 12 / 16), `Switch` (the shared
`switchGeometry`), `Toggle` and `InputOTP` `sm | md | lg`, `Progress` `sm | md`,
all `md` by default. `Badge` is `sm | md`; the overlays are `sm | md | lg`
(`DialogSize`, `SheetSize`, `DrawerSize`, `PopoverSize`, `HoverCardSize`, R7-2: the
application's names; `Dialog` `sm` 480 by default, `HoverCard` `md` the application's
256); `SliderSize` keeps `sm | default | lg`; `Card` has no size (the application's
one shell, U-09.2). Each component owns its type and applies it
through a local size map whose values are named tokens. `size` scales
the visible parts together (box and glyph for checkbox/radio, track + thumb +
travel for switch and slider, panel width/height for dialog/sheet/drawer/popover/
hover-card); the touch box stays 48 at every size.

### Motion (U-12)

Every motion of the web is CSS of Tailwind on the `motion` tokens (`duration-<name>`
`ease-<name>`, `design-tokens.md`), never a JS library, a Svelte transition or a class
of `tw-animate-css` (U-12.2), and none of it reads the device's motion setting: no
`motion-reduce:` / `motion-safe:`, no `prefers-reduced-motion` (U-12.1, the owner's Mac
has «Reduce motion» on and must see them, as on flowbite). `tests/architecture/motion.test.ts`
guards both.

- **A layer** (`Dialog`, `Sheet`, `Drawer` / `BottomSheet`, `ModalScreenSurface`,
  `Popover`, `DropdownMenu`, `Select`, `Combobox`'s list, `Tooltip`, `HoverCard`,
  `SearchPanel`) enters with `starting:` (`@starting-style`: its first style, which a
  node moved to `<body>` by `use:portal` gets again there) and leaves with
  `data-[state=closed]:`, through `transition-[…] duration-<token> ease-<token>`. The
  one helper is `Presence` (`$shared/lib/headless/presence.svelte.ts`): render while
  `present`, `data-state={state}`, `inert={closing}`, `use:presence.track` on each node
  that leaves; it removes the layer once each tracked node's OWN `transitionend` fired
  (a child's does not count), at once when nothing moves, or at the token's duration
  and a 50 ms grace (`leaveTimeout`). Opening again on the way out keeps the nodes, so
  the CSS turns back from where it is. The trap, Escape and the outside press let go as
  the leave starts (`enabled: presence.open`), which gives the focus back to the trigger
  then; the scroll lock goes with the node, when the leave ends (so with bars that take
  room the page under a backdrop still fading never shifts; opening again on the way out
  keeps the one lock). A `Drawer` slides on `translate` while a drag moves it on
  `transform`: a drag that closes it leaves from there, and its backdrop fades from the
  dimming the drag reached.
- **The modal surface's zoom** (`ModalScreenSurface`) measures where CSS drew it, writes
  the tapped control's place, size and corner into `--modal-zoom-from` / `--modal-zoom-radius`
  (the `modal-zoom-from` utility of `layout.css`) and puts the node back in its place,
  so `starting:modal-zoom-from` opens it from the control; on closing it measures again
  when it is at rest (mid-zoom its box carries the zoom, so it keeps the end of the opening)
  and `data-[state=closed]:modal-zoom-from` closes it there (220 ms, `ease-zoom-in`, then
  `ease-zoom-out`). Its panel rises 18 and fades in only past 35 % of the zoom
  (`ease-modal-panel-in | out`, the application's `panelStyle`).
- **A pill that moves** is ONE node whose `transform` (and size) changes, so its CSS
  transition carries it: `SegmentedControl` (180 ms `segment`, placed by CSS from the
  first render), `Tabs` (the same 180 ms, from the chosen tab's measured box with `offset*`
  and a `ResizeObserver`; until measured, or while its box is empty in a hidden parent, the
  chosen tab draws its own `bg-card shadow-raised` surface, then the pill takes it over in
  place, across or down; a vertical list stretches every tab to its own width, U-13.1) and
  `SearchBar` (250 ms `standard`, measured the same way; it fades
  in on its segment when the bar opens and out where it is when it closes, never sliding
  from a corner).
- **The `Accordion`** opens and closes its one grid row `0fr ⇔ 1fr` with the opacity
  (220 ms `accordion`), its cell `min-h-0 overflow-hidden`; the chevron turns 180°.
- **Every floating label** moves its `translate` / `scale` (and `left` beside a leading
  icon) on 200 ms `label`, the colour at once (`FloatingLabel`, below).
- **A photo that arrives** (`CollapsingHero`, U-14.1, the application's structure): its node (`<id>-reveal`, the
  photo and its «1 / N» pill, U-14.5) fades 0 ⇒ 1 on `transition-opacity duration-reveal ease-standard` (Airbnb's 0.8 s) once the photo's `load` fires
  (`data-loaded`), over the muted fill (`<id>-waiting`) that goes when that node's own `transitionend` fires or on the
  token's clock (`leaveTimeout('reveal')`). Every FIRST showing of an address fades in, even one the browser already
  decoded at mount (`complete` with a size: cache, or loaded before hydration); only an address shown before in the
  session (a module `Set`, the application's `loadedPhotos`, filled only in the browser) shows at once, without the
  fade or the fill (U-14.5). The node's style is committed at opacity 0 (`getBoundingClientRect`) before
  `data-loaded` turns it 1: `@starting-style` cannot give the start, as its `opacity: 0` loses to the more specific
  `data-[loaded=true]:` rule.

## Components

- Use the in-house primitives in `src/shared/ui/primitives` for common controls.
- Build new headless behaviour on `src/shared/lib/headless`; do not add an
  external UI component library (no Bits UI).
- Keep primitives low-level and domain-free.
- Put domain composition in module UI slices.
- Do not create nested card layouts unless the inner card is a repeated item, modal, or genuinely framed tool.

### Card kit (wave 0, dyad 3)

The application's cards, unit for unit (cards K3.1–K3.7); every word, number and
amount comes formatted from the caller (U-02.1: «4,9» / «4.9», «Από 40 €» /
«From €40», «Νέο», «0,1 χλμ» are the page's, S-31.1–S-31.3):

- `MediaCard` (organism) — the photo on top (`imageClass`, a `media` height such
  as `h-card-rail-media tablet:h-card-rail-media-lg`; the 4:3 `aspect` is an option
  a screen may choose, never the default), `loading="lazy"` unless the caller says
  `eager`, and the no-photo silhouette both without a photo and when it does not
  load (S-32.8 / S-32.13). Snippets `media` (a gallery instead of the photo),
  `badge`, `action`, `overlay`, `children`; `variant` `plain` or `framed` (`bg-card
shadow-raised rounded-xl p-3`). With `href` + `linkLabel` the WHOLE card is one
  link, as Airbnb's: an empty `<a>` under the photo and the words, which let a
  press through (`pointer-events-none`), while their own links and buttons (the
  heart, a «Συνδεθείτε για κόστος», a gallery) sit over it, outside the link.
- `PhotoCarousel` (organism) — a `scroll-snap` track, one photo a page; only the
  shown photo and its `neighborWindow` neighbours mount an `<img>`; dots over the
  photo, or a «2 / 5» counter (`counterLabel`); ‹ › only with `scrollLabels`, from
  `laptop:` (`controlsFrom`), the `Carousel`'s arrows (`carouselArrowClasses`, U-09.3): ON the photo, 12 from
  its sides, centred on its height, the 32 circle of the 90 % white scrim with a shadow and the 12 chevron; with
  a pointer (`can-hover:`) on hover or focus, on touch always; gone at the ends. A cover that
  does not load turns the whole gallery into one silhouette, without dots, counter
  or arrows (S-32.13). Inside a card link (`href`) every photo opens it too, as a
  pointer-only twin (`tabindex=-1`, `aria-hidden`).
- `ThumbnailCard` (molecule) — the profile's article card; a photo that does not
  load leaves the muted box, no silhouette (U-03.11).
- `Rating` (primitive) — `inline` (the card's star + score), `stat`, `value`,
  `stars`; stars in the `rating` colour (S-32.11); `aria-label` makes it one image.
- `LaurelScore` (molecule) — `normal`, `large`, `score`, `filled` laurels in the
  `rating` colour with the firmer stroke.
- `PriceLabel` (primitive) — `kind` `amount` · `action` · `note` in `placement`
  `card` · `card-list` · `bar` · `offer`: the application's twelve looks; the
  action is the kit's `TextButton` (48 box, `onAction` or `href`).
- `MapThumbnail` (primitive) — the decorative mini map, inert and hidden: the three roads at the
  application's angles (`rotate-[18deg]`, `-rotate-[12deg]`, `rotate-[10deg]`); angles are not lengths, so
  an arbitrary angle is allowed where a size never is (S-05.4).
- `MetaRow` (molecule) — the card's wrapping line of facts (glyph + words), with
  the application's tones (`primary` words are `primary-text`, S-32.19).
- `GuidanceCard` (organism, U-14.2) — the application's, class for class: the `Card` shell with `gap-6`, the
  `eyebrow` pill on the accent tint, the `heading` title, the body, then one tinted row per rule (primary, accent,
  muted; a fourth and later muted). Its API is the application's (`eyebrow`, `title`, `body`, `rules`, `class`); the
  words are the caller's and it gives no role (text, as the application's views).

### Search and filters kit (wave 0, dyad 4)

The application's search units (cards K4.1–K4.7) plus the web's Airbnb bar (U-05.4); every word, value and
count comes from the caller (U-02.1), the zones only by CSS (U-03.1):

- `SearchTrigger` (molecule) — the floating card pill, one line (search glyph + words) or two (title over a
  muted line); `onclick` without an action ⇒ inert; `layoutOf(element)` gives the rect a modal zooms out of.
  `hideFrom="tablet"` (default) hides it from 744, where `SearchBar` takes over; `none` keeps it everywhere.
- `SearchBar` (organism, web only) — from 744 (`hidden tablet:block`): the segments in one `min-h-search-pill`
  pill, from 950 Airbnb's 850 × 66 (`split:max-w-search-bar-w`, `split:min-h-search-bar-h`, U-05.5); the open
  segment is a card «island» on the muted bar — ONE white pill (`search-bar-pill`) measured from the open
  segment's box in the row, that moves as a whole (place, width, height) to the next segment either way (250 ms,
  Airbnb's curve, U-12.3), fades in on its segment when the bar opens and out in place when it closes, and keeps
  the panel's content while that fades out — its panel under the bar; the accent search button grows its words
  while a panel is open. A segment with `search` («Τι», «Πού») is typed in the bar while open (U-05.6): the
  island is the field's label, the `<input role="combobox">` drives the panel's listbox (`aria-activedescendant`,
  `handleListboxKeydown`; Enter commits through `search.onCommit`), the panel snippet gets
  `{ listboxId, activeId }` to wrap its `option` rows in. Choosing one step and moving on to the next (Airbnb's
  «Πού ⇒ Πότε») is the caller's `active`; the keyboard's focus follows it — the new segment's field or button,
  the closed one's button after Escape — unless the user took it outside the bar (MINOR-3).
- `SearchPanel` (organism, web only) — the generic shell of a search panel: below 744 the whole screen with the
  search modal's header and a pinned footer (modal: focus trap, scroll lock), from 744 a dropdown card under its
  `relative` parent (not modal). CSS picks the shape; the panel reads its own computed `position` to know which
  behaviour applies (`coversScreen`), never the width. Escape and a press outside (not on `anchor`) close it, only
  while it is drawn (an open panel inside the bar hidden below 744 takes no key and no press of the page).
- `SearchSummaryBar` (molecule) — the results bar: «←», the two-line pill, the filters `IconButton` with its
  count; the pill and the filter button hand their rect to `onOpenSearch` / `onOpenFilters`; `testId` names the
  bar, `testIdPrefix` its three controls (the application's `testID` + `testIDPrefix`).
- `SearchField` (molecule) — typed per `variant`, as the application's: `launcher` (a button drawn as a field,
  `onclick`, no typing or clear), `active` (dark 2px, «‹» and the tinted clear, each with its name), `inset` (the
  former search input, glyph inside, bare clear named by the caller or `common_clear_search`; 16 text as every
  web field). With `listboxId` +
  `optionIds` it is a combobox: the arrows move `activeId` (`aria-activedescendant`, `handleListboxKeydown` in
  `src/shared/lib/headless`), Enter commits it, Home and End stay the caret's (APG), the focus stays in the field
  (the `command` precedent).
- `OptionRow` (molecule) — the 56 row with the 40 tile, the label (bold match with `query`), the muted line, the
  count and the check; `accessibilityRole` `button` · `radio` · `option` (web only: a row of a combobox list,
  `aria-selected` on the keyboard's row, drawn with the focus ring, a press keeps the focus in the field). Its
  name is the label alone (the application's `accessibilityLabel`), the muted line and the count its
  description. `SuggestionGroupHeader` names a group, above the listbox (only options inside it);
  `HighlightText` (primitive) folds case and Greek accents (`foldSearchText` in `src/shared/lib/text`).
- `Accordion` (primitive) — the application's API: `collapsible` and `showChevron` off by default,
  `toggleOnClick`, 220 ms, the height and the opacity together (one grid row `0fr ⇔ 1fr` in CSS, U-12.6), the
  chevron turning 180° on the same 220 ms (`duration-accordion ease-accordion`, U-09.11);
  `AccordionItem variant="card"` the criteria cards: the frame over the default item's
  classes (its `last:border-b-0` kept, as the application's), the trigger's and the content's 16 inset after the
  caller's classes. The item clips (`overflow-hidden`, the application's) at the trigger's edges, so the trigger's
  ring is inset (on the card `rounded-lg`, the card's corners), as the rows inside it (`CheckboxRow`).
- `CheckboxRow` (a count of `''` is drawn), `SegmentedControl` (a radio group; the thumb placed by CSS from the
  first render, without a slide, then sliding to the chosen segment in the application's 180 ms `out(cubic)`,
  `duration-segment ease-segment`, U-09.1),
  `SelectableCards` (`options`, the application's 1px card) and `RangeHistogram` (`formatValue` required,
  U-03.11) — molecules.
- The filters dialog is no unit (U-05.1): the page composes `FullscreenModalTemplate`, `Section
variant="divided"` and `ActionBar preset="filters"` (`Showcases/Filters dialog`).

### Dates and profile kit (wave 0, dyad 5)

The application's profile units (cards K5.1–K5.11) plus the web's Airbnb photo grid (U-05.7); every word, date, time,
score and amount comes formatted from the caller (U-02.1, S-31.2, S-32.9), the zones only by CSS (U-03.1). No page uses
them yet (U-01.2). The map (K5.12 `MapPreview`) is not on the web: it needs MapLibre, a new dependency (U-03.10).

- `DateStrip` (molecule) — every day in ONE sideways row (S-26.1): the application's card (`min-w-day-card-min-w`,
  `rounded-lg border`, the chosen one `border-foreground` and semibold, a closed one `opacity-40` and disabled), as wide
  as `toDayCardWidth(stripWidth)` once the strip measures its OWN width (whole cards and half the next one). It opens on
  the chosen day once, without motion, as soon as that day is drawn (days that load later too); a press ends that.
  Buttons with `aria-pressed` in a group named by the required `aria-label` (the
  `ToggleGroup` pattern): one Tab stop, the arrows, Home and End only move the focus, Enter, Space or a press choose.
  ‹ › only with `scrollLabels`, from `laptop:` (`controlsFrom`, as `Rail`), off until measured, a page = the whole
  cards in view.
- `TimeSlotGrid` (molecule) — a radio group of 48 chips named by the required `aria-label` (the arrows choose), the
  chosen one the solid `bg-primary` as
  the application's; `columns` a count or one per zone (the `ResponsiveGrid` classes, `gap-rail`); no time ⇒ the
  caller's `emptyText`. A CSS grid keeps the last row's width, so there are no spacer cells (no `-time-spacer` id).
- `DateCard` (primitive) — the 64 day card of a grid, `onclick` or `href`, named «title, subtitle» unless the caller
  names it. `PillTabs` (molecule) — content-sized pills in a scrolling `tablist` (automatic activation, as `Tabs`),
  named by its `heading` or `aria-label`; no tabs draw nothing. In a scrolling row the focus ring is inset
  (`ring-inset`), so the scroller never clips it.
- `CollapsingHero` (organism) + `OverlapSheet` (molecule) — below 744 the application's hero (`hero-h` 360 /
  `hero-h-lg` 468, the «1 / N» pill on the 75 % secondary scrim above the 32 overlap, the silhouette without or after
  a failed photo, S-32.8 / S-32.13) and the sheet that rises over it. The page drives the motion through `imageStyle`
  (on the photo and on the muted fill that waits for it) / `overlayStyle`. `loading` (U-14.1, the application's name)
  draws the kit's breathing `Skeleton` over the whole frame (`<id>-skeleton`, square as the photo it stands for, U-14.5),
  without the pill or the silhouette; the photo then fades in on `reveal` (Motion, above), its «1 / N» pill in the same
  node, so the pill lights up with it (U-14.5). The `<img>`'s own `loading`
  is `imageLoading` (`eager` by default). From 744 the hero hides (`hideFrom`, default `tablet`) and the sheet is a plain column
  (`flatFrom`, default `tablet`); `none` keeps the application's look at every width.
- `PhotoGrid` (organism, web only, U-05.7) — from 744 Airbnb's listing grid: one large photo over two columns and rows
  and a 2 × 2 block, 8 apart, `aspect-2/1`, the corners only outside (`overflow-hidden rounded-xl`); a missing or failed
  photo leaves the silhouette in its slot, none at all is one silhouette; «show all photos» (`showAll`) is the outline
  `Button` on the card surface at the bottom right; `onOpen` makes each photo a pointer-only twin and type-checks only
  with `showAll`, the keyboard's way in (WCAG 2.1.1).
- `InfoRow` (molecule) — the four rows of study D4 (`circled`, `plain`, `plain-wide`, `inline`); only `inline` acts
  (`onclick` or a `tel:` `href`), named «title value».
- `StatStrip` (molecule) — cells between hairlines, the `wrap` cell taking the rest; when a word of it overflows its
  cell (the browser does not break words, the application's text does), it takes its own line above the others
  (S-26.2). A new width of the strip itself, new `wrap.text` or a font that arrives (`document.fonts` `loadingdone`)
  try the row again; while it is the row, any change of the strip's or the wrap cell's box checks the words again (a
  `ResizeObserver` on both, never the screen).
- `ProfileSummaryCard`, `ReviewSummary`, `ReviewCard` (`rail` cut at three lines with the «more» row reserved, `list`
  whole with the aspects; the body is measured, not a hidden twin, again when its box changes or a font arrives),
  `ProfileSummaryCard`'s stats column `min-w-0` so a long label is cut (Yoga's `minWidth: 0`), `RatingDistribution`
  (accent bars named by their star; the categories' row scrolls and takes the focus, a group named by the required
  `categoriesLabel`; `bleed` `gutter-sm` | `zone`), `OfferingCard` (the caller's
  `price` snippet), `BadgeGroup` and `NumberedList` (lists the title names), `StatHighlight`, `IconButtonRow`
  (`start` 48 / `centered` 40 circles; a link with `external` opens a new tab with `rel="noreferrer"`) — molecules.
- `Avatar` takes the application's `xl` (64, initials `text-title-sm`) and `Progress` its `tone` (the indicator a
  slid pill, so its end is round as the application's).

### States kit (wave 0, dyad 6)

The application's state units (cards K6.1–K6.4) and its `Banner`, class for class; every word comes from the caller
(U-02.1), the zones only by CSS (U-03.1). No page uses them yet (U-01.2); the error page (`routes/+error.svelte`) waits
for its screen's discussion.

- The application's `Card` is ONE shell, `cardShellClasses` of the `Card` primitive (`rounded-xl border
border-border/70 bg-card/95 p-6 shadow-soft`, a column); the state cards draw it with their own inset after it
  (`cn(cardShellClasses, 'gap-2 p-5')`). The `Card` compound is that shell too (U-09.2): its header, content
  and footer add no inset of their own (the card's 24 holds them); a caller that wants the former shadcn look says
  so with its classes (`DoctorCard`).
- `EmptyState` (molecule) — a title (`titleAs`, `p` unless the page names its level), a line and at most one way on:
  the sentence-case outlined `Button` (`radius="md"`, `text-body-md`, S-32.3) with `onActionPress` (the
  application's) or, web only, `actionHref`; words without either draw no button (a type error too). `framed` sets
  the column in the card with the 8 inset (`p-2`) and the `testId` on the card. `ErrorState` (molecule) — the empty
  state with the ONE retry the caller owns (`actionLabel` + `onActionPress` required); `plain` pads it (`py-6`).
- `InlineNotice` (molecule) — `muted` (an empty or failed list), `tint` (a note on the soft fill), `danger` (a refusal
  in `danger-text`); the action is the kit's `TextButton` (48 box, underlined but in `danger`), shown only with both
  `actionLabel` and `onAction`. Its live role follows the look (`muted` `status`, `danger` `alert`, `tint` none); the
  caller's `role` wins (`null` = none).
- `ResultsCount` (molecule) — the count over an optional muted line in the card (`gap-2 p-5`), a polite live region
  read whole (`aria-live="polite"`, `aria-atomic`). `KeyValueList` (molecule) — an optional title over a description
  list (`dt`/`dd`) in the card (`gap-4 p-5`); the label keeps its width (`shrink-0`, as a React Native view), the value
  is cut on one line (`min-w-0 flex-1 truncate`).
- Placeholders (molecules) — `OptionRowSkeleton` (still rows, study D6), `SkeletonLines` (`lines` of `height` /
  `width` classes of the scale, `h-6` and `w-4/5` for the application's `'6'` and `'4/5'`: a numeric height in code is
  a size the scale guard refuses; `shape` `line` | `block`, `startsGroup`; the caller's `class` replaces the default
  `gap-2`), `SkeletonCard` (`carousel` | `list`), `SkeletonRail` and `SkeletonSection`. Each is `aria-hidden`; the region
  that waits sets `aria-busy` (the caller's). They breathe through the `Skeleton` primitive, whatever the
  device's motion setting (U-12.1). A row that the application's screen cuts is `overflow-hidden` on the web, so the page
  never scrolls sideways.
- 🔴 D13: `cardSizeOf(layout)` (`SkeletonCard`) is the ONE size map of a media card and its placeholder: `{ mediaClass,
widthClass }` with the tablet step as a `tablet:` class. A page's card passes it to `MediaCard` (`imageClass`,
  `class`), so the placeholder is always the size of what replaces it.
- `Banner` (molecule) — the application's banner as it is: the tone's glyph (`information-circle`,
  `checkmark-circle`, `warning`, `alert-circle`), a semibold title over an optional line in the tone's soft tint;
  `solid` fills the status tones (`info` keeps its tint, S-34.1); a dismissable one (`onDismiss` + the required
  `dismissLabel`) has its «×» in the 48 box. Its live role follows the tone: `danger` an `alert` (it interrupts the
  reader), `warning`, `info` and `success` a polite `status`; the caller's `role` wins (`alert` when it is urgent,
  `null` for none). The application writes `accessibilityRole="alert"` on every tone, but there it announces
  nothing (no live region on iOS or Android); on the web an `alert` is assertive, so a static banner would cut in.

### Owner review, round 1 (U-06, sections 1–4)

The web takes the application's stories for every shared unit (U-06.1: the same list, order, names and Greek
words; the web's own idiom only where the platform needs it, e.g. an `aria-label` on a bare control):

- **Nothing runs past the 375 phone** (U-06.2). A story never sets a fixed width wider than the canvas without a
  cap: `w-full max-w-narrow`, never `w-narrow` (`tests/architecture/story-widths.test.ts`). In the kit a
  content-width trigger is capped (`Select`: `max-w-full`, the words `min-w-0 truncate`), the `Slider`'s thumbs sit
  on a rail inset by half the 48 touch box (`mx-6`), so a thumb at either end stays inside, and the
  `SteppedRange` ticks and labels and the `RangeHistogram` bars sit on that rail; the `CookieConsent` actions stack
  on the phone. A cap counts only when it fits the phone itself (`max-w-full`, `max-w-screen` or a name no wider
  than the 343 canvas): `w-form max-w-form` is still 560.
- **No visible bar on a sideways row** (U-06.4): every `overflow-x-auto|scroll` of the kit takes the shared
  `scrollbar-none` utility of `src/routes/layout.css` (touch, wheel and keys scroll; the `Rail` adds ‹ › from 1128).
  `ScrollArea` is the one exception: it draws its own thin bar (`tests/architecture/scroll-rows.test.ts`).
- `Label` is the application's (`label`, `required` with the danger «\*» read as `common_required`, `disabled`;
  `text-label-lg font-medium`). `FormField` (molecule) is the application's: label, the control from the
  `children` snippet with `{ id, aria-describedby, aria-invalid }`, one plain line (the error, polite, else the
  helper).
- `FloatingLabel` (primitive) is the application's atom: `floated` (focus or a value), `focused`, `error`,
  `insideBorder`, `leading`, `size`; the text, phone-inline and combobox fields draw their label with it, with the
  classes they drew by CSS before, and an input the browser autofilled floats it by CSS (`peer-autofill:`). It
  moves as the application's (U-12.5): `transition-[translate,scale,left] duration-label ease-label` (200 ms
  `inOut(quad)`), the colour at once; every field keeps the same `<label>` while it floats and rests, so the
  transition runs (`floating-label.consumers.test.ts`), and a first draw with a value is floated with no motion.
- `StepProgress` (`thickness` `sm | md | lg` = `h-0.5 | h-1 | h-1.5`, U-06.9) and `UploadRing` (the indeterminate
  quarter arc turns every 900 ms, `animate-upload-ring`) are the application's.
- `MediaBadge` `width="badge"` is a minimum (`min-w-badge-w`): it grows with its words to the photo less its insets
  (`besideAction`: a touch box short of the end), two lines, then «…»; its whole words are its `title` (U-06.3).
- The vertical `Divider` has the same 16 on both sides of its line (`mx-4`, U-06.6).
- `SteppedRange` labels never touch (U-06.10): measured, then placed by `pickStepLabels` (the chosen ones first, the
  second moved out or merged into one «A – B», then the ends, then the rest; one hidden when the room is under 8);
  none shows before it is measured. A press or a drag on a slider draws no ring, the keyboard's ring is unchanged:
  the press focuses the thumb with `focus({ preventScroll: true, focusVisible: false })`, because Chrome lets a
  scripted focus match `:focus-visible` even after a pointer, and the arrows still move the thumb after a drag.
- `Command` draws a line between its shown groups and hides a group none of whose items matches; `MultiSelection`
  takes the application's `max`; `Toggle` / `ToggleGroup` the application's look (`label-md`, the accent pressed
  fill with the secondary foreground, the `sm` corner) with the group's corners per `orientation`; `Combobox` has no
  search glyph by default (the application's look, U-07.3) and its trailing glyph is `icon-md`, as the
  application's; `FavoriteButton` defaults to the application's `lg` heart and `md` inset.
- `Text` breaks a word wider than its line (`wrap-break-word`, = `break-words`: overflow-wrap, never `break-all`),
  as React Native does (U-06.2); words that fit never break.
- Known limits (R1 review, for the field family's design): `FormField` and `FieldMessage` add `aria-live` with the
  message itself, so a screen reader may not announce a new error (NIT-2); inside a `MediaCard` link the badge lets
  the press through (`pointer-events-none`), so its `title` shows no tooltip — its words are in the DOM (NIT-4).

## Icons

The kit draws the application's glyphs (U-03.3): **Ionicons**, as local SVG
paths in `src/shared/ui/icons/ionicon/glyphs.ts` (only the names the kit uses,
taken from the application's installed font; MIT, see `icons/ionicon/LICENSE.md`),
with the application's names:

```svelte
<Ionicon name="heart-outline" class="icon-md" />
```

`Ionicon` is `aria-hidden` unless it gets a `label`, fills with `currentColor`
and sizes with the `icon-*` scale. Brand marks are components of the same
bucket (`BrandApple`, `BrandGoogle`, the laurel halves). A new glyph is added to
`glyphs.ts` from the application's font, never downloaded. Older screens still
use Icones virtual imports (`~icons/lucide/*`, no new package); they move to
`Ionicon` as their units are rebuilt. Do not import icon component packages such
as `@lucide/svelte`.

## Themes

- Theme preference is `system | light | dark`.
- The resolved theme is `light | dark`.
- Theme state lives in the shared preferences layer.
- Persisted preference keys are env-scoped through `edoctor.<appEnv>.preferences.v1`.
- The pre-paint script in `src/app.html` reads that same snapshot (`themePreference`)
  before the first paint, so a saved theme never flashes the other one on load.
  `src/hooks.server.ts` writes the key into the `%edoctor.preferences.key%`
  placeholder, next to the Paraglide `lang`/`dir` placeholders.

## Responsive UI

Breakpoints (mobile-first; base styles target the 375px phone design):

- `tablet:` 744 · `split:` 950 · `laptop:` 1128 · `desktop:` 1440 · `wide:` 1920.
  The old `sm: md: lg: xl: 2xl:` prefixes no longer compile. A rule of the phone
  alone takes `max-tablet:` (`max-tablet:leading-tight` beside a `tablet:` role,
  so the phone's leading never outlives the tablet's role).
- Content is centered with a max width of 1440 (`max-w-page` via
  `container-page`), 1920 from 1920 (`wide:max-w-wide`, U-04.1); the side margins
  grow beyond it. Gutters: 24 below 950, 32 from 950, 48 from 1440.
- The desktop top navigation shows from `laptop:` (1128) up; below it the
  app-style bottom navigation (`laptop:hidden`) is shown instead.
- Bottom navigation items are 48 × 48 targets (`min-h-touch min-w-touch`) with
  12px labels; the row spaces them evenly and reserves the device safe area
  (`pb-safe-area`). The footer reserves the bar's space with `pb-bar-bottom`.

- The layout kit (wave 0, dyad 2) switches with the zone **only through CSS** —
  the zone prefixes and the container names, never `innerWidth`, a width
  `matchMedia` or `MediaQuery` (`tests/architecture/css-zones.test.ts`, «U-03.1»),
  so the server renders the right zone:
  - `Container` — the centred column (`width`, `widthByZone`, `gutter`; `full` no cap, the application's).
  - `ResponsiveGrid` — equal cells, `columns` a count or one per zone
    (`{ phone: 1, tablet: 2, split: 3, laptop: 4, desktop: 5 }`, written as whole
    classes), `gap` a spacing role.
  - `Rail` — the home rails (`gap`, with `children`), `separated` (with `items` +
    `renderItem`: the application's 16 / 20 slot and 1 px line sit between two
    cards, outside both), `scroll-snap`, an optional `bleed` into the gutters,
    ‹ › only from `laptop:` (`controlsFrom`), off until measured (on scroll, a
    resize and a change of the cells), `aria-controls` the row. The row holds a
    card's focus ring (Airbnb's carousel, W-LIVE-2): 4 of padding above and at the
    sides, given back by a −4 margin, and the 4 below it always had, so no card moves;
    `scroll-px-1` keeps the snap and an arrow's page. With `bleed` the gutters hold
    the sides. Its sides reach 4 into the parent's padding: a rail sits in a gutter. Without a `title` it is the
    row alone (no header, no arrows); `separated` ends with the application's `endPadding` (`sm` 12 · `md` 18).
  - `CarouselSection` (organism) — the application's titled sideways row: a thin `Rail` (`gap`) with `title`,
    `subtitle`, `trailing` (`{ icon?, label, onclick }`) and `itemsClass`.
  - `Carousel` (primitive) — the slides with the U-09.3 arrows over them (12 from the sides, centred, gone at an
    end without `loop`), `autoPlay` / `autoPlayIntervalMs` (4000, the application's), paused while the pointer is
    over it or the keyboard's focus is in it (`:focus-visible`; a press on an arrow or a dot re-arms the timer, as
    the application's, U-11.3), whatever the motion setting (U-12.1); the track slides 250 ms on Airbnb's curve. The root is
    `relative`: a caller's own `absolute` parts sit on the carousel.
  - `ListItem` (molecule) — the application's row: `title`, `subtitle`, `leading` / `trailing`, `onclick` (a
    button) or none (a `div`), `disabled`, `query` (bold match), `titleTone`.
  - `Section` / `SectionHeader` — `plain` (rails), `ruled` (profile), `divided`
    (filters); the header only with a `title` (`divided`: a title or a subtitle).
  - `TwoColumnDetail` — one column below 950, from 950 a 12-column grid: main 7,
    one column of air, a sticky aside 4 (`top-bar-top`), at the `end` or `start`.
  - `StickyTopBar` (pinned over the hero, its surface fading in by the caller's
    opacity) and `StickyActionBar` (pinned to the bottom edge below 950, keeping
    the `bar-booking` room at the page end; the aside's card from 950).
  - `ModalScreenTemplate` / `FullscreenModalTemplate` — one surface in two shapes
    by CSS: the whole screen below 744, from 744 the Airbnb dialog
    (`max-w-dialog` 568, `rounded-xl` 24 — Airbnb's 32 is an open question for the
    owner, `max-h-sheet-xl`, centred by `h-fit` +
    auto margins so a zoom owns `transform`). The full-screen template zooms out
    of `sourceLayout` (the pressed control's rect, 220 ms, open `out(cubic)` and
    close `in(cubic)`, in CSS, U-12.2); its `contentGap`
    `tight | loose` and an `overlay` snippet drawn over the content.
  - `GeneralScreenTemplate` (back-nav page), `ActionBar` (presets `default`,
    `filters`, `plain`), `ModalHeader`, `BottomSheet` (the drawer from the bottom,
    `dismissOnBackdropPress`, `scrollable`, `snapPoints` — its first point the panel's height, `'50%'` ⇒ `50dvh`
    —, `onDismiss` on every close). `DropdownMenuItem` takes the application's `icon` (an Ionicon name).
- Define stable dimensions for fixed-format UI such as toolbars, controls, counters, boards, and icon buttons — always with named tokens.
- Elements that hold text use `min-h-*`, not `h-*`, so they grow at 200% zoom and with text-spacing overrides (WCAG 1.4.4 / 1.4.12).
- Do not scale font size with viewport width.
- Keep letter spacing at `0` unless a specific brand treatment requires otherwise.
- Text must fit its container on mobile and desktop.
