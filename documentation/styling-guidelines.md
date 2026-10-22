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
the eDoctor mobile application, which is the **canonical source**. The canonical
values live in:

- `edoctor-application/src/shared/preferences/theme/light.ts`
- `edoctor-application/src/shared/preferences/theme/dark.ts`

Rule: **when a color changes in one project, change it in the other.** Token
names are shared: `background`, `foreground`, `card`, `card-foreground`,
`primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `accent`,
`accent-foreground`, `muted`, `muted-foreground`, `border`, `input`, `ring`,
`success`, `warning`, `danger`, `overlay`. The frontend stores them as hex
(matching the application) so the two files can be compared directly.
`destructive` is a shadcn alias of `danger`.

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
- Containers: `narrow` 360 · `text` 480 · `form` 560 · `content` 760 ·
  `listing` 1120 · `page` 1440.
- Radii: `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 (+ `full`/`none`).
- Elevation: `shadow-raised | overlay | floating | soft | bar`.
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
(`focus-visible:border-ring`) and one height scale `default | lg | xl` =
`min-h-control-md | -lg | -xl` (48 / 56 / 64) with 16px text. The scale is
owned by `inputSizes` in `input.svelte` and reused by the textarea, select
trigger and combobox; the floating-label geometry of the field molecules
(text, password, number, phone fields and the combobox) is `fieldSizes` in the
same file. Buttons use the same heights (`default` 48, `lg` 56, `icon` 48 × 48)
and keep the shadcn focus ring (`ring-3`).

The `stepper` molecule is the number control for forms, identical to the
application's `app-stepper` (search-ux S-26.4): its whole title above a 56 box
(`min-h-control-lg`), «−» left, the number centred (typed, `inputmode="numeric"`),
«+» right, both 48 × 48 (`Button size="icon"`) and disabled at their bound, the
helper/error line below. The input is the one `spinbutton` (ArrowUp/ArrowDown
step it; `aria-valuetext` is the number as shown and a blank box is «Κενό» /
«Empty», never «0»); the buttons stay out of the Tab order. Their names and the
blank value come from Paraglide (`stepper_decrease` / `stepper_increase` /
`stepper_empty`, in the page locale) unless the caller passes `decreaseLabel` /
`increaseLabel` / `emptyValueLabel`. `number-field` stays, without a product
consumer.

Each `slider` thumb says its value as the screen shows it: `aria-valuetext`
from `formatValue(value, thumbIndex)`, the plain number by default (search-ux
S-26.9, the application's name). The range-histogram passes its pill text
(`€80`, `€420+` at the ceiling) and the stepped-range the stop's label.

Separately, several visual primitives and overlays expose an **opt-in**,
generic `size` prop with a `sm | default | lg` scale (a distinct concept from the
`InputSize` control scale above, and from the button scale). Each component owns
its own per-component type (`AvatarSize`, `BadgeSize`, `CheckboxSize`,
`RadioGroupItemSize`, `SwitchSize`, `ProgressSize`, `SliderSize`, `DialogSize`,
`SheetSize`, `DrawerSize`, `PopoverSize`, `HoverCardSize`, `CardSize`) and
applies it through a local size map whose values are named tokens. `size` scales
the visible parts together (box and glyph for checkbox/radio, track + thumb +
travel for switch and slider, panel width/height for dialog/sheet/drawer/popover/
hover-card, padding/gap for card); the touch box stays 48 at every size.

## Components

- Use the in-house primitives in `src/shared/ui/primitives` for common controls.
- Build new headless behaviour on `src/shared/lib/headless`; do not add an
  external UI component library (no Bits UI).
- Keep primitives low-level and domain-free.
- Put domain composition in module UI slices.
- Do not create nested card layouts unless the inner card is a repeated item, modal, or genuinely framed tool.

## Icons

Use Icones imports from <https://icones.js.org/>.

```ts
import SearchIcon from '~icons/lucide/search';
```

Do not import icons from direct component packages such as `@lucide/svelte`.

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

- `tablet:` 744 · `split:` 950 · `laptop:` 1128 · `desktop:` 1440. The old
  `sm: md: lg: xl: 2xl:` prefixes no longer compile.
- Content is centered with a max width of 1440 (`max-w-page` via
  `container-page`); the side margins grow beyond it. Gutters: 24 below 950, 32
  from 950, 48 from 1440.
- The desktop top navigation shows from `laptop:` (1128) up; below it the
  app-style bottom navigation (`laptop:hidden`) is shown instead.
- Bottom navigation items are 48 × 48 targets (`min-h-touch min-w-touch`) with
  12px labels; the row spaces them evenly and reserves the device safe area
  (`pb-safe-area`). The footer reserves the bar's space with `pb-bar-bottom`.

- Define stable dimensions for fixed-format UI such as toolbars, controls, counters, boards, and icon buttons — always with named tokens.
- Elements that hold text use `min-h-*`, not `h-*`, so they grow at 200% zoom and with text-spacing overrides (WCAG 1.4.4 / 1.4.12).
- Do not scale font size with viewport width.
- Keep letter spacing at `0` unless a specific brand treatment requires otherwise.
- Text must fit its container on mobile and desktop.
