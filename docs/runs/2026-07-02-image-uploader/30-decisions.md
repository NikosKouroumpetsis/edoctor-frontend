# 30 — Decision records

Each decision: context · choice · alternatives · consequences · reversibility.

> **CONFIRMED 2026-07-02** — the user reviewed the summary and replied "προχώρα".
> All decisions below (A1–A4 recommended defaults, plus A6 illustration slot and
> A7 `onEdit` callback) are **approved as written**. They are no longer pending;
> implement to `10-plan.md`.

## D-A1 — Upload transport ownership (default, confirm)

- **Context:** shot5 shows per-file progress + "X από Y ανεβασμένα".
- **Choice:** _Optional injected uploader._ `upload?: UploadFn` where
  `UploadFn = (file, { signal, onProgress }) => Promise<UploadResult>`. Present →
  the dialog "Ανέβασμα" runs uploads, renders progress/checkmark/cancel, and
  commits returned remote refs. Absent → selection-only: commit validated
  `File`s as local items, no progress UI.
- **Alternatives:** always-internal upload (rejected: forces a transport on
  selection-only callers); selection-only-only (rejected: cannot reproduce
  shot5).
- **Consequences:** the progress state machine lives in the controller but is
  inert without `upload`. Transport, auth, retries stay with the parent.
- **Reversible:** yes (adding a mode later is additive).

## D-A2 — Value model (default, confirm)

- **Context:** real forms edit listings that already have photos.
- **Choice:** _Mixed remote + local_, single ordered list; top-level
  `items` is a `$bindable` prop (works controlled or uncontrolled).
  `UploaderItem = RemoteImage{ kind:'remote', id, url, alt?, width?, height? } |
LocalImage{ kind:'local', id, file, previewUrl, width?, height? }`.
- **Alternatives:** local-only v1 (rejected: no edit-flow reuse); fully
  parent-controlled/stateless (rejected: pushes all preview/objectURL lifecycle
  onto every caller — poor DX; bindable already allows controlled use).
- **Consequences:** controller owns objectURL creation/revocation for local
  items; must not leak URLs on remove/destroy.
- **Reversible:** yes.

## D-A3 — Validation-error presentation (default, confirm)

- **Context:** screenshots show no rejection UI; a toast system does not exist
  in the repo.
- **Choice:** _Inline banner inside the dialog + per-tile red state._ Rejected
  files list their reason under the dropzone; failing tiles get a
  `border-destructive` outline + reason (tooltip/aria). Count violations
  (min/max) surface as a dialog-level message and gate the primary button.
- **Alternatives:** banner-only / tile-only (kept as narrower fallbacks);
  toast (rejected now — would require building a toast primitive first).
- **Consequences:** adds an additive error surface not in the mock; keep it
  visually consistent with `danger/destructive` tokens.
- **Reversible:** yes.

## D-A4 — Reorder (default, confirm)

- **Context:** subtitle "Σύρετε για να αλλάξετε τη σειρά" + menu "Μετακίνηση
  προς τα εμπρός"; contract forbids new deps without approval.
- **Choice:** _Native HTML5 drag-and-drop_ for pointer reorder + **menu
  "move to front"** (promote to cover) + **keyboard** reorder (focus a tile →
  arrow keys, announced via an aria-live region) as the accessible path.
- **Alternatives:** a DnD library (rejected: new dependency); menu-only or
  no-reorder v1 (kept as fallbacks if drag proves costly).
- **Consequences:** custom DnD handlers + a small reorder util; test with
  keyboard path (deterministic) and a Storybook play test.
- **Reversible:** yes.

## D-1 — Placement & atomic level (owned)

- **Choice:** one **organism** `src/shared/ui/organisms/image-uploader/` with a
  local `components/` (sub-parts) and `lib/` (controller, validators, types,
  context), per the slice hierarchy the contract allows once a unit grows.
- **Alternatives:** split parts into standalone molecules (rejected: the
  sub-parts are controller/context-coupled, not independently reusable);
  promote the controller to `src/shared/lib` now (deferred: promote to
  `src/shared/lib/uploads` only if a second consumer appears).
- **Reversible:** yes (promotion is a later refactor).

## D-2 — Button/token mapping (1:1) (owned)

- **Choice:** the mock's near-black CTAs map to `variant="secondary"`
  (`--secondary #0f172a`); "Τέλος"/"Ακύρωση" = `variant="ghost"`; circular
  icon actions = `variant="secondary"`/`ghost` with `size="icon-sm"` +
  `rounded-full`. Blue `primary` is intentionally **not** used here to stay 1:1.
- **Reversible:** trivial.

## D-3 — Genericity of copy (owned)

- **Choice:** all copy defaults to Paraglide `m.image_uploader_*` (params for
  counts/name), with **optional prop/snippet overrides** (`title`, `subtitle`,
  `emptyCta`, `illustration`) so the component is reusable across contexts
  without editing catalogs.
- **Reversible:** yes.

## D-4 — Dependencies (owned, per contract)

- **Choice:** **no new dependencies.** In-house primitives + headless layer,
  Iconify virtual icons, native DnD/`<input type=file>`/`URL.createObjectURL`,
  and the async `Image()`/`createImageBitmap` decode for dimension validation.
- **Reversible:** n/a.

## Confirmation status

- **A1–A4, A6, A7 — CONFIRMED by user 2026-07-02.** No open product decisions
  remain for this run. If the exact 3D camera asset (A6) or a real Edit/cropper
  (A7) is wanted later, both are additive and slot into the reserved
  `illustration` snippet / `onEdit` callback without an API change.
