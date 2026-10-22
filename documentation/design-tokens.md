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
- `index.ts` adds what only the web has (`platform.spacing`, `platform.motion`)
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
`size-touch`); `hitSlop`-style tricks do not count.
`tests/architecture/touch-targets.test.ts` checks the height and the width of
each target and of each recipe `base`, and fails on a class that shrinks the box
again (`min-w-0`, `h-8`) or on a size passed to a target component
(`<Button class="size-6">`).

Known exceptions (written down here, not checked by a test):

- **No 8 gap** between the adjacent segments of one control (language switcher,
  tabs list, toggle group), between menu rows and between calendar cells. Between
  separate targets `gap-touch-gap` is a review rule, not a test.
- **Calendar cells** are fluid (`h-touch w-full` in a `w-narrow max-w-full`
  grid): 48 wide only in a container of at least 354; about 41 in a popover and
  about 36 inline on a 320 screen.
- **Switch:** the web keeps its own track (24/32/40 × 16/18/24, thumb 12/16/20,
  from steps and `control-xs/-sm`) inside the 48 box and does not read
  `switchGeometry` (the application's 38/48/56 × 22/28/32 track). The values are
  shared, the use differs per platform (SCALE-1 §1.11).

Fields (floating label) share one geometry, the class form of the `field`
tokens: `fieldSizes` in `src/shared/ui/primitives/input` (`default` 48, `lg` 56,
`xl` 64; text 16 so iOS Safari never zooms). The inline phone field draws its
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
`container-bleed` lets a rail run into those gutters.

## Media and cards

Named in the shared `media` family (values unchanged from the screens that
introduced them): `avatar-sm/md/lg/xl/2xl` 32/40/48/64/96 · `tile` 56 ·
`card-rail-w` 168 / `-lg` 216 · `card-rail-media` 152 / `-lg` 188 ·
`card-list-media` 188 / `-lg` 224 · `placeholder-sm/md/lg/xl` 64/80/96/160 ·
`search-pill` 64 · `scroll-max` 256 … (full list in the canonical file).

## Web-only names (`platform` in `index.ts`)

`bar-top` 64 (header) · `menu-max-h` 288 · `menu-min-w` 160 · `popover-sm/md/lg`
224/288/320 · `textarea-md/lg/xl` 64/80/96 · `histogram-sm/md/lg` 80/112/128 ·
`dropzone-min-h` 288 · `drawer-handle` 48 · `drawer-inset` 96 · `brand-mark` 40
(header logo) · `icon-tile` 48 (icon tile of a placeholder page) · `dial-code-w`
56 (dial-code column of the inline phone field), and `platform.motion`: overlay
travel (drawer 360, sheet 320) and `dismiss` 80 (drag distance that closes a
drawer whose size cannot be measured). They reach the theme next to the shared
names; promote one to the shared file when the application needs it.

## Containers (`max-w-*`, also `w-*`)

`narrow` 360 · `text` 480 · `form` 560 · `content` 760 · `listing` 1120 ·
`page` 1440. Tailwind's `max-w-sm … max-w-7xl` do not compile.

Container queries use the same names: `@container` on the parent, `@<name>:` on
the child (`@form:inline-flex` = parent at least 560 wide). The header uses them:
the brand word shows from a 360 header, «Σύνδεση» from 560.

## Breakpoints (mobile-first)

| Variant    | From | Meaning                               |
| ---------- | ---- | ------------------------------------- |
| (none)     | 0    | phone                                 |
| `tablet:`  | 744  | tablet                                |
| `split:`   | 950  | two columns, gutter 32                |
| `laptop:`  | 1128 | desktop header (the bottom nav hides) |
| `desktop:` | 1440 | gutter 48, page centered              |

`sm: md: lg: xl: 2xl:` do not exist (`--breakpoint-*: initial`). In hand-written
CSS use `>=` / `<` media conditions, never a one-line range.

## Icons, radii, elevation, sheets

- Icons (`icon-*`, width + height): `xs` 12 · `sm` 16 · `md` 20 · `lg` 24 · `xl` 32.
- Radii (`rounded-*`, closed scale): `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24,
  plus `full`/`none`. Bare `rounded` and `rounded-2xl … 4xl` do not compile.
- Elevation (`shadow-*`): `raised` · `overlay` · `floating` · `soft` · `bar`.
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
