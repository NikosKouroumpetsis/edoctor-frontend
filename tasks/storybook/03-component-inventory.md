# 03 — Component inventory & per-component story matrix

The exhaustive list of what gets a `*.stories.svelte`, and which stories each
one should contain. Pattern letters (A–F) refer to `02-story-conventions.md`.

**In scope:** everything under `src/shared/ui/**` (primitives, molecules, generic
organisms) + one composed Forms showcase.
**Out of scope (do NOT author):** `src/modules/doctors/**` — `doctor-card`,
`availability-table`, `search-bar` (doctor-specific).

Legend: ✎ = needs an instance `<script>` with `$state`/`bind`; ▶ = include a
`play` interaction story.

## Primitives — `src/shared/ui/primitives/<name>/<name>.stories.svelte`

| Component     | Title                      | Stories to author                                                | Pattern |
| ------------- | -------------------------- | ---------------------------------------------------------------- | ------- |
| button        | `Primitives/Button`        | Playground, Variants, Sizes, With icon, As link, Disabled        | A       |
| input         | `Primitives/Input`         | Playground, Types (text/email/password/file), Invalid, Disabled  | A       |
| label         | `Primitives/Label`         | Default, With input association                                  | A       |
| textarea      | `Primitives/Textarea`      | Playground, Invalid, Disabled                                    | A       |
| badge         | `Primitives/Badge`         | Playground, Variants (incl. success/warning), As link            | A       |
| avatar        | `Primitives/Avatar`        | With image, Fallback (broken src), Sizes                         | C ✎     |
| card          | `Primitives/Card`          | Default (full parts), With action, With footer                   | C       |
| separator     | `Primitives/Separator`     | Horizontal, Vertical                                             | A       |
| skeleton      | `Primitives/Skeleton`      | Line, Card placeholder                                           | A       |
| progress      | `Primitives/Progress`      | Playground (value control), Indeterminate, Complete              | A       |
| aspect-ratio  | `Primitives/Aspect ratio`  | 16:9, 1:1, 4:3 (with image)                                      | A       |
| checkbox      | `Primitives/Checkbox`      | Playground, States (checked/indeterminate/disabled)              | B ✎     |
| switch        | `Primitives/Switch`        | Playground, Disabled                                             | B ✎     |
| toggle        | `Primitives/Toggle`        | Playground, Variants, Sizes                                      | B ✎     |
| toggle-group  | `Primitives/Toggle group`  | Single, Multiple, Vertical                                       | C ✎     |
| radio-group   | `Primitives/Radio group`   | Default, Pre-selected, Disabled item, Horizontal                 | C ✎     |
| tabs          | `Primitives/Tabs`          | Default, Vertical, ▶ keyboard nav                                | C ✎ ▶   |
| accordion     | `Primitives/Accordion`     | Single, Multiple                                                 | C ✎     |
| slider        | `Primitives/Slider`        | Single, Range, Stepped, Disabled                                 | B ✎     |
| dialog        | `Primitives/Dialog`        | Default, ▶ Opened, With footer                                   | D ▶     |
| sheet         | `Primitives/Sheet`         | Right, Left, Top, Bottom                                         | D       |
| popover       | `Primitives/Popover`       | Default, ▶ Opened, Placement variants                            | D ▶     |
| tooltip       | `Primitives/Tooltip`       | Default (focus to show), Placements                              | D       |
| hover-card    | `Primitives/Hover card`    | Default                                                          | D       |
| select        | `Primitives/Select`        | Default, Pre-selected, Grouped + separator, Disabled             | C ✎     |
| dropdown-menu | `Primitives/Dropdown menu` | Default, With checkbox items, With radio group, Destructive item | C ✎     |
| command       | `Primitives/Command`       | Default (filter), Empty state, In popover (combobox recipe)      | C ✎     |
| calendar      | `Primitives/Calendar`      | Default, With value, Min/max range                               | C ✎     |
| carousel      | `Primitives/Carousel`      | Default (images), With dots, Loop                                | C ✎     |

## Molecules — `src/shared/ui/molecules/<name>/<name>.stories.svelte`

| Component           | Title                           | Stories to author                                        | Pattern |
| ------------------- | ------------------------------- | -------------------------------------------------------- | ------- |
| text-field          | `Molecules/Text field`          | Standalone, With error, Leading/trailing, Form-connected | E ✎     |
| password-field      | `Molecules/Password field`      | Default, Reveal toggle, With error                       | E ✎     |
| number-field        | `Molecules/Number field`        | Default, Min/max + step                                  | E ✎     |
| phone-field         | `Molecules/Phone field`         | Default (dial code + number)                             | E ✎     |
| date-of-birth-field | `Molecules/Date of birth field` | Default, Pre-filled                                      | E ✎     |
| single-selection    | `Molecules/Single selection`    | Default, Pre-selected, ▶ arrow nav                       | E ✎ ▶   |
| multi-selection     | `Molecules/Multi selection`     | Default, Pre-selected                                    | E ✎     |
| theme-toggle        | `Molecules/Theme toggle`        | Default (note: also driven by toolbar)                   | A       |
| language-switcher   | `Molecules/Language switcher`   | Default (decorator sets `page.url`)                      | A       |

## Organisms (generic) — `src/shared/ui/organisms/<name>/<name>.stories.svelte`

| Component      | Title                      | Stories                                 | Pattern | Notes                                    |
| -------------- | -------------------------- | --------------------------------------- | ------- | ---------------------------------------- |
| cookie-consent | `Organisms/Cookie consent` | Default, ▶ Accept dismisses             | D/A ▶   | self-contained                           |
| site-navbar    | `Organisms/Site navbar`    | Default, ▶ Account menu, ▶ Mobile sheet | D ▶     | uses theme-toggle/language-switcher/$app |

### Optional app-chrome organisms (pre-existing; author if time allows)

These render full-page chrome and read `$app/state` (page). Author with a
decorator that sets `page.url`. Lower priority than the component kit.

| Component   | Title                   | Notes                                               |
| ----------- | ----------------------- | --------------------------------------------------- |
| site-footer | `Organisms/Site footer` | needs `page.url` decorator + i18n                   |
| bottom-nav  | `Organisms/Bottom nav`  | mobile; needs `page.url` decorator                  |
| app-shell   | `Organisms/App shell`   | full layout; render inside a fixed-height container |

## Showcases — `src/shared/ui/_showcases/<name>.stories.svelte`

| Story             | Title                         | Notes                                                                                                                      |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Registration form | `Showcases/Registration form` | `createForm` + all field molecules + submit → values; mirror `screens/test-components/.../forms.svelte` minus demo chrome. |

> If we add `_showcases/`, widen the `main.ts` glob to
> `['../src/shared/ui/**/*.stories.@(svelte|ts)']` already covers it (it's under
> `src/shared/ui`). Still excludes `src/modules/doctors`.

## Count estimate

~29 primitives + ~9 molecules + 2 generic organisms (+3 optional) + 1 showcase
≈ **41 story files** (44 incl. optional app chrome). Author in the S1→S3 phases.
