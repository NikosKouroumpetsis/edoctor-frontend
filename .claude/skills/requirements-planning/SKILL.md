---
name: requirements-planning
description: Convert a software request into a precise brief with scope, acceptance criteria, constraints, assumptions, risks, open questions, and sequenced tasks. Use for project intake, feature planning, change requests, or whenever implementation should not begin until requirements are testable.
---

# Requirements Planning

Use `project-context` first.

## Required Inputs

Read the user request, active run state, existing brief, open change requests,
project instructions, and any linked issue or design artifact. Treat missing
repository evidence as unknown, not as permission to invent behavior.

## Build The Brief In Passes

1. **Outcome pass:** state the problem, intended user-visible result, affected
   actors, and why the change is needed.
2. **Boundary pass:** separate in-scope behavior, non-goals, compatibility
   expectations, and affected systems.
3. **Behavior pass:** derive happy paths, negative paths, permissions, state
   transitions, error behavior, and data lifecycle expectations.
4. **Constraint pass:** capture repository, architecture, migration, security,
   privacy, operational, rollout, and dependency constraints.
5. **Acceptance pass:** write observable criteria with clear preconditions,
   action, outcome, and verification method.
6. **Uncertainty pass:** classify unknowns as blocking questions, bounded
   assumptions, or low-risk implementation details.
7. **Delivery pass:** decompose the work into ordered tasks with ownership,
   dependencies, definition of done, verification, and risk.

Read [brief-quality.md](references/brief-quality.md) when writing a new brief,
handling scope changes, or deciding whether an ambiguity is blocking.

## Decision Policy

Ask the user when an answer can change product behavior, permissions, data
retention, billing, destructive actions, security posture, compatibility, or
an irreversible migration. Auto-decide only when existing repository evidence
establishes a reversible implementation convention. Record the evidence and
the assumption.

Do not ask questions that can be answered by reading the repository. Do not
convert a technical preference into a product requirement.

## Acceptance-Criteria Rules

- Make each criterion independently verifiable.
- Include failure and permission behavior when relevant.
- Avoid implementation details unless the implementation itself is required.
- Define observable outputs, persisted state, emitted events, or API behavior.
- Include compatibility and cleanup criteria when old behavior changes.
- Do not use vague terms such as "works", "properly", "fast", or "secure"
  without a measurable or inspectable condition.

## Stop Conditions

Return `NEEDS_USER_INPUT` when material ambiguity blocks a reliable plan.
Return `BLOCKED` when canonical instructions conflict or required source
artifacts are unavailable. Do not mark the brief ready while acceptance
criteria contradict each other or depend on unresolved business decisions.

## Quality Check

- Every acceptance criterion can be verified.
- Scope does not hide architecture or migration work.
- Primary actors, permissions, and failure behavior are defined where relevant.
- Risks have owners or mitigation steps.
- Unknowns are labeled, not silently resolved.
- The brief does not prescribe implementation without repository evidence.
- Tasks trace back to one or more acceptance criteria.

Write the result to `BRIEF.md`. Preserve prior decisions, mark superseded scope
explicitly, update scope-related entries in `CHANGE_REQUESTS.md`, and return the
pipeline handoff contract with the recommended next state.
