# Verification Matrix Reference

## Table Of Contents

1. Scenario model
2. Test-level selection
3. Risk lenses
4. Failure triage
5. QA report example

## Scenario Model

```yaml
id: stable scenario identifier
acceptance_criteria: [AC identifiers]
risk: behavior or regression being controlled
preconditions: actor, data, configuration, and state
action: exact operation
expected: response, state, side effect, and forbidden behavior
level: static, unit, integration, e2e, contract, migration, or manual
command: repository-approved script
result: pass, fail, blocked, or not_run
evidence: test name, output summary, file, or artifact
```

## Test-Level Selection

| Behavior | Preferred evidence |
| --- | --- |
| Pure invariant, policy, mapper, helper | Unit test |
| Repository query, transaction, schema behavior | Integration test |
| Route, controller, middleware, API response | E2E or contract test |
| Migration and historical data | Migration/diff test plus integration |
| External gateway contract | Contract test with controlled double |
| User workflow across boundaries | E2E or targeted manual verification |
| Type/interface compatibility | Typecheck/build plus focused tests |

Use the lowest level that proves the behavior, then add higher-level evidence
for wiring, contracts, and critical workflows.

## Risk Lenses

- Happy path and expected side effects.
- Empty, minimum, maximum, malformed, duplicate, and stale inputs.
- Authentication, role, ownership, tenant, and object-existence disclosure.
- Not-found, conflict, timeout, retry, partial failure, and rollback.
- Pagination, ordering, locale, timezone, precision, and serialization.
- Concurrent requests, idempotency, duplicate events, and race windows.
- Existing clients, old data, seeds, fixtures, and configuration.
- Logs, metrics, notifications, queues, files, caches, and external calls.

Select lenses based on the actual change. Do not generate irrelevant tests to
inflate scenario count.

## Failure Triage

| Classification | Evidence | Route |
| --- | --- | --- |
| Implementation defect | Expected behavior is clear; product path fails | Code architect |
| Unknown root cause | Reproduction exists but cause is unclear | Debugger |
| Test defect | Assertion or fixture contradicts accepted behavior | QA tester |
| Flaky test | Same inputs produce inconsistent results | Debugger and QA |
| Environment blocker | Required service, permission, or config unavailable | Lead |
| Requirement ambiguity | Expected behavior is not defined | Project manager/lead |

## QA Report Example

```text
Status: FAIL
Acceptance criteria covered: AC1, AC2
Passed: primary success, invalid input, unauthorized actor
Failed: concurrent duplicate request creates two records
Evidence: targeted integration test and persisted rows
Unrun: broad e2e suite, blocked by unavailable test service
Required change: enforce idempotency at the persistence boundary
Next role: debugger
```
