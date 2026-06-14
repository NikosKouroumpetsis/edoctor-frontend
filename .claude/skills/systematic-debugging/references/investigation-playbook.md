# Investigation Playbook

## Table Of Contents

1. Hypothesis log
2. Failure classes
3. Discriminating experiments
4. Flaky and stateful failures
5. Debugging anti-patterns

## Hypothesis Log

Use a live table:

| Hypothesis | Supporting evidence | Contradicting evidence | Experiment | Result | Confidence |
| --- | --- | --- | --- | --- | --- |

Start with at least two plausible explanations when evidence is ambiguous. A
hypothesis should predict an observable result that distinguishes it from the
others.

## Failure Classes

Check relevant classes without treating this as a blind checklist:

- Incorrect input normalization or validation.
- Wrong branch, state transition, or stale state.
- Contract mismatch between layers or services.
- Persistence mapping, transaction, uniqueness, or query-scope error.
- Authorization, ownership, or tenant-filter omission.
- Ordering, race, timeout, retry, or idempotency issue.
- Cache, clock, locale, timezone, randomness, or environment dependency.
- Resource leak, cleanup omission, or partial failure.
- Test isolation, fixture, mock, or assertion defect.
- Configuration, generated artifact, migration, or version mismatch.

## Discriminating Experiments

Prefer experiments that change one variable:

- Add a focused assertion at the earliest suspected incorrect state.
- Replace an external dependency with a known deterministic response.
- Run the same input against known-good and failing paths.
- Remove concurrency or caching temporarily to test timing/state hypotheses.
- Query persisted state before and after the suspected boundary.
- Reproduce with a minimal fixture rather than full production-like data.

Do not leave diagnostics that expose secrets, personal data, or large payloads.

## Flaky And Stateful Failures

- Record frequency and conditions, not only pass/fail.
- Control time, randomness, ordering, and shared state where possible.
- Run enough repetitions to distinguish a fix from chance, using only allowed
  repository commands.
- Check cleanup between tests and process lifecycle boundaries.
- Treat sleep increases and retries as diagnostics, not final fixes, unless the
  contract explicitly requires them.

## Debugging Anti-Patterns

- Editing before reproducing.
- Changing several suspected causes in one patch.
- Catching or suppressing the error without restoring correctness.
- Weakening a test to match broken behavior.
- Blaming the environment without exact evidence.
- Declaring root cause from the last stack-frame location.
- Refactoring broadly during an active incident without proof it is required.
