---
name: pipeline-core
description: Shared orchestration rules, artifact contracts, state transitions, decision policy, and quality gates for controlled software delivery pipelines. Use whenever either Claude pipeline entrypoint is active or when a pipeline role needs to interpret run state and handoff requirements.
user-invocable: false
---

# Pipeline Core

Use artifacts as durable truth and agent context as working memory.

## Start With Project Context

1. Read `.claude/pipeline/config.json`.
2. Read the configured project profile.
3. Read every configured instruction source that exists.
4. Read the configured command source or command manifest.
5. Stop on conflicting canonical instructions. Do not guess which rule wins.

Do not embed project architecture, framework, command, or domain assumptions in
the reusable pipeline. Resolve them from the project adapter and repository.

## Select The Smallest Execution Level

- `simple`: one implementation owner; review and focused verification when
  risk warrants them.
- `standard`: planning, architecture, implementation, QA, and code review.
- `full`: standard flow plus explicit debugging, security, and documentation
  gates as applicable.

Increase the level for security-sensitive behavior, data migrations,
permissions, money, shared infrastructure, or broad cross-module changes.

## Apply The Decision Mode

- `ask_user`: ask before resolving material ambiguity.
- `auto_decide`: decide reversible implementation details from repository
  evidence and record each assumption.
- `hybrid`: ask about product, security, destructive, permission, billing, and
  irreversible choices; decide low-risk implementation details.

Never auto-decide a choice that requires explicit approval under repository or
environment instructions.

## Maintain The Run Archive

Initialize or resume the repo-visible run through the configured package
script. Never create native Claude runtime state under `~/.claude/teams` or
`~/.claude/tasks`.

Keep these artifacts current:

- `REQUEST.md`
- `BRIEF.md`
- `ARCHITECTURE.md`
- `IMPLEMENTATION_PLAN.md`
- `PROGRESS.md`
- `QA.md`
- `SECURITY.md`
- `REVIEW.md`
- `DOCUMENTATION.md`
- `CHANGE_REQUESTS.md`
- `FINAL_SUMMARY.md`
- `CLEANUP.md`
- `state.json`

Write decisions and evidence to the owning artifact before a handoff. Do not
use chat messages as the only record of a decision, failure, or approval.

## Enforce Role Boundaries

- The orchestrator owns user communication, routing, state, and synthesis.
- The project manager owns scope and acceptance criteria, not code.
- The senior engineer owns architecture challenge and boundary review, not the
  main implementation.
- The code architect owns implementation and implementation tests.
- The debugger owns reproduction and root-cause investigation when failures
  are unclear.
- The QA tester owns independent verification and test evidence.
- The security reviewer owns risk-based security findings.
- The code reviewer owns the final findings-first quality gate.
- The documenter owns canonical documentation alignment after code gates pass.

One writer owns a file or module at a time. Reassign ownership explicitly
before another role edits the same area.

## Route Failures

- Unclear requirements -> orchestrator or user.
- Architecture ambiguity -> senior engineer or project manager, depending on
  whether the ambiguity is technical or product-facing.
- Implementation defect -> code architect.
- Unknown root cause or unstable failure -> debugger.
- QA failure -> code architect or debugger, then QA again.
- Security finding -> code architect, then security review and QA as needed.
- Code review finding -> code architect, then affected gates again.
- Documentation issue -> documenter unless it exposes a product or code gap.

Record every required correction in `CHANGE_REQUESTS.md` with owner, evidence,
resolution, and verification.

## Close Runtime Resources Explicitly

Load `pipeline-cleanup` whenever a run completes, is cancelled, or has stuck
runtime resources. Runtime cleanup and the durable archive are separate:

- Claude runtime controls stop subagents, teammates, tasks, sessions, and
  pipeline-owned worktrees.
- The launcher records lifecycle state in `state.json` and `CLEANUP.md`.
- Default cleanup preserves `.claude/tasks/runs/<RUN_ID>/`.
- Archive removal requires an explicit user `--purge` and is allowed only
  after successful runtime cleanup.

Do not use the generic `transition` command for `CANCELLING` or `CANCELLED`.
Use `cleanup begin`, then `cleanup finish` or `cleanup partial`. Partial cleanup
must preserve the current pointer and archive so the same run can be retried.

Every delegation or teammate spawn must include the `RUN_ID`, role, task,
owned files/modules, and expected handoff. Cleanup may affect only resources
whose ownership can be traced to that run.

## Completion Rule

Complete only when:

1. Acceptance criteria are resolved.
2. Required implementation work is complete.
3. Required commands have passed, or limitations are explicitly documented.
4. Security review has passed or is recorded as not required with rationale.
5. Code review has passed.
6. Documentation is complete or recorded as not required with rationale.
7. `state.json` and `FINAL_SUMMARY.md` match the actual repository state.

After marking delivery `COMPLETE`, close pipeline-owned runtime resources with
`pipeline-cleanup` and keep the archive. Cleanup is post-completion lifecycle
work and must not turn a successfully completed run into `CANCELLED`.

Read these references when needed:

- [State machine](references/state-machine.md) for allowed transitions and loop
  limits.
- [Handoff contract](references/handoff-contract.md) before sending work to
  another role.
- [Routing matrix](references/routing-matrix.md) when selecting agents and
  gates.
