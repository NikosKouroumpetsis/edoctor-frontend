# State Machine

## States

`INTAKE`, `PLANNING`, `ARCHITECTURE`, `ARCHITECTURE_REVIEW`,
`IMPLEMENTATION`, `DEBUGGING`, `QA`, `SECURITY_REVIEW`, `CODE_REVIEW`,
`DOCUMENTATION`, `FINALIZING`, `WAITING_FOR_USER`, `BLOCKED`, `COMPLETE`, and
`FAILED`, plus cleanup states `CANCELLING` and `CANCELLED`.

## Normal Flow

`INTAKE -> PLANNING -> ARCHITECTURE -> ARCHITECTURE_REVIEW -> IMPLEMENTATION`

Then:

`IMPLEMENTATION -> QA -> SECURITY_REVIEW when required -> CODE_REVIEW -> DOCUMENTATION when required -> FINALIZING -> COMPLETE`

## Allowed Loops

- `ARCHITECTURE_REVIEW -> ARCHITECTURE`
- `IMPLEMENTATION -> DEBUGGING -> IMPLEMENTATION`
- `QA -> IMPLEMENTATION` or `QA -> DEBUGGING`
- `SECURITY_REVIEW -> IMPLEMENTATION` or `SECURITY_REVIEW -> DEBUGGING`
- `CODE_REVIEW -> IMPLEMENTATION` or `CODE_REVIEW -> DEBUGGING`
- Any non-terminal state -> `WAITING_FOR_USER` when a user decision is required.
- `WAITING_FOR_USER` -> the recorded resume state after an answer.
- Any non-terminal state -> `BLOCKED` or `FAILED` with evidence.
- Any unfinished state -> `CANCELLING` only through `cleanup begin`.
- `CANCELLING -> CANCELLED` only through successful `cleanup finish`.

Do not transition directly to `COMPLETE` from an implementation or review
state. Finalization must reconcile artifacts and verification evidence first.

## Cleanup Flow

Cleanup is a lifecycle operation, not a quality gate:

1. `cleanup begin <pipeline>` validates pipeline ownership and records the
   cleanup request.
2. An unfinished run enters `CANCELLING`; a `COMPLETE` or `FAILED` run keeps its
   terminal state.
3. The orchestrator uses official Claude runtime controls to stop only
   resources owned by that run.
4. `cleanup partial <pipeline>` records remaining resources. The run remains
   `CANCELLING`, and the current pointer and archive are preserved.
5. `cleanup finish <pipeline>` marks an unfinished run `CANCELLED`, preserves a
   pre-existing `COMPLETE` or `FAILED` state, and clears the current pointer
   when it points to that run.
6. `--purge` may be passed only to successful `cleanup finish`; otherwise the
   archive is retained.

Never infer runtime cleanup from a state transition alone. Never manually
delete native Claude Agent Teams state.

## Iteration Limits

Use limits from `.claude/pipeline/config.json`. Increment a loop counter only
when a gate returns a new failure cycle. If a limit is reached:

1. Stop automated looping.
2. Record the unresolved evidence in `CHANGE_REQUESTS.md`.
3. Mark the run `BLOCKED` or `FAILED`.
4. Report the smallest useful human decision or intervention.

## State Integrity

- Preserve history; do not rewrite previous transitions.
- Keep `updatedAt`, `activeRole`, and current state accurate.
- Do not mark a gate passed without evidence in its artifact.
- Do not mark the run complete with open blocking change requests.
- `CANCELLING` requires cleanup status `IN_PROGRESS` or `PARTIAL`.
- `CANCELLED` requires cleanup status and result `CLEANED`.
