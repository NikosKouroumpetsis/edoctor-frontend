---
name: architecture-planning
description: Analyze an existing codebase and produce or review an implementation architecture that fits repository boundaries, existing patterns, data ownership, security constraints, and verification requirements. Use before broad implementation, for cross-module changes, refactors, migrations, or architecture review.
---

# Architecture Planning

Use `project-context` and the approved brief first.

## Required Inputs

Read the approved brief, active state, open change requests, repository
instructions, architecture docs, relevant source paths, tests, schema, and
recent adjacent implementations. Do not design from directory names alone.

## Analyze Before Designing

1. Trace the current entrypoint-to-output flow and important failure paths.
2. Map module, layer, data, transaction, and external-system ownership.
3. Identify canonical examples, shared extension points, and prohibited
   dependencies.
4. Inspect API, schema, migration, permissions, configuration, operational, and
   test impact.
5. Establish invariants, compatibility requirements, and trust boundaries.
6. Separate verified facts, reasoned inferences, assumptions, and unresolved
   product decisions.

Read [architecture-analysis.md](references/architecture-analysis.md) for
cross-module work, migrations, shared infrastructure, security-sensitive
design, or architecture review.

## Produce The Design

- Prefer the smallest change consistent with existing architecture.
- Define changed responsibilities, interfaces, data flow, dependencies, and
  ownership before naming exact files.
- Describe normal flow, failure flow, transaction boundaries, and side effects.
- Explain important tradeoffs and at least one viable rejected alternative for
  material decisions.
- Identify reversible versus irreversible decisions.
- Describe compatibility, rollout, rollback, and data migration behavior.
- Assign disjoint implementation tasks with dependency order and verification.
- Include rollback or recovery for risky changes.

Do not add an abstraction merely to make the diagram symmetrical. Do not add a
cross-module relation, shared utility, event, cache, queue, or new dependency
without evidence that the simpler repository pattern is insufficient.

## Review The Design

Review in separate passes:

1. Requirement traceability and missing behavior.
2. Ownership, dependency direction, coupling, and cohesion.
3. Data invariants, transaction behavior, concurrency, and migration safety.
4. Authentication, authorization, tenant, privacy, and external trust boundaries.
5. Failure handling, observability, rollback, and operational behavior.
6. Testability, implementation sequencing, and file ownership.

Do not approve architecture merely because it is internally consistent. Verify
important claims against code and reject designs that violate canonical
project rules or solve a broader problem than the accepted scope.

## Decision Record

For each material decision capture context, chosen option, alternatives,
consequences, evidence, reversibility, and required approval. Put unresolved
product decisions back to the lead instead of encoding them as architecture.

## Stop Conditions

Return `NEEDS_USER_INPUT` for unresolved product, permission, destructive, or
security choices. Return `CHANGES_REQUESTED` when the design is implementable
only by violating project boundaries. Return `BLOCKED` when required system or
contract evidence is unavailable.

Write architecture to `ARCHITECTURE.md`, executable tasks to
`IMPLEMENTATION_PLAN.md`, and required corrections to `CHANGE_REQUESTS.md`.
Return the handoff contract with explicit risks, approvals, file ownership, and
the recommended next state.
