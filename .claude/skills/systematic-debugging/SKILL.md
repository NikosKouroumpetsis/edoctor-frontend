---
name: systematic-debugging
description: Reproduce a software failure, gather evidence, test competing hypotheses, isolate the root cause, implement or recommend the smallest justified fix, and add regression protection. Use for bugs, failing tests, flaky behavior, error logs, unexpected runtime behavior, or unclear failures returned by QA or review.
---

# Systematic Debugging

Use `project-context` and read the latest failure evidence before changing code.

## Frame The Failure

Capture expected behavior, observed behavior, exact environment, frequency,
first known occurrence, impact, and the smallest reproducible input. Separate
the original symptom from secondary errors caused by retries or cleanup.

Read [investigation-playbook.md](references/investigation-playbook.md) for
flaky failures, stateful bugs, concurrency, external integrations, database
issues, or repeated unsuccessful fix attempts.

## Investigation

1. Reproduce with the smallest repository-approved command or test.
2. Reduce the failure while preserving the symptom.
3. Build a timeline through inputs, state changes, calls, persistence, and
   outputs.
4. List competing hypotheses and the evidence each predicts.
5. Design one discriminating experiment at a time.
6. Eliminate hypotheses explicitly and update confidence.
7. Identify the earliest incorrect state, not merely the final exception.
8. Confirm the root cause by explaining all material observations.

## Resolution

- Prefer the smallest fix that addresses the cause, not the symptom.
- Add regression coverage when practical.
- Check side effects, adjacent behavior, retries, cleanup, and error semantics.
- Remove temporary diagnostics or convert them into appropriate permanent
  observability.
- If reproduction is impossible, document the limitation and avoid speculative
  edits presented as a fix.

## Evidence Rules

- A correlation is not a root cause.
- A passing rerun is not proof for an intermittent failure.
- A stack trace identifies where failure surfaced, not necessarily where it
  originated.
- A fix is not validated until the original reproduction and relevant
  regression checks pass.
- Environment blockers must include the exact missing service, permission,
  data, configuration, or command failure.

## Escalation And Stop Conditions

Escalate to architecture when the cause is a boundary or contract flaw rather
than a local defect. Ask the user for missing external facts only after
repository evidence is exhausted. Stop automated attempts when the configured
debug loop limit is reached or when further experiments would be destructive.

Record reproduction, hypotheses, evidence, root cause, fix, and verification in
`PROGRESS.md`. Add unresolved failures to `CHANGE_REQUESTS.md` and return the
handoff contract with confidence, residual uncertainty, and the next gate.
