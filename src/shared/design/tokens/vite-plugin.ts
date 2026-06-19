/**
 * Vite plugin that compiles the canonical token source (`./tokens.ts`) into the
 * generated Tailwind theme CSS. Mirrors how Paraglide generates into
 * `src/generated`: the output is git-ignored and rebuilt on dev start, on every
 * production build, and whenever the token source changes in dev (triggering a
 * full reload so Tailwind re-reads the theme).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { tokensToCss } from './to-css';

/** Where the generated CSS is written (relative to the project root). */
const DEFAULT_OUTPUT = 'src/generated/design-tokens.css';

/** Token source files that should trigger a regenerate in dev. */
const SOURCE_FILES = ['design/tokens/tokens.ts', 'design/tokens/to-css.ts'];

function write(outputPath: string): void {
	mkdirSync(dirname(outputPath), { recursive: true });
	writeFileSync(outputPath, tokensToCss(), 'utf8');
}

export function designTokensPlugin(output: string = DEFAULT_OUTPUT): Plugin {
	const outputPath = resolve(process.cwd(), output);

	// Write eagerly so the file exists before Tailwind first reads the theme.
	write(outputPath);

	return {
		name: 'edoctor-design-tokens',
		buildStart() {
			write(outputPath);
		},
		handleHotUpdate({ file, server }) {
			if (!SOURCE_FILES.some((source) => file.endsWith(source))) return;
			write(outputPath);
			server.ws.send({ type: 'full-reload' });
			return [];
		}
	};
}
