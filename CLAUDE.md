# CLAUDE.md

Project-specific instructions for Claude Code in this repository.

This file is the primary Claude Code workflow and command instruction source
for the eDoctor web `frontend`. `AGENTS.md` belongs to Codex and is not loaded
by Claude workflows.

## Project Context

Project technology, repository shape, architecture, naming, state, styling,
i18n, testing, environment, and documentation rules are owned by the mandatory
project architecture contract below. Do not maintain a duplicate summary here.

In one line: this is a SvelteKit (Svelte 5 runes) web app using Tailwind v4,
in-house shadcn-styled (`new-york`) components on our own headless primitives
layer (no external UI library; Bits UI is being phased out), Paraglide i18n,
TanStack Svelte Query, Vitest + Svelte Testing Library, and Bun, organized with
an atomic design / per-feature-module architecture and a `src/shared` layer for
generic building blocks.

## Mandatory Project Architecture

Before planning, implementing, debugging, testing, securing, reviewing, or
documenting a code change, read:

```text
.claude/project/project-architecture.md
```

That file is the canonical project architecture contract. It owns route/screen
mirroring, atomic-design UI boundaries, feature modules, shared-code placement,
state and preference rules, styling/i18n rules, testing expectations,
environments and variants, documentation, and final quality requirements.

Do not duplicate those rules in agents or skills. Agents and skills must load
the project contract and adapt their generic workflow to it. Supporting files
under `documentation/` provide deeper examples but cannot override the canonical
contract.

## Claude Workflow

Use project agents and skills when the task matches them:

- `project-engineer`: standalone, interactive, single-agent delivery from
  requirements through implementation, tests, security, review, and handoff
- `project-manager`: scope, acceptance criteria, task sequencing, risks
- `senior-engineer`: TypeScript/Svelte contracts, architecture decisions, refactor boundaries
- `code-architect`: implementation owner for app code/components/tests/docs
- `debugger`: reproduce, trace, root cause, minimal validated fix
- `qa-tester`: test strategy and verification (svelte-check, Vitest, Playwright)
- `security-reviewer`: client/SSR security and data-handling review
- `code-reviewer`: strict quality gate
- `documenter`: docs alignment after behavior/config/test/UI changes

Use the skills under `.claude/skills/*/SKILL.md` as reusable playbooks.

### Standalone Project Engineer

Use `/free-lancer <task>` for a standalone single-agent workflow in the current
conversation, or start a dedicated session with:

```bash
claude --agent project-engineer "<task>"
```

The standalone workflow:

- communicates directly with the user,
- investigates the repository before asking discoverable questions,
- asks as many material requirement questions as needed,
- presents a decision-complete plan,
- waits for explicit user approval before editing,
- performs implementation, testing, debugging, security review, code review,
  reusable-code review, documentation, and cleanup itself,
- does not invoke other agents or teams,
- does not create or update `.claude/tasks` state,
- and does not interact with either pipeline workflow.

## Claude Pipeline Modes

This repository has two separate user-invoked Claude pipeline workflows.

### Stable Subagents Pipeline

Use `/pipeline-subagents` when the user asks for the normal Claude pipeline.

This is the reliable default. The main Claude session is the orchestrator.
Custom subagents work in focused context windows and return results to the
orchestrator. Durable coordination happens through
`.claude/tasks/runs/<RUN_ID>/` artifacts.

Flow:

`project-manager -> code-architect blueprint -> senior-engineer review -> code-architect implementation -> debugger if needed -> qa-tester -> security-reviewer when relevant -> code-reviewer -> documenter -> final summary`

Rules:

- Create or resume the run archive with `bun run claude:pipeline -- start subagents --slug <slug> --title "<title>"`.
- Do not skip the project-manager brief, code-architect blueprint, QA report, or final code-review gate for implementation work.
- If QA, security, or review requests changes, record them in `CHANGE_REQUESTS.md` and loop back to `code-architect` or `debugger`.
- Use `.claude/tasks` only as the repo-visible archive.
- Every delegation must include `[pipeline-run:<RUN_ID>]`, role/task ownership,
  owned files/modules, and its handoff contract.
