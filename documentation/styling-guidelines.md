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

- Define stable dimensions for fixed-format UI such as toolbars, controls, counters, boards, and icon buttons.
- Do not scale font size with viewport width.
- Keep letter spacing at `0` unless a specific brand treatment requires otherwise.
- Text must fit its container on mobile and desktop.
