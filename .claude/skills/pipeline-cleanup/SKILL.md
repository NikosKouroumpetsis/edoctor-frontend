---
name: pipeline-cleanup
description: Shared lifecycle, ownership, runtime shutdown, archive preservation, and purge rules for cleaning a Claude subagents or Agent Teams pipeline run. Use internally whenever a pipeline completes, is cancelled, or needs stuck runtime resources removed.
user-invocable: false
---

# Pipeline Cleanup

Use `project-context` and `pipeline-core` first. Cleanup has two independent
responsibilities: close Claude runtime resources and close the repo-visible run
lifecycle. Never treat one as proof that the other succeeded.

## Resolve The Target

1. Parse `$ARGUMENTS` for optional `--run <RUN_ID>` and `--purge`.
2. Without `--run`, use the configured current pointer.
3. Read the target `state.json` and confirm its `pipeline` matches the cleanup
   command (`subagents` or `team-agents`).
4. Scope cleanup to resources opened for that run. Never clean unrelated Claude
   sessions, teams, tasks, or worktrees.

Every pipeline delegation or teammate spawn must include the `RUN_ID`, role,
owned task, owned files/modules, and expected handoff. Use those identifiers and
the current session's runtime controls to determine ownership.

## Begin Before Runtime Cleanup

Run the configured launcher:

```text
cleanup begin <subagents|team-agents> [--run <RUN_ID>] --reason <text>
```

This records `CANCELLING` for unfinished runs and initializes `CLEANUP.md`.
Terminal `COMPLETE` or `FAILED` runs keep their terminal state.

Do not use generic `transition` for `CANCELLING` or `CANCELLED`.

## Runtime Result

After using the mode-specific official Claude controls:

- Success: run `cleanup finish <pipeline>` and add `--purge` only when the user
  explicitly requested it.
- Incomplete cleanup: run `cleanup partial <pipeline> --note <remaining work>`.
- Do not call `finish` while an owned worker, teammate, task, or required native
  runtime resource remains active.

`--purge` is valid only on successful `finish`. It removes the selected run
archive after recording successful cleanup and clears the current pointer only
when it points to that run.

## Preserve Durable Work

Default cleanup keeps `.claude/tasks/runs/<RUN_ID>/` for audit and debugging.
Before stopping a worker, capture its final handoff, changed files, uncommitted
work, interrupted task, and unrun gates in `CLEANUP.md` or the appropriate run
artifact.

Never delete source changes, unrelated worktrees, pipeline definitions, or
another run. A runtime-created worktree may be removed only after wanted changes
are integrated or explicitly abandoned by the user.

## Completion Semantics

- Unfinished run plus successful cleanup: `CANCELLED`.
- `COMPLETE` or `FAILED` run plus successful cleanup: preserve that state.
- Partial cleanup: remain `CANCELLING`, preserve pointer and archive, and report
  the exact retry requirement.
- No selected run: report `NO_PIPELINE_RUN`; do not invent or scan all runs.

Cleanup never converts incomplete QA or review into a pass.
