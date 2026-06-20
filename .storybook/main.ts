import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
	framework: '@storybook/sveltekit',
	// Co-located stories. The glob lives under src/shared/ui so it NATURALLY
	// excludes src/modules/doctors (doctor-specific components are out of scope).
	stories: ['../src/shared/ui/**/*.stories.@(svelte|ts)'],
	addons: ['@storybook/addon-svelte-csf', '@storybook/addon-a11y', '@storybook/addon-docs']
	// No `viteFinal` needed: @storybook/sveltekit reuses our vite.config.ts
	// (tailwind v4, paraglide, unplugin-icons, design-tokens) so ~icons/*,
	// $paraglide, design tokens, Tailwind v4 and $app/* all work without mocks.
};

export default config;
