---
name: clean-subagents
description: Clean the selected stable subagents pipeline run, stopping only its owned subagents and background work, closing lifecycle state, and optionally purging its archive. Use only when the user invokes `/clean-subagents`.
argument-hint: "[--run <RUN_ID>] [--purge] [reason]"
disable-model-invocation: true
---

# Clean Subagents Pipeline

Clean this target:

`$ARGUMENTS`

Load `pipeline-cleanup`, `pipeline-core`, and `project-context`.

## Procedure

1. Resolve the selected run from `--run` or the configured current pointer.
2. Confirm `state.json.pipeline` is `subagents`. On mismatch, stop without
   touching runtime resources.
3. Run `cleanup begin subagents` through the configured launcher, passing the
   selected run and a concise reason.
4. Stop new delegation from the main orchestrator.
5. Identify subagents, nested subagents, background tool tasks, and background
   sessions opened for this `RUN_ID`.
6. Ask active workers for a final handoff when possible, then stop or cancel
   them through current-session Claude controls. Use `/agents` and its Running
   view when direct controls are unavailable.
7. Stop and remove pipeline-owned background session entries through official
   Agent View/session controls. Preserve wanted work before deleting a
   Claude-created worktree.
8. Verify that no owned subagent or background resource remains active.
9. If everything is clean, run `cleanup finish subagents`; include `--purge`
   only when present in `$ARGUMENTS`.
10. If anything remains, run `cleanup partial subagents --note <details>` and
    report the exact resource and retry action.

## Boundaries

- Do not treat Agent Team teammates as subagents; use `/clean-team` for a
  `team-agents` run.
- Do not stop another run's workers or unrelated Agent View sessions.
- Do not manually delete Claude supervisor/runtime directories.
- Completed foreground subagents normally have no persistent runtime resource;
  record their result but do not invent cleanup work.
- Do not claim the delivery pipeline completed when cleanup cancelled it.

Return cleanup status, run ID, stopped resources, preserved work, archive
action, and anything still requiring manual attention.
