# Styling Guidelines

## Baseline

- Tailwind CSS v4 is the styling engine.
- Theme tokens live in `src/routes/layout.css`.
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
`success`, `warning`, `danger`. The frontend stores them as hex (matching the
application) so the two files can be compared directly. `destructive` is a
shadcn alias of `danger`.

Note: `accent` is the brand pink (`#BE185D`). It is reserved for intentional
brand elements (ratings, favorites, accent CTAs). shadcn primitives that use
`accent` only as a subtle hover/highlight surface (button `ghost`/`outline`,
select item) use `muted`/`foreground` instead so the brand pink is not applied
as a low-contrast background.

## Named tokens over raw values

Do not scatter raw/arbitrary utilities (`max-w-360`, `size-5.5`, `size-[18px]`,
repeated `px-4 sm:px-6 md:px-8 lg:px-12`). Use the named tokens/utilities
defined in `src/routes/layout.css`:

- Container: `container-page` utility (centered, `max-w-page` = 1440, shared
  responsive gutters). Named widths `max-w-page` (1440) and `max-w-tablet` (744).
- Icons: `icon-xs` 14 · `icon-sm` 16 · `icon-md` 18 · `icon-lg` 20 · `icon-xl` 22.
- Radii: `rounded-panel` (28, cards), `rounded-control` (13, inputs/selects),
  `rounded-media` (24, images), plus the base `rounded-sm…4xl` scale.

When a dimension repeats or encodes a design decision, add a named token rather
than inlining a raw value.

## Shared control spec

Text inputs, selects, and search controls share one look with the application:
height `h-13` (52px), radius `rounded-control`, `border-input`, `bg-card`. The
`input` and `select` primitives already encode this; reuse them rather than
restyling per feature.

## Components

- Use shadcn-svelte primitives for common controls.
- Use Bits UI through shadcn-svelte wrappers unless a component needs a custom primitive.
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

## Responsive UI

Breakpoints (mobile-first; base styles target the 375px mobile design):

- `sm` 600 (small phone) · `md` 744 (tablet) · `lg` 1128 (laptop) ·
  `xl` 1280 (desktop) · `2xl` 1440 (wide).
- Content is centered with a max width of 1440 (`max-w-360`); the side margins
  grow beyond it.
- The desktop top navigation shows from `lg` (1128) up; at tablet (744) and
  below the app-style bottom navigation (`lg:hidden`) is shown instead.

- Define stable dimensions for fixed-format UI such as toolbars, controls, counters, boards, and icon buttons.
- Do not scale font size with viewport width.
- Keep letter spacing at `0` unless a specific brand treatment requires otherwise.
- Text must fit its container on mobile and desktop.
