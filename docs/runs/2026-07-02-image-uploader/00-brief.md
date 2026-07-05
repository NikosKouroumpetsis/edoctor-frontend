# 00 — Brief: Generic Image Uploader (Airbnb-style photo flow)

## Request

Port the 8 reference screenshots (`images/images/*`) into a **generic,
reusable image-upload/management component set** for the SvelteKit `frontend`,
1:1 in UI/UX, following the project architecture and styling, and exercised in
Storybook. The component must be generic enough that a **parent** can inject
**image validations** (type, size, dimensions, count, custom).

Source screenshots (analysed): `images/images/` (copied for reading to the
session scratchpad as `shot1..shot8.png`).

## Scope (this run)

In scope — a shared **organism** `src/shared/ui/organisms/image-uploader/`:

1. **Empty/entry surface** (shot1) — dashed placeholder card + illustration +
   "Προσθέστε φωτογραφίες".
2. **Upload dialog** (shot2 → shot4 → shot5) — modal with three internal
   states: empty dropzone → selected grid (remove) → uploading grid
   (progress / checkmark / cancel), custom header (X · title+counter · +) and
   footer (secondary · primary).
3. **Gallery / grid manager** (shot6–8) — cover photo + badge, 2-col grid,
   placeholder tiles, "add more" tile, per-item "…" menu (Επεξεργασία /
   Μετακίνηση προς τα εμπρός / Διαγραφή), drag-to-reorder.
4. **Headless controller** (runes) owning state + the parent-injected
   validation + (optional) upload lifecycle.
5. i18n keys (el canonical + en parity), Storybook stories with a mock
   uploader + validation demo, unit + play tests.

Out of scope — the native OS file picker (shot3, browser-owned); a built-in
image editor/cropper (the "Επεξεργασία" action is a parent callback for now);
wiring into any real product screen/form (a follow-up once the component ships).

## Assumptions (defaults chosen while user was away — override any before handoff)

- **A1 Upload mode** = _optional injected uploader_. Component accepts optional
  `upload(file,{signal,onProgress})`; with it → in-dialog progress/checkmark/
  cancel (shot5); without it → pure selector emitting validated files.
- **A2 Value model** = _mixed remote + local_, top-level list `bindable`
  (usable controlled or uncontrolled). Supports create **and** edit flows.
- **A3 Validation errors UX** = _inline banner in dialog + per-tile red state_
  (screenshots show no error state; this is a new, additive surface).
- **A4 Reorder** = _native HTML5 drag-and-drop + "move to front" menu action_,
  with keyboard-accessible fallback (no new dependency).
- **A5 Dark buttons** in the mock ("Περιήγηση", "Ανέβασμα") map to the named
  `secondary` token (#0f172a), not `primary` (blue) — 1:1 with the screenshots
  while still using a named token.
- **A6 Empty-state illustration** = Iconify placeholder (`~icons/lucide/camera`)
  behind an `illustration` snippet slot, so the exact 3D asset can be dropped in
  later without an API change.
- **A7 "Επεξεργασία"** = `onEdit(item)` callback / no-op placeholder (no
  built-in cropper this run).

## Acceptance criteria

- All three surfaces render 1:1 with the screenshots (light theme parity),
  responsive from the 375px base up, dark-mode safe.
- Parent can inject validators (type/size/min-max dimensions/count/custom) and
  they gate staged files; rejected files show per A3.
- Optional `upload` drives per-file progress + cancel; absence yields
  selection-only with no progress UI.
- Mixed remote/local seeding renders existing photos and supports add/remove/
  reorder/set-cover.
- Named design tokens only (no raw palette/arbitrary values); in-house
  primitives + Iconify only; **no new dependencies**.
- Storybook covers every state + a validation demo; play tests assert the key
  interactions. `bun run check` and `bun run lint` pass; `bun run build-storybook`
  compiles.

## Verification gates

`bun run check` (hard) · `bun run lint` · `bun run test` · `bun run build-storybook`.
