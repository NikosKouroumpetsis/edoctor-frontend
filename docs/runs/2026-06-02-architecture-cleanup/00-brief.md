# Brief

## Goal

Apply the architecture cleanup decisions from the codebase audit so the frontend follows the intended SvelteKit modular architecture and Atomic Design guidance more consistently.

## Requested Work

- Refactor the marketing home landing module so `page/index.svelte` remains a slice composition root instead of a large all-in-one component.
- Keep feature UI local to the module unless a component has a real shared contract.
- Replace wildcard shared runtime barrels with explicit exports.
- Update `documentation/architecture-pattern.md` with detailed, enforceable guidance for routes, screens, modules, shared UI, Atomic Design, imports, state, and promotion rules.
- Verify with the required Bun checks.

## Constraints

- Use Bun for project commands.
- Preserve the existing public API for routes, screens, modules, and shared primitives.
- Do not introduce dependencies.
- Keep route files thin and avoid `$lib` application imports.
