import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import Icons from 'unplugin-icons/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Standalone Vitest config for unit/component tests.
 *
 * It deliberately does NOT load the full SvelteKit/Paraglide/Tailwind plugin
 * stack: component tests only need the Svelte compiler plus the architecture
 * aliases. Keeping it separate from `vite.config.ts` avoids SSR/runtime plugin
 * friction inside jsdom while still mirroring the project's `$` aliases.
 */
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
	plugins: [svelte(), svelteTesting(), Icons({ compiler: 'svelte' })],
	resolve: {
		alias: {
			// SvelteKit virtual modules used by shared components, mocked for jsdom.
			'$app/environment': r('./vitest-mocks/app-environment.ts'),
			'$app/state': r('./vitest-mocks/app-state.ts'),
			'$app/paths': r('./vitest-mocks/app-paths.ts'),
			$generated: r('./src/generated'),
			$modules: r('./src/modules'),
			$paraglide: r('./src/generated/paraglide'),
			$screens: r('./src/screens'),
			$shared: r('./src/shared')
		}
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./vitest-setup-client.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		// Component tests render real DOM; keep them isolated per file.
		clearMocks: true
	}
});
