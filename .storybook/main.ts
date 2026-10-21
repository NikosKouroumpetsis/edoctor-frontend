import type { StorybookConfig } from '@storybook/sveltekit';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
	framework: '@storybook/sveltekit',
	// Co-located stories. The glob lives under src/shared/ui so it NATURALLY
	// excludes src/modules/doctors (doctor-specific components are out of scope).
	stories: ['../src/shared/ui/**/*.stories.@(svelte|ts)'],
	addons: ['@storybook/addon-svelte-csf', '@storybook/addon-a11y', '@storybook/addon-docs'],
	// @storybook/sveltekit reuses our vite.config.ts and mocks `$app/*`. Storybook has no
	// SvelteKit server to inject runtime env, so `$env/dynamic/public` points to the same
	// empty stand-in the Vitest config uses and every `PUBLIC_*` setting keeps its default.
	viteFinal: (viteConfig) =>
		mergeConfig(viteConfig, {
			resolve: {
				alias: {
					'$env/dynamic/public': fileURLToPath(
						new URL('../vitest-mocks/env-dynamic-public.ts', import.meta.url)
					)
				}
			}
		})
};

export default config;
