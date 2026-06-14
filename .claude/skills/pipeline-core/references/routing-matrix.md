# Routing Matrix

| Need | Primary role | Required artifact |
| --- | --- | --- |
| Scope, acceptance criteria, sequencing | `project-manager` | `BRIEF.md` |
| Repository analysis and implementation blueprint | `code-architect` | `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md` |
| Architecture challenge and boundary validation | `senior-engineer` | `ARCHITECTURE.md`, `CHANGE_REQUESTS.md` |
| Code, tests, migrations, seeds, implementation docs | `code-architect` | `PROGRESS.md` |
| Reproduction and root cause | `debugger` | `PROGRESS.md`, `CHANGE_REQUESTS.md` |
| Independent functional verification | `qa-tester` | `QA.md` |
| Security-sensitive review | `security-reviewer` | `SECURITY.md` |
| Final correctness and maintainability gate | `code-reviewer` | `REVIEW.md` |
| Canonical docs and migration notes | `documenter` | `DOCUMENTATION.md` |

## Security Gate Triggers

Use the security reviewer for authentication, authorization, permissions,
tenant isolation, secrets, cryptography, file handling, untrusted input,
network boundaries, payments, privacy-sensitive data, destructive operations,
or dependency/configuration changes with security impact.

## Documentation Gate Triggers

Use the documenter when behavior, API contracts, configuration, migrations,
operations, test workflows, or public developer guidance changed. Record
`NOT_REQUIRED` only when the change has no durable documentation impact.
