---
name: pipeline-subagents
description: Run the repository's stable end-to-end software delivery pipeline with the main Claude session as orchestrator and focused custom subagents for planning, architecture, implementation, debugging, QA, security, review, and documentation. Use when the user asks for the normal pipeline, an end-to-end feature change, or `/pipeline-subagents`.
argument-hint: "[feature request]"
disable-model-invocation: true
---

# Stable Subagents Pipeline

Orchestrate this request:

`$ARGUMENTS`

Load `pipeline-core` and `project-context` before routing work.

## Initialize Or Resume

1. Determine a concise run slug and title.
2. Run the configured pipeline launcher with `start subagents`.
3. If a matching active run exists, resume it instead of creating duplicate
   state.
4. Read `state.json`, `REQUEST.md`, `BRIEF.md`, and open change requests.

The main session remains user-facing and owns routing. Subagents cannot spawn
other subagents, so every handoff returns to the main orchestrator.

## Default Flow

1. Invoke `project-manager` for scope, acceptance criteria, risks, and task
   sequencing.
2. Resolve blocking product questions according to the configured mode.
3. Invoke `code-architect` for repository analysis, architecture, and an
   implementation blueprint.
4. Invoke `senior-engineer` to challenge the blueprint and approve or request
   changes.
5. Return architecture changes to the same planning roles until resolved.
6. Invoke `code-architect` for implementation with explicit file ownership.
7. Invoke `debugger` only when failures are unclear, unstable, or need root
   cause isolation.
8. Invoke `qa-tester` for independent verification.
9. Invoke `security-reviewer` when the routing matrix triggers the gate.
10. Invoke `code-reviewer` as the final code quality gate.
11. Send requested corrections to `code-architect` or `debugger`, then rerun
    every affected gate.
12. Invoke `documenter` when durable documentation changed.
13. Reconcile artifacts, transition to `FINALIZING`, write
    `FINAL_SUMMARY.md`, validate the run, and only then mark it complete.
14. Load `pipeline-cleanup`, run `cleanup begin subagents`, stop any remaining
    run-owned background workers, and run `cleanup finish subagents` without
    `--purge`.

## Delegation Rules

- Prefix every delegation with `[pipeline-run:<RUN_ID>]` and give the subagent
  the run ID, role, current state, exact task, relevant artifacts, owned
  files/modules, forbidden scope, and expected handoff contract.
- Require the returned handoff to repeat the run ID and list spawned or
  background resources so cleanup ownership remains auditable.
- Resume a subagent when the runtime supports it and prior role context is
  useful. Otherwise rehydrate from artifacts without pasting unrelated history.
- Do not delegate user communication.
- Do not run multiple writers against overlapping files.
- Do not accept self-review as the final code-review or QA gate.

## Stop Conditions

Stop and ask the user when a required decision is material and cannot be
resolved under the configured mode. Stop as blocked when loop limits are
reached, required infrastructure is unavailable, or repository instructions
conflict.

When the user cancels or runtime workers become stuck, use `/clean-subagents`
for the selected run. Do not mark the run `COMPLETE` as a substitute for
cleanup, and do not purge its archive unless the user explicitly requests it.
