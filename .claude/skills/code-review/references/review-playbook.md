# Code Review Playbook

## Table Of Contents

1. Review preparation
2. High-risk lenses
3. Severity and confidence
4. Finding examples
5. No-finding report

## Review Preparation

Establish:

- Accepted scope and non-goals.
- Architecture decisions and approved deviations.
- Changed files plus relevant unchanged callers and consumers.
- New and updated tests, commands run, and environment limitations.
- Open and previously resolved change requests.
- Generated files, migrations, configuration, seeds, and docs affected.

Use repository history only when it helps explain intent or regression risk.

## High-Risk Lenses

### Data And Transactions

- Missing filters, incorrect joins, accidental broad writes, stale reads.
- Uniqueness, nullability, precision, ordering, pagination, historical data.
- Partial updates, transaction boundaries, retries, and idempotency.

### Permissions And Tenancy

- Authentication without authorization.
- Role checks without ownership or tenant checks.
- Scope applied in one query but omitted in another path.
- Existence disclosure through status or error differences.

### Concurrency And External Effects

- Check-then-write races and duplicate processing.
- Events or notifications emitted before durable commit.
- Timeouts, retries, callback verification, and cleanup omissions.
- External failure leaving inconsistent local state.

### Contracts And Compatibility

- Changed response shape, error semantics, defaults, enum values, or routes.
- Old clients, jobs, fixtures, seeds, migrations, and configuration.
- Duplicate sources of truth left after a rename or refactor.

### Tests

- Tests assert mocked implementation rather than behavior.
- Negative or permission scenarios are missing.
- Regression test would pass before the fix.
- Integration behavior is covered only by unit mocks.
- Broad shared changes lack affected-consumer evidence.

## Severity And Confidence

- `BLOCKER`: release should stop because a likely path causes severe security,
  data integrity, destructive, or system-wide failure.
- `MAJOR`: a concrete user-visible defect, regression, important architecture
  breach, or missing critical test path.
- `MINOR`: limited defect or maintainability issue worth correcting but not a
  release blocker under the accepted scope.

State confidence when evidence is incomplete. Ask for evidence or mark blocked
rather than presenting a low-confidence suspicion as fact.

## Finding Examples

Good:

```text
[MAJOR] src/example.ts:42 - Tenant scope is omitted from the update
Impact: an authenticated user can update a record owned by another tenant when
they know its identifier.
Evidence: the read path filters tenantId, but updateMany filters only id; the
negative integration test covers role but not tenant ownership.
Required change: include tenant scope in the persistence filter and add a
cross-tenant regression test.
```

Weak:

```text
This function could be cleaner and may have security problems.
```

## No-Finding Report

When no findings remain, report:

- What code and behavior were reviewed.
- Which verification evidence was considered.
- Any commands not run.
- Residual risks such as unavailable infrastructure or untested operational
  behavior.
- Explicit `PASS` status.
