# 01 — Setup (dependencies, config, scripts)

Everything needed to stand Storybook up on this repo. Copy-paste ready. Use
**bun** for every command (project rule).

## 1. Dependencies

Preferred path — let the CLI detect SvelteKit and pin compatible versions:

```bash
bunx storybook@latest init
```

The init wizard should detect `@sveltejs/kit` and scaffold `@storybook/sveltekit`.
After it runs, **review and fix**:

- it may add `npm` scripts — keep them but ensure they run under bun;
- it may not add Svelte CSF / a11y / vitest addons — add them (below);
- it may create example stories under `src/stories` — delete that folder
  (we co-locate stories next to components).

Manual / explicit dependency list (dev deps) if installing by hand or verifying:

```bash
bun add -d storybook @storybook/sveltekit \
  @storybook/addon-svelte-csf \
  @storybook/addon-a11y \
  @storybook/addon-docs \
  @storybook/addon-vitest \
  @vitest/browser playwright
```

Notes:

- `@storybook/addon-docs` may already be bundled in Storybook core for v9/v10 —
  if so, don't double-add; the autodocs feature works via `tags: ['autodocs']`.
- `@vitest/browser` + `playwright` are required only for the **addon-vitest**
  story-test runner (browser mode). After install run `bunx playwright install chromium`.
- We already have `vitest`, `@testing-library/svelte`, `jsdom` from Φ0.

## 2. `.storybook/main.ts`

```ts
import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
	framework: '@storybook/sveltekit',
	// Co-located stories. The glob lives under src/shared/ui so it NATURALLY
	// excludes src/modules/doctors (doctor-specific components are out of scope).
	// `src/stories` (the init demo) is intentionally NOT included.
	stories: ['../src/shared/ui/**/*.stories.@(svelte|ts)'],
	addons: [
		'@storybook/addon-svelte-csf',
		'@storybook/addon-a11y',
		'@storybook/addon-docs',
		'@storybook/addon-vitest'
	]
	// No `viteFinal` needed initially: @storybook/sveltekit reuses our
	// vite.config.ts (tailwind v4, paraglide, unplugin-icons, design-tokens).
	// If a plugin misbehaves under Storybook, add a viteFinal here to tweak it
	// (see 05-risks-and-open-questions.md).
};

export default config;
```

> If we later want the registration **Forms** showcase story (composes field
> molecules with `createForm`), either place it under
> `src/shared/ui/.../*.stories.svelte` or widen the glob to include a dedicated
> `src/shared/ui/_showcases/**`. Keep `src/modules/**` out of the glob.

## 3. `.storybook/preview.ts`

```ts
import type { Preview } from '@storybook/sveltekit';
// Brings in semantic color tokens (:root/.dark), generated non-color tokens,
// Tailwind v4, tw-animate-css and the Inter font — exactly what the app loads.
import '../src/routes/layout.css';

const preview: Preview = {
	parameters: {
		controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
		a11y: { test: 'error' } // fail a story on serious axe violations
	},
	// Light/dark toolbar switch reusing OUR theme system (the `.dark` class).
	globalTypes: {
		theme: {
			description: 'Color theme',
			defaultValue: 'light',
			toolbar: {
				title: 'Theme',
				icon: 'circlehollow',
				items: [
					{ value: 'light', title: 'Light', icon: 'sun' },
					{ value: 'dark', title: 'Dark', icon: 'moon' }
				],
				dynamicTitle: true
			}
		}
	},
	decorators: [
		(story, { globals }) => {
			// Side-effect decorator: toggle the global `.dark` class our tokens key off.
			if (typeof document !== 'undefined') {
				document.documentElement.classList.toggle('dark', globals.theme === 'dark');
				document.documentElement.style.colorScheme = globals.theme === 'dark' ? 'dark' : 'light';
			}
			return story();
		}
	]
};

export default preview;
```

> If the side-effect decorator proves flaky for the docs view, replace it with a
> tiny `\.storybook/theme-decorator.svelte` wrapper component that applies the
> class on a wrapping `<div class:dark>` and renders `{@render children()}`
> (matches the official "ThemeProvider decorator" pattern from the docs).

## 4. `package.json` scripts

```jsonc
{
	"scripts": {
		"storybook": "storybook dev -p 6006",
		"build-storybook": "storybook build"
	}
}
```

The design-tokens Vite plugin writes `src/generated/design-tokens.css` at build
start and the Paraglide Vite plugin compiles messages, so `storybook dev` works
without a separate prepare step. If a cold run ever races, run
`bun run paraglide:compile && bun run tokens:build` first.

## 5. addon-vitest wiring (story-based tests)

The Storybook test addon runs stories as Vitest tests **in a browser** (Playwright).
Keep our existing jsdom unit tests and add a second Vitest project for stories.

Convert `vitest.config.ts` into a workspace with two projects:

```ts
// vitest.config.ts (sketch — see 04-phases.md S3 for the full file)
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import Icons from 'unplugin-icons/vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const aliases = {
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
	resolve: { alias: aliases },
	test: {
		projects: [
			// 1) existing fast unit/component tests (jsdom)
			{
				plugins: [svelte(), svelteTesting(), Icons({ compiler: 'svelte' })],
				resolve: { alias: aliases },
				test: {
					name: 'unit',
					environment: 'jsdom',
					globals: true,
					setupFiles: ['./vitest-setup-client.ts'],
					include: ['src/**/*.{test,spec}.{js,ts}']
				}
			},
			// 2) story tests in a real browser via the Storybook plugin
			{
				plugins: [storybookTest({ configDir: '.storybook' })],
				resolve: { alias: aliases },
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

`.storybook/vitest.setup.ts`:

```ts
import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/sveltekit';
import * as preview from './preview';

const project = setProjectAnnotations([preview]);
beforeAll(project.beforeAll);
```

Scripts gain a story-test run (kept separate so the fast jsdom suite stays the
default `bun run test`):

```jsonc
{
	"scripts": {
		"test": "vitest run --project unit",
		"test:stories": "vitest run --project storybook",
		"test:all": "vitest run"
	}
}
```

> Trade-off: browser-mode story tests need Playwright/Chromium (heavier, slower).
> They are the S3 step; S0–S2 deliver value with `storybook dev` alone.

## 6. Files this introduces

```
frontend/
  .storybook/
    main.ts
    preview.ts
    vitest.setup.ts            # S3 (addon-vitest)
    theme-decorator.svelte     # optional, only if the side-effect decorator is replaced
  src/shared/ui/**/<name>.stories.svelte   # the stories themselves
  vitest.config.ts             # converted to a 2-project workspace in S3
  package.json                 # +storybook, +build-storybook, test scripts
```
