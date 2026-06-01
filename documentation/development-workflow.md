# Development Workflow

## Canonical workflow

- Use Bun for all project commands.
- Use SvelteKit/Vite for local dev, builds, and previews.
- Use Paraglide compilation as part of prepare/check flows.
- Keep generated Paraglide output under `src/generated/paraglide`.

## Command groups

- Install:
  - `bun install`
- Dev server:
  - `bun run dev`
- Verification:
  - `bun run check`
  - `bun run lint`
  - `bun run build`
- Formatting:
  - `bun run format`
- Preview production build:
  - `bun run preview`
- i18n generation:
  - `bun run paraglide:compile`

## Envs and variants

Runtime envs:

- `development`
- `test`
- `preview`
- `production`

Web variants:

- `development`
- `preview`
- `production`

`appEnv` controls runtime behavior and env-scoped persistence. `appVariant` controls the deploy/build flavor. Do not use `NODE_ENV` as the app env or variant selector.

## Vite mode policy

Vite modes select env files:

```txt
.env
.env.local
.env.<mode>
.env.<mode>.local
```

Use these modes:

- `development` for local dev
- `test` for tests
- `preview` for preview/staging builds
- `production` for production builds

Client-visible values must use SvelteKit's public prefix, normally `PUBLIC_`. Private values must stay in server-only code and use `$env/static/private` or `$env/dynamic/private`.

## Suggested scripts

The current package has the core scripts. When env-specific scripts are added, use this shape:

```json
{
	"dev": "vite dev",
	"dev:preview": "vite dev --mode preview",
	"build": "vite build",
	"build:preview": "vite build --mode preview",
	"build:production": "vite build --mode production"
}
```

## Final verification loop

- Before delivering any task that changes code, run `bun run check`.
- If `bun run check` reports errors, fix them and rerun until clean or report the blocker.
- For implementation work, run `bun run lint`.
- For routing, provider, config, env, or public UI changes, run `bun run build`.
- Do not say an error is fixed until the relevant verification command passes.

## Documentation workflow

- Permanent rules live in `documentation/`.
- Task-specific notes live in `docs/runs/<RUN_ID>/`.
- If implementation and docs disagree, update the stale side before delivery.
