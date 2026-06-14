---
name: project-context
description: Discover and summarize the current repository's canonical instructions, architecture, commands, testing rules, ownership boundaries, and active pipeline run. Use at the start of planning, implementation, debugging, review, testing, security analysis, or documentation work so generic agents adapt to the project without hard-coded framework assumptions.
user-invocable: false
---

# Project Context

Build a compact context contract before role-specific work.

## Discovery

1. Read `.claude/pipeline/config.json` when it exists.
2. Read the configured project profile.
3. Read canonical instruction files in configured order.
4. Read the command manifest before proposing or running commands.
5. Read the active run's `state.json` and role-relevant artifacts.
6. Inspect nearby implementation and tests before inferring patterns.

Use repository evidence over generic conventions. If two canonical instruction
files conflict, stop and report the exact conflict.

## Context Contract

Return or record:

```yaml
project_type: unknown until verified
canonical_instructions: []
allowed_commands: []
architecture_boundaries: []
existing_patterns: []
test_strategy: []
security_constraints: []
file_ownership: []
active_run: null
open_questions: []
```

Keep this summary task-specific. Do not paste large instruction files into
handoffs when a path and focused summary are sufficient.

## Command Safety

- Run only commands allowed by repository policy.
- Prefer the smallest relevant verification command.
- Request required environment approval instead of bypassing sandbox, network,
  Docker, or localhost restrictions.
- Do not expose secrets from environment files or logs.
