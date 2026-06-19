# 04 — Phased execution plan

Each phase ends green on its gate. Keep the existing app gates passing throughout
(`bun run check`, `bun run lint`, `bun run test`). Storybook adds
`bun run build-storybook` as a new gate from S0 on.

## S0 — Bootstrap & validate the pipeline

Goal: prove icons, design-tokens, Tailwind v4, `$app/*`, and dark mode all work
inside Storybook before mass-authoring stories.

- [ ] Install deps (`01-setup.md` §1). Run `bunx playwright install chromium`
      only if doing S3 in the same pass.
- [ ] Create `.storybook/main.ts` and `.storybook/preview.ts` (§2, §3).
- [ ] Add `storybook` + `build-storybook` scripts (§4).
- [ ] Delete the CLI demo `src/stories/` folder if `init` created it.
- [ ] Author **3 probe stories**: `Primitives/Button`, `Primitives/Dialog`
      (overlay + portal), `Molecules/Text field` (icons + form lib).
- [ ] `bun run storybook` — verify: icons render, tokens/Tailwind apply, the
      theme toolbar switches light/dark, the dialog opens/portals, a11y panel works.
- [ ] `bun run build-storybook` — must succeed.

Gate: `build-storybook` passes; 3 probe stories render correctly in both themes.

## S1 — All primitives

- [ ] Author one `*.stories.svelte` per primitive in `03-component-inventory.md`
      (29 files), following the matching pattern (A–D).
- [ ] For each: a controls-driven `Playground` + the listed variant/state stories.
- [ ] Add `play` stories for `tabs`, `dialog`, `popover` (▶ rows).
- [ ] Spot-check a11y panel per primitive; fix any serious axe violations in the
      story (or, if it's a real component bug, file it and fix in `src/`).

Gate: `build-storybook` passes; every primitive has a Playground + at least one
variant/state story; no serious axe violations.

## S2 — Molecules + Forms showcase

- [ ] Author the 9 molecule stories (form fields + theme-toggle + language-switcher).
- [ ] For form fields: include Standalone, With error, and Form-connected stories.
- [ ] Author `Showcases/Registration form` (createForm + all fields + submit).
- [ ] `language-switcher` / `theme-toggle`: add a decorator that seeds `page.url`
      if a story needs a specific locale.

Gate: `build-storybook` passes; all molecules + the registration showcase render
and validate in both themes.

## S3 — Generic organisms + story tests + CI

- [ ] Author `Organisms/Cookie consent` and `Organisms/Site navbar` stories
      (incl. ▶ account menu and ▶ mobile sheet).
- [ ] (Optional) app-chrome organisms (site-footer, bottom-nav, app-shell) with
      `page.url` decorators.
- [ ] Wire `@storybook/addon-vitest`:
  - [ ] add `.storybook/vitest.setup.ts` (§5),
  - [ ] convert `vitest.config.ts` to the 2-project workspace (full file below),
  - [ ] `bunx playwright install chromium`,
  - [ ] update scripts: `test` → unit project, add `test:stories`, `test:all`.
- [ ] Run `bun run test` (unit, fast) and `bun run test:stories` (browser) — both green.
- [ ] Add `build-storybook` (and optionally `test:stories`) to the project's
      final quality gate and CI.

Gate: `build-storybook` passes; `bun run test:all` green; docs updated.

### Full `vitest.config.ts` for S3 (workspace with two projects)

```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import Icons from 'unplugin-icons/vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const alias = {
	'$app/environment': r('./vitest-mocks/app-environment.ts'),
	'$app/state': r('./vitest-mocks/app-state.ts'),
	'$app/paths': r('./vitest-mocks/app-paths.ts'),
	$generated: r('./src/generated'),
	$modules: r('./src/modules'),
	$paraglide: r('./src/generated/paraglide'),
	$screens: r('./src/screens'),
	$shared: r('./src/shared')
};

export default defineConfig({
	resolve: { alias },
	test: {
		projects: [
			{
				plugins: [svelte(), svelteTesting(), Icons({ compiler: 'svelte' })],
				resolve: { alias },
				test: {
					name: 'unit',
					environment: 'jsdom',
					globals: true,
					clearMocks: true,
					setupFiles: ['./vitest-setup-client.ts'],
					include: ['src/**/*.{test,spec}.{js,ts}']
				}
			},
			{
				plugins: [storybookTest({ configDir: '.storybook' })],
				resolve: { alias },
				test: {
					name: 'storybook',
					browser: {
						enabled: true,
						provider: 'playwright',
						headless: true,
						instances: [{ browser: 'chromium' }]
					},
					setupFiles: ['./.storybook/vitest.setup.ts']
				}
			}
		]
	}
});
```

> Keep `vitest.config.ts`'s current single-project behavior until S3 — converting
> early would force every `bun run test` to spin up a browser.

## Documentation updates to do at implementation time

- `documentation/framework-stack.md`: add Storybook to the stack + scripts.
- `documentation/testing-strategy.md`: add the story-test project + `build-storybook` gate.
- `.claude/project/project-architecture.md`: note stories live co-located under
  `src/shared/ui/**` as `*.stories.svelte`, and that doctor-specific components
  are intentionally excluded from Storybook.
- `CLAUDE.md`: mention `bun run storybook` / `build-storybook` in command rules.
