---
name: clean-team
description: Gracefully shut down and clean the selected Agent Teams pipeline run from its team lead, close lifecycle state, and optionally purge its archive. Use only when the user invokes `/clean-team`.
argument-hint: "[--run <RUN_ID>] [--purge] [reason]"
disable-model-invocation: true
---

# Clean Agent Team Pipeline

Clean this target:

`$ARGUMENTS`

Load `pipeline-cleanup`, `pipeline-core`, and `project-context`.

## Procedure

1. Resolve the selected run from `--run` or the configured current pointer.
2. Confirm `state.json.pipeline` is `team-agents`. On mismatch, stop without
   messaging or shutting down any teammate.
3. Confirm the current Claude session is the team lead. A teammate must not
   perform final team cleanup.
4. Run `cleanup begin team-agents` through the configured launcher, passing the
   selected run and a concise reason.
5. Stop assigning or allowing teammates to claim new tasks.
6. Ask every active teammate for a final handoff and graceful shutdown by its
   predictable teammate name. Wait for current tool calls to return.
7. Record completed, interrupted, and unreviewed work in the run artifacts.
8. After all teammates have stopped, ask the lead to clean up the team through
   Claude Code's native Agent Teams cleanup operation.
9. Verify that the native team and shared task resources no longer exist from
   the lead's runtime perspective.
10. If everything is clean, run `cleanup finish team-agents`; include
    `--purge` only when present in `$ARGUMENTS`.
11. If a teammate or native team resource remains, run
    `cleanup partial team-agents --note <details>` and report how to retry.

## Boundaries

- Never edit or delete `~/.claude/teams/**` or `~/.claude/tasks/**` manually.
- Never ask a teammate to run final team cleanup.
- Do not clean a different team or unrelated Claude session.
- Do not purge the repo-visible archive before native cleanup succeeds.
- Do not claim the delivery pipeline completed when cleanup cancelled it.

Return cleanup status, run ID, teammates shut down, native cleanup result,
preserved work, archive action, and anything still requiring manual attention.
