# Frontend Documentation

Permanent project conventions live here. Run-specific notes belong under `docs/runs/`, but durable architecture, workflow, and verification rules must be promoted into this folder.

## Core guides

- `architecture-pattern.md` - SvelteKit route, screen, module, and shared boundaries.
- `framework-stack.md` - Current frontend runtime, libraries, and tool choices.
- `shared.md` - Ownership rules for `src/shared`.
- `state-management.md` - TanStack Query, Svelte runes, preferences, and persistence policy.
- `development-workflow.md` - Bun commands, Vite modes, app envs, variants, and delivery checks.
- `styling-guidelines.md` - Tailwind v4, shadcn-svelte `new-york`, design tokens, and icons.
- `testing-strategy.md` - Current verification gates and target test coverage.

## Generated Code

Generated files live under `src/generated`. Paraglide output is generated into `src/generated/paraglide` and imported through `$paraglide`.

## Update rule

When implementation changes architecture, state, routing, envs, styling, or verification, update the matching guide in this folder in the same task. Do not leave permanent conventions only in chat, TODOs, or run artifacts.
