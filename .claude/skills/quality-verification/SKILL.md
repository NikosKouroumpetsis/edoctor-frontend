---
name: quality-verification
description: Design and execute independent verification for a software change across happy paths, edge cases, negative cases, permissions, regressions, and user-like scenarios using repository-approved commands. Use after implementation, after bug fixes, or whenever a QA gate or test evidence is required.
---

# Quality Verification

Use `project-context`, acceptance criteria, changed files, and implementation
evidence first. Read the project's test instructions before running tests.

## Establish Scope And Risk

Map every acceptance criterion to at least one verification method. Increase
depth for permissions, tenant boundaries, money, migrations, shared code,
concurrency, external side effects, and public contracts. Distinguish behavior
that can be proven statically, with automated tests, or only through a running
system/manual scenario.

Read [verification-matrix.md](references/verification-matrix.md) when building a
test plan, choosing test levels, triaging failures, or assessing whether the
evidence is sufficient for `PASS`.

## Build The Verification Matrix

Cover only relevant dimensions, but consider:

- Acceptance criteria and primary user paths.
- Boundary values and invalid input.
- Authentication, authorization, ownership, and tenant isolation.
- Persistence, transactions, retries, and failure behavior.
- Backward compatibility and regression-prone adjacent behavior.
- Environment, configuration, migration, and seed assumptions.
- Concurrency, idempotency, clocks, ordering, and external side effects.

For each scenario record preconditions, action, expected observable result,
test level, fixture needs, command, and risk addressed.

## Execute Independently

1. Verify the implementation diff and test scope before trusting developer
   claims.
2. Start with focused tests for changed behavior.
3. Add or improve tests when coverage is missing and file ownership permits it.
4. Exercise negative and permission paths independently of the happy path.
5. Rerun failed checks after corrections using the original reproduction.
6. Broaden to required final gates based on project policy and blast radius.
7. Distinguish implementation failures, test defects, flaky results, and
   environment blockers.

## Evidence Semantics

- `PASS`: all required scenarios and commands passed with no blocking gap.
- `FAIL`: behavior or a required quality gate is incorrect.
- `BLOCKED`: required verification could not run for a specific external reason.
- `NOT_RUN`: no attempt was made; it is never equivalent to pass.

Do not infer broad suite success from a focused test. Do not accept a test that
only asserts implementation details when the acceptance criterion is
user-visible behavior.

## Stop Conditions

Stop and report rather than improvising when tests require destructive commands,
unapproved infrastructure, missing secrets, or conflicting instructions. Route
an unclear failure to `debugger`; route a confirmed implementation defect to
`code-architect`.

Write exact commands, results, scenarios, failures, and limitations to `QA.md`.
Update `CHANGE_REQUESTS.md` for failures. Return the handoff contract with
coverage by acceptance criterion, unrun scenarios, residual risk, and gates to
rerun.
