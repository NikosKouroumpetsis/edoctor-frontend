---
name: implementation-delivery
description: Implement an approved software change in an existing repository while preserving architecture, minimizing diff scope, adding appropriate tests, recording deviations, and running focused verification. Use when writing or modifying production code, tests, migrations, seeds, configuration, or implementation documentation.
---

# Implementation Delivery

Use `project-context`, the approved brief, architecture, and implementation
plan before editing.

## Preflight

1. Read the active task, acceptance criteria, decisions, change requests, and
   verification requirements.
2. Inspect the working tree and preserve unrelated user or teammate changes.
3. Confirm file/module ownership and identify generated or protected paths.
4. Inspect canonical neighboring implementations and tests.
5. Select the smallest repository-approved verification command for the task.

Read [delivery-playbook.md](references/delivery-playbook.md) for migrations,
shared code, cross-module edits, public contracts, or changes returned from a
quality gate.

## Execute Deliberately

1. Implement one coherent task or vertical behavior slice at a time.
2. Preserve public behavior outside the accepted change.
3. Reuse existing abstractions, policies, helpers, and error semantics.
4. Keep validation, I/O, persistence, and presentation responsibilities in
   their repository-defined layers.
5. Handle failure paths, permissions, cleanup, and compatibility alongside the
   primary path.
6. Add or update tests at the layer where the changed behavior is owned.
7. Remove or redirect replaced sources of truth instead of leaving duplicates.
8. Record deviations before continuing when repository evidence invalidates
   the approved plan.

## Verification Ladder

Run checks in increasing scope:

1. Static or syntax check for the changed area.
2. Newly added or directly affected tests.
3. Directly affected module, route, or integration tests.
4. Typecheck, lint, build, and broad suites required by project policy.

Fix a failing focused check before broadening. Classify failures as caused by
the change, pre-existing, flaky, or environment-blocked and record evidence.

## Plan Deviations

Continue without replanning only for local, reversible implementation detail
that preserves approved boundaries and behavior. Return to architecture review
for changed module ownership, public contracts, data model, migration strategy,
security behavior, new dependencies, or materially increased blast radius.

Do not overwrite unrelated user changes, add dependencies without approval,
run invented commands, or claim checks passed when they were not run.

## Stop Conditions

Return `NEEDS_USER_INPUT` for required approval or product ambiguity. Return
`BLOCKED` for conflicting instructions, unavailable required infrastructure,
or unsafe file ownership. Route unclear failures to `debugger` instead of
stacking speculative fixes.

Update `PROGRESS.md` with files, commands, outcomes, decisions, and remaining
work. Resolve change requests by identifier and return the handoff contract
with exact changed files, behavior delivered, checks run, unrun checks, and
recommended next gate.
