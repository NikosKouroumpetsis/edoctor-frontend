# 40 — Progress

- RUN_ID: `2026-07-02-image-uploader`
- Owner: `code-architect` (dispatched 2026-07-02 by standalone planner)
- Decisions **A1–A7: CONFIRMED by user (2026-07-02)** — built to 10-plan.md as written.

## Stage tracker

| Stage | Description                                                                                                                          | Status | Gates                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------- |
| S0    | Scaffold: folder, `index.ts`, `lib/types.ts`, `lib/context.ts`, i18n keys (el+en) + `paraglide:compile`                              | done   | `check` PASS                                                              |
| S1    | Controller + `validators.ts` + `reorder.ts` + unit tests                                                                             | done   | `check` PASS, `test` PASS                                                 |
| S2    | Upload dialog (dropzone/tile/errors) + harness + stories + play tests                                                                | done   | `check` PASS, `lint` PASS (my scope), `build-storybook` PASS              |
| S3    | Empty/entry surface + illustration slot + stories                                                                                    | done   | `check` PASS, `build-storybook` PASS                                      |
| S4    | Gallery/grid + cover + tile + placeholder + add-more + item-menu + stories                                                           | done   | `check` PASS, `lint` PASS (my scope), `build-storybook` PASS              |
| S5    | Native DnD + keyboard reorder + orchestrator + integration test + a11y/dark/responsive + i18n parity                                 | done   | `check` PASS, `lint` PASS (my scope), `test` PASS, `build-storybook` PASS |
| S6    | Standalone part stories: story-only context provider + shared mocks + 11 per-part `*.stories.svelte` + "All together" composed story | done   | `check` PASS, `lint` PASS (my scope), `build-storybook` PASS              |

## Files created (single owned tree) + appended catalogs

- `src/shared/ui/organisms/image-uploader/`
  - `index.ts`, `image-uploader.svelte` (orchestrator), `image-uploader.harness.svelte`,
    `image-uploader.stories.svelte`, `image-uploader.test.ts`
  - `lib/`: `types.ts`, `context.ts`, `create-image-uploader.svelte.ts` (+ `.test.ts`),
    `validators.ts` (+ `.test.ts`), `reorder.ts` (+ `.test.ts`)
  - `components/`: `uploader-empty`, `upload-dialog`, `upload-dropzone`, `upload-tile`,
    `upload-errors`, `photo-gallery`, `photo-cover`, `photo-tile`, `photo-placeholder`,
    `photo-add-more`, `photo-item-menu` (all `.svelte`)
- Appended 31 `image_uploader_*` keys to `messages/el.json` (canonical) and
  `messages/en.json` (parity) — el/en key sets identical (95/95).

## Gate results (final)

- `bun run check` — PASS (0 errors, 0 warnings; 1447 files).
- `bun run test` — PASS (60 files, 239 tests; +36 new: 34 unit/integration in this tree).
- `bun run lint` — PASS globally (eslint clean; prettier clean). Note: the run-artifact
  `.md` docs under `docs/runs/` were unformatted before this task and were normalized by the
  planner during verification, so `prettier --check .` is now green.
- `bun run build-storybook` — PASS (informational).

## Deviations from 10-plan.md

- Added `issueMessage(issue)` to `lib/validators.ts` (code→`m.image_uploader_error_*`
  mapper) rather than a new file, to keep one source of truth for tile + banner without
  adding an unlisted module.
- Reorder keyboard path uses a dedicated drag-handle `<button>` (accessible focus + arrow
  keys + drag source) instead of a focusable tile wrapper, avoiding an
  `a11y_no_noninteractive_tabindex` violation. The "…" menu "Move forward" remains the
  promote-to-cover path. `photo-tile` drag handle was already anticipated by the plan.
- Skipped the optional `_showcases` example: it would live under `src/shared/ui/_showcases/`
  (outside the owned tree). Co-located stories cover every state.
- Per-tile progress is exposed via `role="progressbar"` on the uploading overlay (spinner
  visual per shot5) rather than the `Progress` bar primitive.

## S6 — Standalone part stories (μεμονωμένα + όλα μαζί)

New files (all inside the owned organism folder):

- `components/story-harness.svelte` — story-only context provider (builds a controller,
  `setImageUploaderContext`, optional `setup(controller)` to drive state, renders
  `children`, `destroy()` on unmount). NOT a `*.stories.` file, NOT exported from
  `index.ts`.
- `lib/mocks.ts` — shared story fixtures (mock `UploadFn`s: `mockUpload`/`pendingUpload`/
  `failingUpload`; `dataUri`/`remoteItem`/`seededItems`; `sampleImage`/`samplePng`;
  `makeStaged`). Internal; NOT exported from `index.ts`. `image-uploader.stories.svelte`
  now imports these (removing the earlier inline duplicates).
- 11 per-part stories under `components/`: `uploader-empty`, `upload-dialog`,
  `upload-dropzone`, `upload-tile`, `upload-errors`, `photo-gallery`, `photo-cover`,
  `photo-tile`, `photo-placeholder`, `photo-add-more`, `photo-item-menu`
  (each `*.stories.svelte`).
- `image-uploader.stories.svelte` — added `All together (full flow)` (real orchestrator).

Storybook nav (titles the user sees):

- `Organisms/Image uploader` — composed flow: Dialog · empty / selected / uploading (mock) /
  validation (jpeg only) / upload error; Empty (entry); Gallery; Gallery · keyboard reorder;
  Default; **All together (full flow)**.
- `Organisms/Image uploader/Parts/Uploader empty` — Empty (shot1), Custom copy.
- `Organisms/Image uploader/Parts/Upload dialog` — Empty, Staged (valid), Uploading,
  Validation rejected.
- `Organisms/Image uploader/Parts/Upload dropzone` — Default, Drag over.
- `Organisms/Image uploader/Parts/Upload tile` — Valid (remove), Uploading, Done, Error,
  Invalid.
- `Organisms/Image uploader/Parts/Upload errors` — Banner.
- `Organisms/Image uploader/Parts/Photo gallery` — Grid (shot6).
- `Organisms/Image uploader/Parts/Photo cover` — Cover.
- `Organisms/Image uploader/Parts/Photo tile` — Filled tile.
- `Organisms/Image uploader/Parts/Photo placeholder` — Placeholder.
- `Organisms/Image uploader/Parts/Photo add more` — Add more.
- `Organisms/Image uploader/Parts/Photo item menu` — Open menu, Trigger.

Gate results (S6): `bun run check` PASS (1460 files, 0 errors / 0 warnings) ·
`bun run lint` eslint PASS + prettier PASS on all owned files · `bun run build-storybook`
PASS (all 11 Parts + composed group registered in the built index).

Deviations (S6): `photo-tile`'s isolated part story shows the tile + "…" menu but not the
drag handle — the handle is rendered by the gallery wrapper (`photo-gallery`), not by
`photo-tile` itself (real prop contract). Noted in that story.

## Log

- 2026-07-02 — Plan approved by user ("προχώρα"). Handoff to code-architect.
- 2026-07-02 — S0→S5 implemented in order; every stage kept the tree green on `bun run check`.
- 2026-07-02 — **Independent verification by planner** (re-ran, not just trusting the report):
  `bun run check` PASS (1447 files, 0 errors / 0 warnings); `bun run lint` PASS
  (prettier + eslint clean, after formatting the run-artifact `.md` files);
  `vitest run src/shared/ui/organisms/image-uploader` → 4 files / 34 tests PASS;
  token-compliance scan of the tree = clean (no arbitrary values, raw hex, or
  off-token color utilities). `build-storybook` PASS was the implementer's run.
