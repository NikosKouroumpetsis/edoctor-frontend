import prettier from 'eslint-config-prettier';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	// Claude Code tooling/workflow files are not part of the application source
	// and are not held to the app's lint rules. Generated OpenAPI types are
	// tracked (not gitignored) but, like the Paraglide output, are exempt from
	// the app lint rules.
	{ ignores: ['.claude/**', 'storybook-static/**', 'src/generated/api/**'] },
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		// Generic link renderers of the kit: the href is the caller's, already resolved by the page that knows
		// the route and the language (U-02.1 / U-03.8: shared/ui never reads either).
		files: [
			'src/shared/ui/primitives/button/button.svelte',
			'src/shared/ui/primitives/date-card/date-card.svelte',
			'src/shared/ui/primitives/icon-button/icon-button.svelte',
			'src/shared/ui/primitives/text-button/text-button.svelte',
			'src/shared/ui/primitives/inline-link-text/inline-link-text.svelte',
			'src/shared/ui/molecules/info-row/info-row.svelte',
			'src/shared/ui/molecules/language-switcher/language-switcher.svelte',
			'src/shared/ui/organisms/bottom-nav/bottom-nav.svelte',
			'src/shared/ui/organisms/media-card/media-card.svelte',
			'src/shared/ui/organisms/photo-carousel/photo-carousel.svelte',
			'src/shared/ui/organisms/site-footer/site-footer.svelte',
			'src/shared/ui/organisms/site-navbar/site-navbar.svelte'
		],
		rules: {
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {}
	}
);
