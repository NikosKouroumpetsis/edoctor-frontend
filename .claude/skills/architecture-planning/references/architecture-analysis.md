# Architecture Analysis Reference

## Table Of Contents

1. Evidence map
2. Analysis lenses
3. Decision record
4. Implementation slicing
5. Review failure modes

## Evidence Map

Gather the smallest evidence set that can establish the current system:

- Entrypoints and request/event consumers.
- Controllers, handlers, commands, queries, or application services.
- Domain models, policies, validation, and invariants.
- Repository contracts and persistence implementations.
- Schema, migrations, indexes, and transaction boundaries.
- Shared utilities and their current consumers.
- Unit, integration, e2e, contract, or migration tests.
- Configuration, environment, jobs, queues, caches, and external gateways.
- Existing architecture decisions and recently completed analogous changes.

Record whether each design claim is a fact, inference, assumption, or open
question.

## Analysis Lenses

### Boundaries

- Which module owns the behavior and data?
- Does dependency direction match repository rules?
- Is cross-module orchestration explicit?
- Does a proposed shared abstraction have more than one real consumer?

### Data And Consistency

- What invariants must hold before persistence?
- Which operations must be atomic?
- What happens under retries, duplicate requests, or concurrent updates?
- Are indexes, uniqueness, nullability, and historical data addressed?
- Can rollout support old and new application versions when required?

### API And Compatibility

- Are request and response contracts changing?
- Are errors and status semantics stable?
- Is behavior backward compatible for existing clients, jobs, and seeds?
- Are removals and renamed concepts cleaned up everywhere?

### Security And Operations

- Where are authentication, authorization, ownership, and tenant checks made?
- What input crosses a trust boundary?
- What is logged, retried, cached, or sent externally?
- How is failure observed and recovered?
- What is the rollback path for code and data?

## Decision Record

Use this shape for material choices:

```yaml
decision: concise title
context: constraint or problem requiring a choice
evidence: repository paths, behavior, or requirements
options_considered: viable alternatives
chosen_option: selected design
why: concrete tradeoff, not generic best practice
consequences: new constraints, risks, and maintenance cost
reversibility: easy, moderate, or hard
approval_required: yes or no, with owner
verification: evidence that will validate the decision
```

## Implementation Slicing

Sequence work so each task has one writer and a verifiable outcome:

1. Contract or domain foundation.
2. Persistence or integration support.
3. Application orchestration.
4. Presentation or consumer wiring.
5. Tests, migration verification, cleanup, and docs.

Change the sequence when repository architecture requires it. Identify files
likely to conflict and assign them to one owner.

## Review Failure Modes

- Designing a greenfield architecture instead of extending the repository.
- Listing fashionable patterns without a concrete problem they solve.
- Ignoring failure, rollback, compatibility, or historical data.
- Treating schema changes as implementation details.
- Moving module-specific behavior into shared code prematurely.
- Adding direct cross-module persistence relations without approval.
- Approving a plan with tasks too vague to verify independently.
