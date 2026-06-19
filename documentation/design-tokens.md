# Design Tokens (sizing & non-color)

Canonical reference for every **non-color** size in the web app: typography,
spacing, border radius, elevation (shadow), breakpoints, container widths and
icon sizes. Colors are documented separately in
[`styling-guidelines.md`](./styling-guidelines.md) and live in
`src/routes/layout.css`.

The goal is **stable, named patterns** instead of scattered raw values
(`text-[18px]`, `font-semibold` everywhere, `p-6` vs `p-[24px]`, ad-hoc
shadows). Pick a token by role; the value is decided once, centrally.

## Source of truth

All non-color values are defined once, in TypeScript:

```
src/shared/design/tokens/
  tokens.ts        ← THE file you edit (plain numbers in px + CSS strings)
  to-css.ts        ← pure tokens → Tailwind @theme CSS
  vite-plugin.ts   ← writes src/generated/design-tokens.css (dev + build + HMR)
  build.ts         ← `bun run tokens:build` (CI / manual)
  index.ts         ← typed registry for runtime/tooling consumers
```

`tokens.ts` is compiled into `src/generated/design-tokens.css` (a Tailwind v4
`@theme` block), which `src/routes/layout.css` imports. Tailwind then generates
the `text-*`, `rounded-*`, `shadow-*`, `p-*`, `gap-*`, `icon-*` utilities from
it.

**Edit `tokens.ts`, save, and the change propagates globally** — the Vite plugin
regenerates the CSS on dev start, on every build, and on hot-update of the token
source. Never edit `src/generated/design-tokens.css` by hand (it is generated
and git-ignored).

> Two separate sources of truth, on purpose:
>
> - **Colors** → `src/routes/layout.css` (`:root` / `.dark`), kept in sync with
>   the eDoctor application theme.
> - **Sizes (this doc)** → `src/shared/design/tokens/tokens.ts`.

## Typography

Each role is a complete bundle: **font-size + default weight + line-height**.
Using `text-<role>` alone renders correctly — no companion `font-*` / `leading-*`
needed. Letter-spacing stays at the project default (`0`).

| Token (`text-…`) | Size | Weight | Line-height | Use                        |
| ---------------- | ---- | ------ | ----------- | -------------------------- |
| `display-xl`     | 44   | 700    | 1.08        | Hero / marketing headline  |
| `display-lg`     | 40   | 700    | 1.10        | Hero                       |
| `display-md`     | 36   | 700    | 1.12        | Hero                       |
| `display-sm`     | 32   | 700    | 1.15        | Large display              |
| `display-xs`     | 30   | 700    | 1.18        | Display                    |
| `heading-xl`     | 28   | 600    | 1.20        | Page title (h1)            |
| `heading-lg`     | 24   | 600    | 1.25        | Section head (desktop)     |
| `heading-md`     | 21   | 600    | 1.30        | Section head (mobile)      |
| `heading-sm`     | 19   | 600    | 1.32        | Sub-section                |
| `title-lg`       | 18   | 600    | 1.40        | Card / block title         |
| `title-md`       | 17   | 600    | 1.40        | Card title                 |
| `title-sm`       | 16   | 600    | 1.45        | Card title                 |
| `title-xs`       | 15   | 600    | 1.45        | Small title                |
| `body-lg`        | 16   | 400    | 1.50        | Running text, primary body |
| `body-md`        | 15   | 400    | 1.50        | Body, subtitles            |
| `body-sm`        | 14   | 400    | 1.45        | Card meta, secondary text  |
| `label-lg`       | 13   | 500    | 1.40        | UI labels                  |
| `label-md`       | 12   | 500    | 1.40        | Labels, badges             |
| `label-sm`       | 11   | 500    | 1.35        | Tab labels, micro-labels   |

**Weight override rule:** apply `font-medium` / `font-semibold` only when the
element genuinely differs from its role's default (e.g. a footer column heading
at `text-label-lg font-semibold`, nav links at `text-body-sm font-medium`). Do
**not** repeat the weight a token already bakes in.

## Spacing

Semantic spacing names a recurring layout decision so the same rhythm is reused.
They sit on top of Tailwind's numeric scale (which stays available for genuine
one-offs).

