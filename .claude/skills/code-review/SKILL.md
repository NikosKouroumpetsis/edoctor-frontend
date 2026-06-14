---
name: code-review
description: Conduct a strict findings-first review of a completed software change for correctness, regressions, architecture drift, security issues, data integrity, maintainability, and missing tests. Use as the final code quality gate, for pull request review, or after implementation fixes need independent validation.
---

# Code Review

Use `project-context`, acceptance criteria, architecture, implementation plan,
diff, and verification reports first.

## Establish The Review Baseline

Read the full diff, changed-file surroundings, relevant callers and consumers,
open and resolved change requests, and actual verification evidence. Determine
what behavior is intended to change and what must remain stable. Do not review
only filenames or developer summaries.

Read [review-playbook.md](references/review-playbook.md) for shared code,
migrations, security-sensitive changes, concurrency, external integrations, or
when deciding finding severity and gate status.

## Review In Passes

1. **Intent pass:** trace acceptance criteria through changed behavior.
2. **Correctness pass:** inspect state, data flow, branching, errors, and side
   effects.
3. **Boundary pass:** inspect permissions, tenants, privacy, modules, layers,
   transactions, and external trust boundaries.
4. **Adversarial pass:** test invalid, stale, duplicate, concurrent, partial,
   and rollback scenarios mentally and with focused evidence when needed.
5. **Regression pass:** inspect callers, consumers, schemas, seeds, fixtures,
   configuration, and backward compatibility.
6. **Evidence pass:** assess whether tests prove the intended behavior at the
   appropriate layers.
7. **Maintainability pass:** inspect duplication, abstractions, naming,
   cleanup, operational impact, and documentation.

Inspect the actual diff and relevant surrounding code. Validate prior change
requests rather than assuming a new patch resolves them.

## Finding Threshold

Report a finding only when there is a concrete failure mode, contract breach,
security risk, regression, architecture violation, or material evidence gap.
Avoid preferences already enforced by tooling and speculative concerns without
a plausible scenario.

Classify severity by impact and release risk, not by how difficult the fix is.
Blocking findings must describe a scenario that should prevent handoff.

## Findings Format

Lead with findings ordered by severity:

```text
[BLOCKER|MAJOR|MINOR] path/to/file:line - concise title
Impact: concrete failure or risk
Evidence: code path, scenario, or command result
Required change: smallest acceptable correction
```

Avoid style-only findings already enforced by tooling unless they expose a
real defect. If no findings remain, say so and identify residual test or
environment risk.

## Gate Decision

- `PASS`: no blocking finding, acceptance criteria are represented, and required
  evidence is credible.
- `CHANGES_REQUESTED`: at least one concrete issue requires correction.
- `BLOCKED`: review cannot be completed because required code, contract, diff,
  or verification evidence is unavailable.

Do not approve a change with open blocking change requests, unexplained plan
deviations, or claims of tests that did not run.

Write the gate result to `REVIEW.md` and required fixes to
`CHANGE_REQUESTS.md`. Return the handoff contract with findings first, affected
acceptance criteria, residual risk, and exact gates to rerun.
