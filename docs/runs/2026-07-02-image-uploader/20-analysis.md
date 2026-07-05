# 20 — Analysis: screenshots → flow, reuse inventory

## Screenshot-by-screenshot (the one flow)

| Shot    | Surface              | State     | Key elements                                                                                                                                                                                                                                                                    |
| ------- | -------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shot1   | **A. Empty/entry**   | initial   | h-title "{name}: Προσθέστε μερικές φωτογραφίες" · subtitle "Θα χρειαστείτε {n} φωτογραφίες…" · large dashed rounded card · 3D camera illustration · light pill button "Προσθέστε φωτογραφίες"                                                                                   |
| shot2   | **B. Upload dialog** | empty     | header: **X** (left) · title "Ανέβασμα φωτογραφιών" + subtitle "Δεν έχουν επιλεγεί στοιχεία" · **+** (right). Body: dashed dropzone, stacked-photos icon, "Σύρετε και αποθέστε", "ή αναζήτηση φωτογραφιών", dark "Περιήγηση". Footer: "Τέλος" (ghost) · **disabled** "Ανέβασμα" |
| shot3   | (native picker)      | —         | macOS Finder open dialog — OS-owned, triggered by `<input type=file multiple accept=image/*>`. Not built.                                                                                                                                                                       |
| shot4   | **B. Upload dialog** | selected  | subtitle "2 επιλεγμένα στοιχεία" · 2-col grid of thumbnails, each with a dark circular **trash** button (top-right) · footer "Ακύρωση" (ghost) · active dark "Ανέβασμα"                                                                                                         |
| shot5   | **B. Upload dialog** | uploading | subtitle "1 από 2 ανεβασμένα στοιχεία" · thumbnails dimmed with per-item overlay: **checkmark ring** (done) ↔ **circular spinner** (in-flight) · white **X** per item (cancel) · footer "Ακύρωση" · right shows an in-progress pill                                             |
| shot6   | **D. Gallery**       | grid      | h-title "Επιλέξτε τουλάχιστον 5 φωτογραφίες" · subtitle "Σύρετε για να αλλάξετε τη σειρά" · round **+** (header). Cover: badge "Φωτογραφία εξώφυλλου" (top-left) + "…" (top-right). Grid: filled tile (+ "…"), empty placeholder (image icon), "Προσθήκη περισσοτέρων" (+)      |
| shot7/8 | **D. Gallery**       | menu open | context menu on "…": **Επεξεργασία** · **Μετακίνηση προς τα εμπρός** · **Διαγραφή** (two responsive widths)                                                                                                                                                                     |

**Conclusion:** one photo-management feature = 3 built surfaces (A entry, B
dialog, D gallery) + a headless state machine. Cover photo = list index 0;
"Μετακίνηση προς τα εμπρός" = promote to index 0; drag/menu reorder.

## Design-system mapping (verified against the repo)

Tokens (from `src/routes/layout.css` + `src/shared/design/tokens/tokens.ts`):

- Color: semantic only — `background/foreground/card/muted/muted-foreground/
border/input/ring/secondary/secondary-foreground/primary/danger/destructive`.
- Radius: `rounded-panel` (28px, cards/panels), `rounded-media` (24px, images),
  `rounded-control` (13px). Radius `rounded-full` for pills/circular buttons.
- Spacing: `p-card` (24), `gap-gutter` (16), `gap-section` (32), `gap-inline` (8).
- Elevation: `shadow-raised` / `shadow-overlay` / `shadow-soft`.
- Typography: `text-display-sm|heading-lg|title-md|body-md|body-sm|label-md`, etc.
- **Dark buttons in the mock → `secondary` (#0f172a)**, a named token (A5).

Reusable building blocks already in the repo (no need to build):

- `primitives/dialog` — `Dialog.Content` supports `showClose={false}` + custom
  children; already wraps `portal/focusTrap/dismissable/scrollLock`. Panel uses
  `rounded-panel bg-card p-card shadow-soft`. → **Upload dialog shell.**
- `primitives/dropdown-menu` — Trigger/Content/Item/Separator (floating). →
  **the "…" item menu.**
- `primitives/progress` — `role=progressbar`, `value/max`, indeterminate when
  `value=null`. → **upload progress** (bar and/or the spinner overlay reuses it).
- `primitives/aspect-ratio`, `primitives/card`, `primitives/button`
  (`variant: default|secondary|ghost|outline`, `size: …|icon|icon-sm`),
  `primitives/badge`, `primitives/separator`, `primitives/skeleton`.
- Headless `src/shared/lib/headless`: `portal, focusTrap, dismissable,
scrollLock, floating, rovingFocus, useId` (used via the primitives above).
- Icons: Iconify virtual imports `~icons/lucide/<name>` (`x, plus, images,
image, camera, trash-2, check, loader-circle, ellipsis, pencil,
arrow-up-to-line, upload`).
- Utils: `cn`, `WithElementRef`, `WithoutChildrenOrChild` from `$shared/lib/utils`.
- i18n: `import { m } from '$paraglide/messages.js';` → `m.key({param})`;
  catalogs `messages/el.json` (canonical) + `messages/en.json` (parity), compiled
  by `bun run paraglide:compile` (part of `bun run check`).

## Convention anchors (canonical examples to mirror)

- **Molecule/organism folder + barrel:** `molecules/selectable-cards`
  (`index.ts` re-exports `Root`/`Item` with named + aliased exports; no `export *`).
- **Context pattern:** `getSelectableCardsContext/setSelectableCardsContext`
  (set/get context in the `.svelte` root) — mirror for the uploader controller.
- **Runes state file:** `.svelte.ts` (per contract; e.g. `hooks/use-screen.svelte.ts`).
- **Validators shape:** `src/shared/lib/form/validators.ts` — fn returns
  `{ code: true } | null`; `createForm` maps to a message. Mirror as
  `ImageValidators` (file-aware, sync + async).
- **Stories (Svelte CSF):** `defineMeta({ title, component, tags:['autodocs'] })`
  - `<Story name>{#snippet template()}…`; play tests via
    `import { expect, userEvent, screen } from 'storybook/test'` (see
    `dialog.stories.svelte`). Stories glob is scoped to `src/shared/ui/**`.
- **Co-located tests:** `*.test.ts` next to the unit (Vitest + jsdom); a
  `*.harness.svelte` provides a stateful wrapper for stories/tests.

## Facts vs. inferences vs. open decisions

- **Facts:** greenfield (no existing upload/dropzone/FileReader/objectURL code);
  primitives above exist; no toast system exists (rules out A3=toast without
  building one); tokens/buttons as mapped.
- **Inferences:** cover = index 0; footer primary is the dark `secondary` button;
  dialog width ≈ `max-w-xl` to match mock proportions.
- **Open product decisions (defaulted, see 30-decisions):** A1–A4, A6–A7.