- On normal completion, clean remaining run-owned workers through
  `pipeline-cleanup` without purging the archive.

### Experimental Agent Teams Pipeline

Use `/pipeline-team-agents` only when the user explicitly asks for Agent Teams.

Agent Teams are experimental, disabled by default, and must be enabled by the
user through the Claude runtime environment or settings. This repository must
not create native Claude team state manually.

Rules:

- Create or resume the run archive with `bun run claude:pipeline -- start team-agents --slug <slug> --title "<title>"`.
- The main Claude session is the team lead.
- Teammates use the local `.claude/agents/*.md` definitions and their configured models/tools.
- Use 3-5 active teammates by default.
- Avoid parallel edits to the same file/module; one writer owns a file/module at a time.
- Use Agent Teams only when direct teammate communication and shared task coordination are worth the overhead.
- If Agent Teams are unavailable, fall back to `/pipeline-subagents` only after making that limitation explicit.
- Never write native Claude Agent Teams files under `~/.claude/teams` or `~/.claude/tasks` from this repository.
- Every teammate spawn must include `[pipeline-run:<RUN_ID>]`, predictable
  teammate name, task ownership, file/module ownership, and handoff contract.
- On normal completion, the lead gracefully shuts down teammates, performs
  native Claude Team cleanup, and closes the repo lifecycle without purge.

### Pipeline Cleanup

Use these user-invoked commands for cancellation, stuck workers, or orphaned
runtime state:

```text
/clean-subagents [--run <RUN_ID>] [--purge]
/clean-team [--run <RUN_ID>] [--purge]
```

Without `--run`, cleanup targets the run in `.claude/tasks/CURRENT.md`. Cleanup
must match the run's pipeline type and may stop only resources owned by that
`RUN_ID`.

Lifecycle rules:

- `cleanup begin` records the request and moves unfinished work to `CANCELLING`.
- Successful cleanup moves unfinished work to `CANCELLED`; existing `COMPLETE` or `FAILED` states are preserved.
- Partial cleanup stays `CANCELLING` and preserves both pointer and archive for retry.
- Default cleanup keeps `.claude/tasks/runs/<RUN_ID>/` for audit/debugging.
- `--purge` removes that selected archive only after successful runtime cleanup.
- Never manually delete native `~/.claude/teams` or `~/.claude/tasks` state.

For a quick local pipeline overview, run:

```bash
bun run claude:pipeline -- list
```

### Agent Models

Each `.claude/agents/*.md` file owns its `model` and `effort` values directly in
YAML frontmatter. There is no central model profile or synchronization step.
Edit the relevant agent file when changing its compute level, then restart
Claude Code so the updated definition is loaded.

The pipeline helper manages only repo-visible archive files under
`.claude/tasks`; it must not execute production commands or write native Claude
state.

## Non-Negotiable Command Rules

- Only run commands that exist in `package.json` scripts.
- Do not invent commands.
- Use `bun` only for every project command; do not use `npm`, `pnpm`, or `yarn`.
- Do not add dependencies without explicit user approval. Prefer Icones/Iconify
  virtual imports over adding icon packages, and shadcn-svelte primitives over
  new UI kits.
- Before saying a code or type issue is fixed, run `bun run check` and make sure
  it passes. This is the current hard gate.
- For implementation work, also run `bun run lint`. Run `bun run build` when
  routing, SvelteKit config, env behavior, providers, or public UI flows
  changed.
- Generated Paraglide output under `src/generated/paraglide` is produced by
  `bun run paraglide:compile`; do not hand-edit it.
- Request environment approval when localhost services, network access, or
  protected filesystem access requires it.

Always inspect `package.json` before relying on a command.

## Instruction Ownership

- `CLAUDE.md` owns Claude workflow, invocation, command, and permission rules.
- `.claude/project/project-architecture.md` owns project-specific architecture
  and delivery quality rules.
- `AGENTS.md` belongs to Codex and is not part of Claude instruction precedence.
- Standalone agent/skill definitions remain generic and must not duplicate the
  project architecture contract.
- Pipeline definitions remain separate from the standalone `project-engineer`
  and `free-lancer` workflow.
