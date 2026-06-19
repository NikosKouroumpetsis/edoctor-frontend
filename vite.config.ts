import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import { designTokensPlugin } from './src/shared/design/tokens/vite-plugin';

export default defineConfig({
	plugins: [
		// Generate the token theme CSS before Tailwind reads it.
		designTokensPlugin(),
		tailwindcss(),
		sveltekit(),
		Icons({
			compiler: 'svelte'
		}),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/generated/paraglide',
			strategy: ['url', 'cookie', 'baseLocale'],
			urlPatterns: [
				{
					pattern: '/:path(.*)?',
					localized: [
						['en', '/en/:path(.*)?'],
						['el', '/:path(.*)?']
					]
				}
			]
		})
	]
});
