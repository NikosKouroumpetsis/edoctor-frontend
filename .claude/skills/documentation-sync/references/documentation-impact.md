# Documentation Impact Reference

## Table Of Contents

1. Impact matrix
2. Source-of-truth rules
3. Content requirements
4. Verification checklist
5. Documentation anti-patterns

## Impact Matrix

| Change | Likely documentation |
| --- | --- |
| Public API or error contract | API reference, examples, client guidance |
| Configuration or environment variable | Setup, operations, deployment docs |
| Schema or migration | Migration guide, rollout, rollback, compatibility |
| Permission or security behavior | Admin/operator guidance, safe public notes |
| Background job or external integration | Operations, failure handling, monitoring |
| Test command or fixture workflow | Testing guide and contributor instructions |
| Architecture boundary or canonical pattern | Architecture decision or project guide |
| Internal refactor with identical behavior | Usually `NOT_REQUIRED` |
| Deprecated or removed behavior | Upgrade path, timeline, stale-doc cleanup |

The matrix suggests likely impact; inspect the repository for its actual
canonical sources.

## Source-Of-Truth Rules

- Update the document already referenced by project instructions or nearby code.
- Do not create a second command list when a manifest, task file, or build
  configuration is already canonical.
- Do not hand-edit generated API/schema documentation.
- Keep architecture decisions separate from user setup instructions.
- Redirect or remove stale pages when readers could still discover them.
- Keep run reports as evidence, not as the only durable product documentation.

## Content Requirements

### API Or Behavior

- Actors and permissions.
- Preconditions and primary behavior.
- Request, response, error, and side-effect semantics.
- Compatibility and deprecated behavior.

### Configuration And Operations

- Variable or setting name without secret values.
- Required versus optional behavior and defaults.
- Startup, dependency, health, monitoring, retry, and failure expectations.
- Rollout and rollback steps using repository-approved commands.

### Migration

- Preconditions and data assumptions.
- Order of application.
- Compatibility window.
- Failure recovery and rollback limitations.
- Verification after deployment.

## Verification Checklist

- Every documented command exists in the project command source of truth.
- Paths and filenames exist or are clearly generated at runtime.
- Examples match actual validation, response, and error semantics.
- No secrets, tokens, personal data, or internal exploit details are exposed.
- Old terminology and contradictory examples were searched and handled.
- The documentation status matches actual QA and review evidence.

## Documentation Anti-Patterns

- Creating a README for every change.
- Repeating the same setup instructions in several files.
- Documenting the plan instead of the shipped behavior.
- Hiding unsupported scenarios or failed verification.
- Leaving old examples because the new page is correct.
- Publishing internal implementation details that users do not need.
