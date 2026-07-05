# 10 — Implementation plan (code-architect handoff)

Target project: **frontend/** (SvelteKit · Svelte 5 runes · Tailwind v4 · Bun).
Deliverable: shared organism `image-uploader` + headless controller, 1:1 with
`images/images/shot1..8`, in Storybook. Read `00-brief`, `20-analysis`,
`30-decisions` first. Defaults A1–A4/A6–A7 are assumed (see 30-decisions).

## File ownership (single new folder tree)

```
src/shared/ui/organisms/image-uploader/
  index.ts                        # named barrel (no export *)
  image-uploader.svelte           # orchestrator: owns/receives controller, renders A/B/D
  image-uploader.harness.svelte   # stateful wrapper for stories/tests (mock uploader)
  image-uploader.stories.svelte   # Storybook: all states + validation demo + play tests
  image-uploader.test.ts          # integration (controller + surfaces)
  lib/
    types.ts                      # UploaderItem, StagedFile, UploadFn, ValidationIssue, options
    context.ts                    # get/setImageUploaderContext (mirror selectable-cards)
    create-image-uploader.svelte.ts       # runes controller factory
    create-image-uploader.svelte.test.ts  # controller unit tests
    validators.ts                 # ImageValidators + runImageValidators
    validators.test.ts            # validator unit tests
    reorder.ts                    # pure move()/moveToFront() helpers (+ reorder.test.ts)
  components/
    uploader-empty.svelte         # surface A (shot1)
    upload-dialog.svelte          # surface B shell: header(X·title+counter·+) + body + footer
    upload-dropzone.svelte        # dashed drag&drop + Περιήγηση + hidden <input type=file>
    upload-tile.svelte            # staged thumb: remove | progress/checkmark | cancel | error
    upload-errors.svelte          # A3 inline banner (rejected list + count violations)
    photo-gallery.svelte          # surface D shell: header + cover + grid
    photo-cover.svelte            # cover w/ "Φωτογραφία εξώφυλλου" badge + "…" menu
    photo-tile.svelte             # grid filled tile + "…" menu + drag handle
    photo-placeholder.svelte      # empty placeholder tile (image icon)
    photo-add-more.svelte         # "Προσθήκη περισσοτέρων" (+) tile
    photo-item-menu.svelte        # dropdown-menu: Επεξεργασία / Μετ. εμπρός / Διαγραφή
```

Also edit (append only): `messages/el.json`, `messages/en.json` (keys below);
optionally add a `_showcases` example. No other files change. Promotion of
`lib/` to `src/shared/lib/uploads` is explicitly deferred (30-decisions D-1).

## Public API (from `index.ts`)

- Components: `ImageUploader` (default; renders empty→gallery based on state),
  and named sub-surfaces if a caller wants to compose manually
  (`ImageUploaderEmpty`, `UploadDialog`, `PhotoGallery`).
- Controller: `createImageUploader`, `getImageUploaderContext`.
- Validation: `ImageValidators`, `runImageValidators`, and types.

### `lib/types.ts` (contracts)

```ts
export type RemoteImage = {
	kind: 'remote';
	id: string;
	url: string;
	alt?: string;
	width?: number;
	height?: number;
};
export type LocalImage = {
	kind: 'local';
	id: string;
	file: File;
	previewUrl: string;
	width?: number;
	height?: number;
};
export type UploaderItem = RemoteImage | LocalImage;

export type ValidationIssue = { code: string; message?: string; meta?: Record<string, unknown> };
export type ImageMeta = { width?: number; height?: number };
export type ImageValidatorFn = (
	file: File,
	meta: ImageMeta
) => ValidationIssue | null | Promise<ValidationIssue | null>;

export type UploadResult = { id?: string; url?: string; alt?: string } | void;
export type UploadFn = (
	file: File,
	ctx: { signal: AbortSignal; onProgress: (p: number) => void }
) => Promise<UploadResult>;

export type StagedStatus =
	| 'valid'
	| 'invalid'
	| 'queued'
	| 'uploading'
	| 'done'
	| 'error'
	| 'canceled';
export type StagedFile = {
	id: string;
	file: File;
	previewUrl: string;
	meta: ImageMeta;
	status: StagedStatus;
	progress: number;
	issues: ValidationIssue[];
	controller?: AbortController;
	result?: UploadResult;
};

export type ImageUploaderOptions = {
	items?: UploaderItem[]; // seed (bindable at component level)
	accept?: string; // default 'image/*'
	multiple?: boolean; // default true
	minCount?: number;
	maxCount?: number;
	validators?: ImageValidatorFn[]; // parent-injected (compose from ImageValidators)
	upload?: UploadFn; // optional (A1)
	onChange?: (items: UploaderItem[]) => void;
	onReject?: (issues: { file: File; issues: ValidationIssue[] }[]) => void;
	onEdit?: (item: UploaderItem) => void; // A7 placeholder hook
};
```

### `lib/validators.ts` (mirror `form/validators.ts` shape, file-aware)

```ts
export const ImageValidators = {
  accept(types: string[]): ImageValidatorFn,       // code:'accept'
  maxSize(bytes: number): ImageValidatorFn,         // code:'maxSize'
  minSize(bytes: number): ImageValidatorFn,         // code:'minSize'
  minDimensions(w: number, h: number): ImageValidatorFn,  // async meta; code:'minDimensions'
  maxDimensions(w: number, h: number): ImageValidatorFn,  // code:'maxDimensions'
  aspectRatio(ratio: number, tolerance?: number): ImageValidatorFn, // code:'aspectRatio'
};
export function runImageValidators(file, meta, validators): Promise<ValidationIssue[]>;
```

Count (`minCount`/`maxCount`) is enforced by the controller, not per file.
`ValidationIssue.code` → message via `m.image_uploader_error_<code>` with a
generic fallback; parent may pass a custom `message`.

### `lib/create-image-uploader.svelte.ts` (runes controller)

State (`$state`): `items`, `staged`, `dialogOpen`, `menuOpenFor`.
Derived (`$derived`): `count`, `coverId` (=items[0]?.id), `isUploading`,
`stagedValid`, `uploadedCount`, `totalStaged`, `canUpload`
(=stagedValid.length>0 && count+stagedValid ≤ maxCount), `remainingToMin`.
Actions:

- `openDialog()/closeDialog()`; `pickFiles(FileList|File[])` → create previews,
  decode meta, run validators (+count), fill `staged` with valid/invalid.
- `removeStaged(id)` / `clearStaged()` (revoke objectURLs).
- `confirm()`:
  - `upload` present → set valid staged `uploading`, run `upload(file,{signal,
onProgress})`, update `progress`; resolve → `done` + push RemoteImage(result)
    to `items`; reject → `error`. When all settled → commit + `closeDialog()`.
  - no `upload` → commit valid staged as LocalImage → `items`; `closeDialog()`.
- `cancelStaged(id)` (abort in-flight) / `cancelAll()`.
- `remove(id)` (revoke if local), `moveToFront(id)`, `move(from,to)`
  (via `reorder.ts`), `setCover(id)=moveToFront`, `edit(id)`→`onEdit`.
- `destroy()` — revoke all local objectURLs (call from `$effect` cleanup /
  `onDestroy` in the root).
  Every mutation calls `onChange(items)`. Guard SSR: object URLs / decode only in
  the browser (no module-level mutable request state — contract §State).

## Styling map (1:1 · named tokens only)

- **A (uploader-empty):** wrapper `space-y-*`; title `text-heading-lg`/`display-sm`
  `font-bold`, subtitle `text-body-md text-muted-foreground`. Card:
  `rounded-panel border border-dashed border-border bg-muted/30` min-h ~ shot1;
  centered illustration slot (default `~icons/lucide/camera` in a soft circle)
  - pill button `rounded-full bg-muted text-foreground hover:bg-muted/80` label
    `text-label-lg`.
- **B (upload-dialog):** `Dialog.Content showClose={false} class="max-w-xl gap-0 p-0"`
  → custom **header** row `flex items-center justify-between p-card pb-inline`
  (left `Button ghost icon-sm` X · center column: title `text-title-md`
  font-semibold + subtitle `text-body-sm text-muted-foreground` · right
  `Button ghost icon-sm` +). Body `px-card`. Footer `flex items-center
justify-between border-t border-border p-card` (left ghost text button ·
  right `Button variant="secondary"` primary, `disabled` when `!canUpload`).
- **upload-dropzone:** `rounded-media border border-dashed border-border
bg-muted/20 p-section text-center`; drag-over → `border-ring bg-muted/40`;
  icon `~icons/lucide/images icon-xl text-foreground`; title `text-title-sm
font-semibold`; hint `text-body-sm text-muted-foreground`; button
  `variant="secondary"` "Περιήγηση".
- **upload-tile:** `AspectRatio` (~1) `rounded-media overflow-hidden`, `img
object-cover`. Remove: top-right circular `bg-secondary text-secondary-foreground
rounded-full` `~icons/lucide/trash-2`. Uploading overlay `absolute inset-0
bg-black/40` + centered spinner (`~icons/lucide/loader-circle animate-spin`)
  ↔ done ring `~icons/lucide/check`; cancel white X top-right. Error →
  `ring-2 ring-destructive` + reason (tooltip/aria).
- **D (photo-gallery):** header row title `text-heading-lg` + subtitle
  `text-body-sm text-muted-foreground` + round `Button secondary size="icon"
rounded-full` +. **cover:** `rounded-media` full-width media; badge top-left
  `bg-card text-foreground text-label-md rounded-full px-3 py-1 shadow-raised`;
  "…" top-right circular. **grid** `grid grid-cols-2 gap-gutter`. placeholder
  `rounded-media bg-muted grid place-items-center` `~icons/lucide/image
text-muted-foreground`. add-more same shell + `~icons/lucide/plus` + label
  `text-body-sm`. menu via `DropdownMenu` (items with `~icons/lucide/pencil`,
  `arrow-up-to-line`, `trash-2`; delete = destructive text).

## i18n keys (add to el.json canonical + en.json parity)

```
image_uploader_empty_title           "Προσθέστε μερικές φωτογραφίες"           / "Add some photos"
image_uploader_empty_subtitle        "Θα χρειαστείτε {count} φωτογραφίες για να ξεκινήσετε. Μπορείτε να προσθέσετε περισσότερες ή να κάνετε αλλαγές αργότερα."
image_uploader_empty_cta             "Προσθέστε φωτογραφίες"                    / "Add photos"
image_uploader_dialog_title          "Ανέβασμα φωτογραφιών"                     / "Upload photos"
image_uploader_dialog_subtitle_empty "Δεν έχουν επιλεγεί στοιχεία"             / "No items selected"
image_uploader_dialog_subtitle_selected  "{count} επιλεγμένα στοιχεία"         / "{count} items selected"
image_uploader_dialog_subtitle_uploading "{done} από {total} ανεβασμένα στοιχεία" / "{done} of {total} items uploaded"
image_uploader_dropzone_title        "Σύρετε και αποθέστε"                      / "Drag and drop"
image_uploader_dropzone_hint         "ή αναζήτηση φωτογραφιών"                  / "or search for photos"
image_uploader_browse                "Περιήγηση"                               / "Browse"
image_uploader_done                  "Τέλος"                                   / "Done"
image_uploader_cancel                "Ακύρωση"                                 / "Cancel"
image_uploader_upload                "Ανέβασμα"                                / "Upload"
image_uploader_gallery_title         "Επιλέξτε τουλάχιστον {count} φωτογραφίες" / "Select at least {count} photos"
image_uploader_gallery_subtitle      "Σύρετε για να αλλάξετε τη σειρά"          / "Drag to reorder"
image_uploader_cover_badge           "Φωτογραφία εξώφυλλου"                     / "Cover photo"
image_uploader_add_more              "Προσθήκη περισσοτέρων"                    / "Add more"
image_uploader_menu_edit             "Επεξεργασία"                             / "Edit"
image_uploader_menu_move_front       "Μετακίνηση προς τα εμπρός"                / "Move forward"
image_uploader_menu_delete           "Διαγραφή"                                / "Delete"
image_uploader_remove                "Αφαίρεση φωτογραφίας"                     / "Remove photo"  (aria)
image_uploader_options               "Επιλογές φωτογραφίας"                     / "Photo options" (aria)
image_uploader_error_accept          "Μη υποστηριζόμενος τύπος αρχείου"         / "Unsupported file type"
image_uploader_error_maxSize         "Το αρχείο είναι πολύ μεγάλο"              / "File is too large"
image_uploader_error_minSize         "Το αρχείο είναι πολύ μικρό"               / "File is too small"
image_uploader_error_minDimensions   "Η ανάλυση είναι πολύ μικρή"               / "Image resolution is too low"
image_uploader_error_maxDimensions   "Η ανάλυση είναι πολύ μεγάλη"              / "Image resolution is too high"
image_uploader_error_aspectRatio     "Μη έγκυρη αναλογία εικόνας"               / "Invalid image ratio"
image_uploader_error_minCount        "Χρειάζονται τουλάχιστον {count} φωτογραφίες" / "At least {count} photos are required"
image_uploader_error_maxCount        "Επιτρέπονται έως {count} φωτογραφίες"      / "Up to {count} photos are allowed"
image_uploader_error_generic         "Μη έγκυρη εικόνα"                         / "Invalid image"
```

Run `bun run paraglide:compile` (via `bun run check`) after editing catalogs.

## Accessibility

Dialog inherits focus-trap/scroll-lock/dismissable from `Dialog.Content`;
set `DialogTitle`/`Description` ids. All icon buttons carry aria-labels
(X=close, +=add, …=options, trash=remove, cancel). Hidden `<input type=file>`
opened programmatically by Περιήγηση/+/add-more. Progress via `role=progressbar`
(reuse `Progress`). Reorder is keyboard-operable (focus tile → ArrowLeft/Right
move; menu "move forward"), with an `aria-live="polite"` region announcing the
new position. Drag mirrors keyboard via shared `reorder.ts`.

## Staged tasks (disjoint, dependency-ordered; each ends green)

- **S0 Scaffold** — folder, `index.ts`, `lib/types.ts`, `lib/context.ts`,
  i18n keys (el+en) + `paraglide:compile`. Gate: `bun run check`.
- **S1 Controller + validators** (depends S0) — `create-image-uploader.svelte.ts`,
  `validators.ts`, `reorder.ts` + unit tests (validation matrix, add/remove/
  reorder/cover, upload success/error/cancel with a fake `UploadFn`, objectURL
  revocation). No UI. Gate: `bun run check` + `bun run test`.
- **S2 Upload dialog** (depends S1) — `upload-dialog`, `upload-dropzone`,
  `upload-tile`, `upload-errors`; states empty→selected→uploading→error;
  drag&drop onto dropzone. Harness + stories with a mock progressive uploader +
  play tests. Gate: `check` + `lint` + `build-storybook`.
- **S3 Empty/entry** (depends S1) — `uploader-empty` + illustration slot;
  opens dialog. Stories. Gate: `check` + `build-storybook`. _(S3 ∥ S2.)_
- **S4 Gallery** (depends S1; UI parts reuse S2 tile atoms) — `photo-gallery`,
  `photo-cover`, `photo-tile`, `photo-placeholder`, `photo-add-more`,
  `photo-item-menu`; menu actions (edit→callback, move-front, delete). Stories.
  Gate: `check` + `lint` + `build-storybook`.
- **S5 Reorder + integration + polish** (depends S2+S4) — native DnD + keyboard
  reorder wired to `reorder.ts`; `image-uploader.svelte` orchestration
  (empty↔gallery), `image-uploader.test.ts` integration, `_showcases` example,
  dark-mode + responsive pass, a11y pass, i18n parity check. Gate: `check` +
  `lint` + `test` + `build-storybook` (+ `build` if any route/provider touched —
  not expected).

## Risks / watch-list

- **objectURL leaks** — revoke on remove/cancel/destroy; assert in tests.
- **async validators race** — decode meta before validating; ignore results for
  files removed mid-decode (guard by staged id presence).
- **SSR** — browser-only APIs (`URL.createObjectURL`, `Image`, drag events)
  behind mount/`$effect`; no module-level request state.
- **Dialog width** — mock ≈600px; `max-w-xl`. Confirm visually in Storybook.
- **1:1 vs tokens** — dark CTAs = `secondary` (D-2); if brand wants blue, switch
  to `primary` — one-line change.
- **A1–A4/A6–A7 defaults** — confirm with user; only S2–S5 are affected.

## Handoff contract → code-architect

- Owns the single folder tree above + the two message catalogs; no other files.
- Implement S0→S5 in order (S2∥S3 allowed); keep each commit green on
  `bun run check`. Use in-house primitives/headless + Iconify only; **no new
  deps**; named tokens only.
- Recommended next state: **await user confirmation of A1–A4/A6–A7**, then start
  S0–S1 (unaffected by those toggles) and proceed.
