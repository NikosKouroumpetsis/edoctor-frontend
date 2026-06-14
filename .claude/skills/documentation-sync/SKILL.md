---
name: documentation-sync
description: Align canonical project documentation with completed code, API, configuration, migration, operational, and testing changes while removing stale or duplicate guidance. Use after behavior changes, before final handoff, or whenever the documentation gate is triggered.
---

# Documentation Sync

Use `project-context`, the final brief, architecture, implementation report,
QA, security, and review artifacts first.

## Determine Documentation Impact

Identify changed audiences and durable contracts before editing. Audiences may
include API consumers, operators, developers, support, migration owners, and
end users. A code change does not always require new documentation, but changed
behavior, configuration, operations, public contracts, or test workflows
usually require an update.

Read [documentation-impact.md](references/documentation-impact.md) when the
change affects multiple audiences, public APIs, migrations, configuration,
operations, deprecations, or several existing documents.

## Find The Source Of Truth

1. Search for existing documentation, examples, commands, routes, config names,
   and old terminology affected by the change.
2. Identify the canonical source for each audience.
3. Distinguish generated documentation from manually maintained sources.
4. Prefer updating or redirecting an existing source over creating an
   overlapping document.

## Update Canonical Sources

1. Describe shipped behavior and relevant non-goals accurately.
2. Update API behavior, errors, configuration, migrations, commands, examples,
   and test workflows that changed.
3. Document rollout, rollback, compatibility, deprecation, and required
   operator actions where relevant.
4. Remove, correct, or redirect stale references and duplicate sources of truth.
5. Keep examples minimal, safe, and executable under current repository rules.
6. Use terminology and structure consistent with nearby canonical docs.
7. Record limitations and verification gaps without disguising them as success.

## Verify The Documentation

- Compare examples and commands to the actual code and canonical command source.
- Verify paths, names, environment variables, statuses, request/response
  examples, and migration order.
- Search again for stale terminology and superseded behavior.
- Run only repository-approved checks when examples can be validated
  deterministically.

Do not document planned behavior as shipped. Do not hide failed or unrun
verification behind polished prose. Do not copy internal security-sensitive
details into public documentation.

## Gate Rules

Return `COMPLETE` when all affected canonical sources are aligned. Return
`NOT_REQUIRED` with a concrete rationale when there is no durable documentation
impact. Return `BLOCKED` when shipped behavior or the canonical owner cannot be
determined without unresolved product or implementation decisions.

Write changed docs, audience, rationale, stale material removed, verification,
and limitations to `DOCUMENTATION.md`. Return the pipeline handoff contract
with final status and any issue that must route back to implementation.
