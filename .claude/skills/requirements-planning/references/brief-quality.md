# Brief Quality Reference

## Table Of Contents

1. Ambiguity classification
2. Acceptance-criteria patterns
3. Task decomposition
4. Common failure modes
5. Completion example

## Ambiguity Classification

| Ambiguity | Default action | Example |
| --- | --- | --- |
| Product outcome | Ask user | Should deletion be soft or permanent? |
| Permission model | Ask user | Can office staff act for every professional? |
| Destructive data behavior | Ask user | Should existing records be rewritten? |
| Security or privacy behavior | Ask user | May a response expose cross-tenant existence? |
| Billing or legal effect | Ask user | When does a cancellation become chargeable? |
| Existing naming convention | Inspect and decide | Match nearby command/query naming. |
| Local file placement | Inspect and decide | Follow the owning module structure. |
| Test organization | Inspect and decide | Match nearby unit/integration/e2e patterns. |
| Missing external fact | Ask or block | Required third-party contract is unavailable. |

An assumption is acceptable only when it is low risk, reversible, supported by
repository evidence, and does not change user-visible or security behavior.

## Acceptance-Criteria Patterns

Use a compact Given/When/Then shape when it improves precision:

```text
Given <precondition and actor>
When <observable action>
Then <response or visible outcome>
And <persisted state, side effect, or forbidden behavior>
Verification: <test level or inspection method>
```

Cover relevant categories:

- Primary success behavior.
- Invalid input and domain-rule failure.
- Authentication, authorization, ownership, and tenant boundaries.
- Not-found versus forbidden disclosure behavior.
- Persistence, transactions, retries, and idempotency.
- Backward compatibility and migration behavior.
- Logging, events, notifications, or external side effects.
- Cleanup of stale behavior, docs, seeds, and fixtures.

## Task Decomposition

Each task should include:

```yaml
id: stable task identifier
purpose: why this task exists
acceptance_criteria: [AC identifiers]
touch_points: likely modules or boundaries, not invented files
dependencies: prerequisite tasks or decisions
definition_of_done: observable completion conditions
verification: focused checks and final gates
risk: failure mode and mitigation
owner: one role or writer
```

Prefer vertical tasks that produce verifiable behavior. Split by architecture
boundary only when sequencing or ownership requires it. Avoid tasks such as
"update backend" or "add tests" without behavior and completion detail.

## Common Failure Modes

- Restating the user's sentence without defining observable behavior.
- Hiding unresolved decisions inside assumptions.
- Writing criteria that only confirm files were created.
- Prescribing a new architecture before codebase analysis.
- Omitting permissions, negative paths, or data migration impact.
- Treating tests and documentation as detached cleanup tasks rather than part
  of the changed behavior.
- Expanding scope with "best practice" features the user did not request.

## Completion Example

```text
Status: READY
Scope: bounded and traceable
Acceptance criteria: independently verifiable
Blocking questions: none
Assumptions: listed with evidence and reversibility
Risks: owned or mitigated
Next role: code-architect
Recommended state: ARCHITECTURE
```
