# Project Profile

This file is the project adapter for the generic Claude pipeline. Change this
file and `.claude/pipeline/config.json` when copying the pipeline to another
repository. Keep reusable agent and skill instructions project-agnostic.

## Canonical Instructions

Read these files before planning or changing code, in this order:

1. `CLAUDE.md` for Claude Code workflow and project rules.
2. `.claude/project/project-architecture.md` for the canonical architecture
   contract.
3. `package.json` for the only allowed project commands.
4. `documentation/architecture-pattern.md` when architecture, routing, screens,
   modules, or shared boundaries are involved.
5. `documentation/testing-strategy.md` before running or adding tests.

`AGENTS.md` belongs to the Codex workflow and is not an instruction source for
this Claude pipeline.

## Repository Shape

- Framework: SvelteKit, Svelte 5 runes, TypeScript.
- Runtime/package manager: Bun only.
- Styling: Tailwind v4 semantic tokens, in-house shadcn-styled (`new-york`)
  components on the headless layer in `src/shared/lib/headless` (no external UI
  library; Bits UI being phased out).
- i18n: Paraglide JS (URL routing); generated output in `src/generated/paraglide`.
- State: TanStack Svelte Query (server state) and Svelte runes (local/UI state).
- Architecture: thin `src/routes` glue, mirrored `src/screens`, per-feature
  `src/modules`, and a shared atomic-design layer `src/shared`.
- Aliases: `$screens`, `$modules`, `$shared`, `$generated`, `$paraglide`.
- Architecture and test guidance: `documentation/`.

## Verification Contract

- Run only scripts declared in `package.json`, with Bun.
- Start with the smallest relevant checks.
- `bun run check` (Paraglide compile + svelte-kit sync + svelte-check) is the
  current hard gate; it must pass before handoff.
- `bun run lint` (Prettier check + ESLint) before closing implementation work.
- `bun run build` when routing, SvelteKit config, env behavior, providers, or
  public UI flows change.
- Use localhost/dev-server commands only when the environment permits them and
  required approval has been granted.

## Change Boundaries

- Prefer existing patterns, shared utilities, and the atomic-design system.
- Use Bun only. Do not add dependencies without explicit approval. Prefer
  Icones virtual imports over icon packages and shadcn-svelte primitives over
  new UI kits.
- Do not hand-edit generated Paraglide output under `src/generated/paraglide`.
- Do not import application code from `$lib/*`.
- Do not reintroduce backend-style layers in the frontend.
- Do not change architecture patterns without an approved run decision.
- Keep secrets and environment values out of reports and logs; respect the
  SSR/client and public/private env boundary.
