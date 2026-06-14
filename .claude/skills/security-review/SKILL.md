---
name: security-review
description: Perform a risk-based security review of code and configuration changes, focusing on trust boundaries, authentication, authorization, tenant isolation, input handling, secrets, privacy, destructive actions, and abuse cases. Use for security-sensitive changes or whenever the pipeline security gate is triggered.
---

# Security Review

Use `project-context`, the approved requirements, architecture, diff, and test
evidence first.

## Decide The Security Scope

Identify changed assets, actors, trust boundaries, privileged actions, external
systems, and attacker-controlled inputs. Record why the gate is required and
which paths are security-relevant. A small diff can still have broad security
impact when it changes a shared middleware, query scope, or serializer.

Read [security-analysis.md](references/security-analysis.md) for authentication,
authorization, tenant isolation, privacy-sensitive data, payments, file or
network access, destructive actions, cryptography, or external callbacks.

## Review By Threat, Not Checklist Alone

1. Identify assets, actors, trust boundaries, and untrusted inputs.
2. Enumerate plausible abuse cases introduced or affected by the change.
3. Trace authentication, authorization, ownership, and tenant checks through the
   actual execution path and persistence filters.
4. Inspect validation, canonicalization, parsing, serialization, file/network
   access, redirects, callbacks, and command execution boundaries.
5. Check secrets, tokens, logs, errors, exports, backups, and privacy-sensitive
   data throughout their lifecycle.
6. Consider replay, race, enumeration, injection, escalation, denial of service,
   confused-deputy behavior, insecure defaults, and partial failure where relevant.
7. Verify controls with code evidence and negative tests; do not rely on names
   such as `secure`, `authorized`, or `validated`.

## Severity

Base severity on exploitability, required privileges, affected assets, impact,
scope, detectability, and available mitigations. Separate confirmed
vulnerabilities from defense-in-depth recommendations and uncertain concerns.

Every blocking finding must include the vulnerable path, attacker conditions,
impact, evidence, and smallest acceptable remediation. Avoid generic OWASP
labels without repository-specific analysis.

Do not invent vulnerabilities without a plausible path and evidence. Do not
reduce a security review to dependency versions unless dependencies changed.

## Gate Rules

Return `PASS` only when no blocking security finding remains and relevant
negative paths have evidence. Return `NOT_REQUIRED` only with a specific scope
rationale. Return `BLOCKED` when a required external contract, configuration,
or runtime behavior cannot be inspected.

Write findings to `SECURITY.md`, ordered by severity with evidence, impact,
exploit conditions, and required remediation. Add blocking items to
`CHANGE_REQUESTS.md` and return the handoff contract with residual risk and
required gate reruns.
