# Security Analysis Reference

## Table Of Contents

1. Threat model
2. Review lenses
3. Severity model
4. Evidence standard
5. Common false confidence

## Threat Model

For the changed behavior record:

```yaml
assets: data, money, privileges, availability, secrets, files
actors: anonymous, authenticated, privileged, service, operator, attacker
entrypoints: routes, jobs, events, callbacks, files, admin actions
trust_boundaries: client/server, module, tenant, service, network, filesystem
attacker_controlled_inputs: fields, identifiers, headers, files, URLs, events
security_properties: confidentiality, integrity, availability, accountability
abuse_cases: concrete actions an attacker may attempt
controls: exact code paths and persistence constraints
```

## Review Lenses

### Identity And Access

- Is identity established before trusted use?
- Are role, ownership, tenant, and object-scope checks all required and present?
- Can different error responses reveal another tenant's object existence?
- Can a privileged service act on user-controlled identifiers without scope?

### Input And Execution

- Is data validated and canonicalized before authorization and persistence?
- Can input reach queries, templates, commands, paths, redirects, URLs, or
  deserializers unsafely?
- Are file type, size, name, path, storage, and retrieval controls coherent?

### Data Lifecycle

- Are sensitive fields minimized in responses, logs, errors, analytics, and
  backups?
- Are secrets stored, rotated, compared, and transmitted appropriately?
- Do deletion, retention, export, and audit behavior match requirements?

### State And Abuse

- Are writes atomic where partial state creates risk?
- Are retries, duplicate requests, callbacks, and events idempotent?
- Can attackers enumerate, replay, race, exhaust, or amplify the operation?
- Are defaults fail-closed where the project contract requires it?

## Severity Model

Use project terminology when defined. Otherwise:

- `BLOCKER`: practical unauthorized access, code execution, secret disclosure,
  cross-tenant data exposure, destructive privilege escalation, or similarly
  severe impact requiring correction before release.
- `MAJOR`: exploitable weakness with meaningful confidentiality, integrity, or
  availability impact under plausible conditions.
- `MINOR`: limited-impact hardening gap or defense-in-depth issue with no
  demonstrated material exploit path.

Severity is not determined by category name alone.

## Evidence Standard

A finding should answer:

1. Which entrypoint and data flow are affected?
2. What attacker capability or precondition is required?
3. Which control is absent, misplaced, or bypassable?
4. What concrete impact follows?
5. Which code or test evidence supports the claim?
6. What is the smallest acceptable remediation and verification?

## Common False Confidence

- Middleware exists, but the affected route does not use it.
- Authorization checks role but not ownership or tenant.
- Validation occurs after an unsafe lookup or side effect.
- ORM usage is assumed to eliminate every injection or scoping risk.
- Sensitive fields are removed from one response but remain in logs or errors.
- A happy-path test is treated as authorization evidence.
- Dependency scanning is treated as a complete application security review.