| Token     | Value | Utilities                                      | Use                                      |
| --------- | ----- | ---------------------------------------------- | ---------------------------------------- |
| `section` | 32    | `gap-section`, `space-y-section`, `py-section` | Vertical rhythm between major page bands |
| `card`    | 24    | `p-card`, `px-card`                            | Internal padding of a card / panel       |
| `gutter`  | 16    | `gap-gutter`                                   | Gap between cards / grid items           |
| `inline`  | 8     | `gap-inline`                                   | Tight inline gap (icon + label)          |

Use a semantic token when the value encodes one of these decisions; use the raw
numeric scale (`p-4`, `gap-3`) for incidental, component-local spacing.

## Border radius

| Token (`rounded-…`) | Value | Use                                          |
| ------------------- | ----- | -------------------------------------------- |
| `sm`                | 6     | Small controls                               |
| `md`                | 8     | Buttons, inputs (shadcn default)             |
| `lg`                | 10    | Default surfaces                             |
| `xl`                | 14    | Larger surfaces                              |
| `2xl`               | 18    | Large surfaces                               |
| `3xl`               | 22    | —                                            |
| `4xl`               | 26    | —                                            |
| `panel`             | 28    | Cards / large panels (application parity)    |
| `control`           | 13    | Inputs, selects, search controls             |
| `media`             | 24    | Images / media                               |
| `full`              | 9999  | Pills, circular elements (Tailwind built-in) |

## Elevation (shadow)

Three purposeful levels sharing one slate base. Tuned for light surfaces; they
read faintly in dark mode by design. Depth otherwise comes from surface
separation and rounded corners, not heavy shadows.

| Token (`shadow-…`) | Level | Use                                               |
| ------------------ | ----- | ------------------------------------------------- |
| `raised`           | 1     | Resting cards / controls                          |
| `overlay`          | 2     | Menus, popovers, dropdowns                        |
| `soft`             | 3     | Large floating panel / modal (application parity) |

## Icons

Keep icons on the named sizes (these generate `icon-xs … icon-xl`, each setting
`width`/`height`):

| Token     | Size |
| --------- | ---- |
| `icon-xs` | 14   |
| `icon-sm` | 16   |
| `icon-md` | 18   |
| `icon-lg` | 20   |
| `icon-xl` | 22   |

## Breakpoints & containers

Mobile-first; base styles target the 375px mobile design. The desktop top
navigation appears from `lg` (1128) up; below that the app-style bottom nav
shows.

| Breakpoint | Width |     | Container      | Width |
| ---------- | ----- | --- | -------------- | ----- |
| `sm`       | 600   |     | `max-w-page`   | 1440  |
| `md`       | 744   |     | `max-w-tablet` | 744   |
| `lg`       | 1128  |     |                |       |
| `xl`       | 1280  |     |                |       |
| `2xl`      | 1440  |     |                |       |

Use the `container-page` utility (centered, `max-w-page`, shared responsive
gutters) for the header bar, page `<main>`, and footer.

## Rules

- Prefer a token over a raw value. Reach for `text-[..]`, `p-[..]`, arbitrary
  shadows or radii only for a deliberate, documented one-off.
- Do not scale font size with the viewport. Keep letter-spacing at `0` unless a
  specific brand treatment requires otherwise.
- Changing a value is a one-line edit in `tokens.ts`; it applies everywhere.
  Don't fork values per feature.

## Portability (other front / app)

The token system is self-contained and framework-light. To adopt it in another
SvelteKit front or app:

1. Copy `src/shared/design/tokens/` (5 files; `tokens.ts` has zero imports).
2. Register the plugin in `vite.config.ts`:
   `import { designTokensPlugin } from './src/shared/design/tokens/vite-plugin';`
   then add `designTokensPlugin()` **before** `tailwindcss()`.
3. Add `@import '../generated/design-tokens.css';` to the app's Tailwind entry
   CSS, and git-ignore `src/generated/design-tokens.css`.
4. Optionally add the `tokens:build` script and prepend it to `prepare`.

Then edit `tokens.ts` to that product's scale; everything else follows.

## Related

- [`styling-guidelines.md`](./styling-guidelines.md) — colors, components, i18n,
  responsive rules.
- `src/routes/layout.css` — color tokens and the generated-tokens import.
