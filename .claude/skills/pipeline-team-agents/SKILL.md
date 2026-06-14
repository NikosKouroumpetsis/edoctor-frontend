---
name: pipeline-team-agents
description: Run an experimental Claude Code Agent Teams delivery pipeline with a main-session lead and persistent named teammates that communicate directly while sharing repo-visible artifacts and quality gates. Use only when the user explicitly asks for Agent Teams, persistent teammate communication, or `/pipeline-team-agents`.
argument-hint: "[feature request]"
disable-model-invocation: true
---

# Experimental Agent Teams Pipeline

Orchestrate this request:

`$ARGUMENTS`

Load `pipeline-core` and `project-context` before creating the team.

## Preconditions

1. Confirm the user explicitly requested Agent Teams.
2. Confirm Agent Teams are available in the current Claude runtime.
3. If unavailable, state the limitation and obtain agreement before falling
   back to `/pipeline-subagents`.
4. Initialize the repo-visible archive with `start team-agents`.

Never create or edit native team config under `~/.claude/teams` or native task
state under `~/.claude/tasks`. Claude Code owns that runtime state.

## Team Design

- The main session is the lead, project manager, user-facing controller, state
  owner, and final synthesizer.
- Start with 3-5 teammates. Add a role only when it has independent work or
  persistent peer communication worth the token and coordination cost.
- Spawn teammates using the project agent definitions by exact name.
- Give predictable teammate names and explicit file/module ownership.
- Teammates do not inherit the lead's conversation history. Include task scope,
  constraints, run ID, relevant artifact paths, and expected output in each
  spawn prompt.
- Prefix every teammate prompt with `[pipeline-run:<RUN_ID>]` and include the
  teammate role, owned shared-task item, owned files/modules, forbidden scope,
  upstream dependencies, and downstream handoff.
- Require teammate messages and final handoffs to repeat the `RUN_ID`, teammate
  name, task ownership, changed files, and any still-active runtime work.
- Team coordination tools remain runtime-managed. Do not model them as project
  files.

## Recommended Composition

For standard feature work:

- `project-manager` or lead-owned intake
- `code-architect`
- `senior-engineer`
- `qa-tester`
- `code-reviewer`

Add `debugger`, `security-reviewer`, or `documenter` when their gates trigger.
Shut down or release teammates that no longer have useful work.

## Coordination Rules

- Parallelize independent analysis, review lenses, and disjoint implementation
  slices.
- Keep sequential dependencies explicit in the shared task list.
- Never allow two teammates to edit the same file concurrently.
- Require architecture approval before broad implementation.
- Route findings through `CHANGE_REQUESTS.md` and the handoff contract.
- Reuse the existing teammate for feedback loops so its context persists.
- Treat artifacts as canonical if teammate memory and repository state diverge.

## Completion

Wait for required teammates and gates. Reconcile messages with artifacts,
validate the repo-visible run, write the final summary, and mark it complete.
Then load `pipeline-cleanup` and perform this no-purge shutdown sequence:

1. Run `cleanup begin team-agents` for the selected `RUN_ID`.
2. Stop new task claims and request graceful shutdown from every active
   teammate by predictable name.
3. Wait for teammate tool calls and final handoffs.
4. Have the team lead perform Claude Code's native team cleanup.
5. Verify the native team/shared task resources are gone from the lead's
   runtime perspective.
6. Run `cleanup finish team-agents` without `--purge`.

If any teammate or native resource remains, use `cleanup partial team-agents`
and preserve the pointer/archive for retry. For cancellation or orphaned team
state, use `/clean-team`; never manually edit `~/.claude/teams` or
`~/.claude/tasks`.
