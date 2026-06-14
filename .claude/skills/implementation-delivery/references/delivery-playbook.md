# Delivery Playbook

## Table Of Contents

1. Change safety
2. Test ownership
3. Special change classes
4. Gate-fix workflow
5. Completion evidence

## Change Safety

Before each edit confirm:

- The file is in the assigned scope.
- It is not generated output or a protected artifact.
- Nearby code establishes the pattern being followed.
- The change is necessary for an acceptance criterion or approved cleanup.
- Unrelated modifications in the file will be preserved.
- A focused verification path exists.

Prefer a small sequence of reviewable changes over a broad rewrite. Avoid
mechanical cleanup outside touched behavior unless required for correctness.

## Test Ownership

Add tests where the behavior belongs:

- Domain invariant or pure policy: unit test.
- Repository, schema, transaction, or persistence mapping: integration test.
- Controller, route, API contract, middleware wiring: e2e or contract test.
- Bug fix: regression test that fails before the fix when practical.
- Shared utility: focused unit tests plus affected consumer tests when risk is
  broad.

Do not duplicate the same assertion at every layer. Use the cheapest layer that
proves the behavior and add higher-level coverage for wiring or public
contracts.

## Special Change Classes

### Schema Or Migration

- Address existing data, nullability, uniqueness, indexes, and rollback.
- Keep generated output out of manual edits.
- Verify the repository's compose, validate, migration, and test workflow.
- Do not use destructive reset commands outside documented test environments.

### Shared Code

- Confirm more than one real consumer or a canonical shared extension point.
- Preserve behavior for existing consumers.
- Run affected consumer tests, not only utility tests.

### Public Contract

- Update validation, response/error mapping, docs, examples, and contract tests.
- Consider old clients and staged rollout.
- Remove stale alternative routes or definitions.

### External Side Effect

- Define timeout, retry, idempotency, error translation, logging, and test
  doubles.
- Avoid leaking secrets or sensitive payloads.

## Gate-Fix Workflow

For every QA, security, or review finding:

1. Reproduce or verify the evidence.
2. Map it to the owning behavior and root cause.
3. Apply the smallest coherent correction.
4. Add or update regression coverage.
5. Run the focused check.
6. Record the finding identifier, files, resolution, and gates to rerun.

Do not mark a finding resolved because code changed; require evidence that the
reported scenario now behaves correctly.

## Completion Evidence

```yaml
implemented_acceptance_criteria: []
changed_files: []
tests_added_or_updated: []
commands_run:
  - command: repository script
    result: pass, fail, or blocked
deviations: []
unrun_checks: []
residual_risks: []
next_gate: qa-tester
```
