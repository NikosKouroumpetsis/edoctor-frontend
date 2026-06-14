# Handoff Contract

Use this structure in teammate messages, subagent returns, and artifact
summaries:

```json
{
  "status": "READY | PASS | CHANGES_REQUESTED | NEEDS_USER_INPUT | BLOCKED",
  "summary": "What was established or changed",
  "evidence": ["Files, commands, tests, logs, or repository observations"],
  "artifacts_updated": ["Relative artifact paths"],
  "changed_files": ["Relative repository paths"],
  "assumptions": ["Explicitly recorded assumptions"],
  "blocking_issues": ["Issues that prevent the next gate"],
  "non_blocking_issues": ["Deferred or advisory issues"],
  "questions": ["Questions for the user or another role"],
  "next_role": "Role name or none",
  "recommended_state": "Next state"
}
```

Rules:

- Keep the summary concise; put detail in artifacts.
- Cite exact files and commands instead of claiming generic completion.
- Distinguish `not run`, `not required`, `blocked`, and `failed`.
- Never claim a test, review, or command passed unless it actually ran and the
  evidence is available.
- A handoff is not permission to ignore repository instructions or modify files
  outside assigned ownership.
