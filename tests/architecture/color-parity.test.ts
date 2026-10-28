// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { projectRoot } from './source-scan';

const WEB_CSS = join(projectRoot, 'src/routes/layout.css');
const APP_THEME = resolve(projectRoot, '../application/src/shared/preferences/theme');
const APP_LIGHT = join(APP_THEME, 'light/index.ts');
const APP_DARK = join(APP_THEME, 'dark/index.ts');
const CANONICAL =
	'The application is canonical: change application/src/shared/preferences/theme/{light,dark}/index.ts, then copy the value to frontend/src/routes/layout.css';

/** shadcn names the web keeps without a consumer and the application never had (end-of-wave list, U-02.5). */
const WEB_ONLY = /^(chart-[1-5]|sidebar(-[\w-]+)?)$/;

type Palette = Record<string, string>;

/** The one exported palette object of an application theme file, run the way a bundler would. */
function paletteOf(source: string): Palette {
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
	});
	const module = { exports: {} as Record<string, unknown> };
	runInNewContext(outputText, { module, exports: module.exports, require: () => ({}) });
	const palettes = Object.values(module.exports).filter(
		(value): value is Palette => typeof value === 'object' && value !== null
	);
	if (palettes.length !== 1) throw new Error(`expected one palette, found ${palettes.length}`);
	return palettes[0];
}

/** The custom properties of the first `selector { … }` block of a stylesheet, name ⇒ value, in order. */
function blockOf(css: string, selector: string): Palette {
	const start = css.search(new RegExp(`(^|\\n)${selector.replace('.', '\\.')}\\s*\\{`));
	if (start < 0) return {};
	const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
	const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, '');
	return Object.fromEntries(
		[...withoutComments.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((match) => [
			match[1],
			match[2].trim()
		])
	);
}

/** The `--color-*` names `@theme inline` maps to a palette variable (`--color-x: var(--x)`). */
function themeMappingOf(css: string): Palette {
	const start = css.indexOf('@theme inline');
	if (start < 0) return {};
	const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
	return Object.fromEntries(
		[...body.matchAll(/--color-([\w-]+)\s*:\s*([^;]+);/g)].map((match) => [
			match[1],
			match[2].trim()
		])
	);
}

const normal = (value: string) => value.trim().toLowerCase();

/**
 * Every way the web palette of one theme leaves the application's: a missing, extra or reordered name, a
 * different value, or a name the theme does not map to `--color-<name>`, as `theme name: why`.
 */
function findColorDrift(app: Palette, web: Palette, mapping: Palette, theme: string): string[] {
	const issues: string[] = [];
	const shared = Object.keys(web).filter((name) => !WEB_ONLY.test(name));
	for (const name of Object.keys(app)) {
		if (!(name in web)) issues.push(`${theme} ${name}: missing in the web`);
		else if (normal(app[name]) !== normal(web[name]))
			issues.push(`${theme} ${name}: ${app[name]} ≠ ${web[name]}`);
		if (mapping[name] !== `var(--${name})`)
			issues.push(`${theme} ${name}: not mapped as --color-${name}: var(--${name})`);
	}
	for (const name of shared) {
		if (!(name in app)) issues.push(`${theme} ${name}: not an application colour`);
	}
	const appOrder = Object.keys(app).filter((name) => shared.includes(name));
	const webOrder = shared.filter((name) => name in app);
	if (issues.length === 0 && appOrder.join() !== webOrder.join())
		issues.push(`${theme}: order differs from the application file`);
	return issues;
}

const appFixture = `export const lightThemeColors = {
  background: '#f8fafc',
  'primary-text': '#1D4ED8',
  overlay: '#00000080',
} as const;
export type ThemeColorName = keyof typeof lightThemeColors;`;

const cssFixture = `:root {
	--background: #F8FAFC;
	/* a comment */
	--primary-text: #1d4ed8;
	--overlay: #00000080;
	--chart-1: #2563eb;
}
@theme inline {
	--color-background: var(--background);
	--color-primary-text: var(--primary-text);
	--color-overlay: var(--overlay);
}`;

describe('colour parity checker', () => {
	it('U-03.4: accepts a copy that differs only in letter case, comments and web-only shadcn names', () => {
		const css = cssFixture;
		expect(
			findColorDrift(paletteOf(appFixture), blockOf(css, ':root'), themeMappingOf(css), 'light')
		).toEqual([]);
	});

	it('U-03.4: names a missing token, a different value, an extra name and a missing mapping', () => {
		const css = cssFixture
			.replace('--primary-text: #1d4ed8;', '--primary-text: #2563eb;\n\t--rating: #be185d;')
			.replace('\t--overlay: #00000080;\n\t--chart', '\t--chart')
			.replace('\t--color-background: var(--background);\n', '');
		expect(
			findColorDrift(paletteOf(appFixture), blockOf(css, ':root'), themeMappingOf(css), 'light')
		).toEqual([
			'light background: not mapped as --color-background: var(--background)',
			'light primary-text: #1D4ED8 ≠ #2563eb',
			'light overlay: missing in the web',
			'light rating: not an application colour'
		]);
	});

	it('U-03.4: names a palette written in another order', () => {
		const css = cssFixture.replace(
			'--background: #F8FAFC;\n\t/* a comment */\n\t--primary-text: #1d4ed8;',
			'--primary-text: #1d4ed8;\n\t--background: #F8FAFC;'
		);
		expect(
			findColorDrift(paletteOf(appFixture), blockOf(css, ':root'), themeMappingOf(css), 'light')
		).toEqual(['light: order differs from the application file']);
	});
});

describe('colour parity with the application', () => {
	const css = readFileSync(WEB_CSS, 'utf8');

	it('U-03.4: finds the application theme files next to this repository', () => {
		expect(existsSync(APP_LIGHT), `missing ${APP_LIGHT}`).toBe(true);
		expect(existsSync(APP_DARK), `missing ${APP_DARK}`).toBe(true);
	});

	it('U-03.4: reads both palettes of both projects', () => {
		const light = paletteOf(readFileSync(APP_LIGHT, 'utf8'));
		expect(Object.keys(light).length).toBeGreaterThan(30);
		expect(Object.keys(blockOf(css, ':root')).length).toBeGreaterThan(30);
		expect(Object.keys(blockOf(css, '.dark')).length).toBeGreaterThan(30);
	});

	it('U-03.4: the light palette of the web is the application light palette', () => {
		const app = paletteOf(readFileSync(APP_LIGHT, 'utf8'));
		expect(
			findColorDrift(app, blockOf(css, ':root'), themeMappingOf(css), 'light'),
			CANONICAL
		).toEqual([]);
	});

	it('U-03.4: the dark palette of the web is the application dark palette', () => {
		const app = paletteOf(readFileSync(APP_DARK, 'utf8'));
		expect(
			findColorDrift(app, blockOf(css, '.dark'), themeMappingOf(css), 'dark'),
			CANONICAL
		).toEqual([]);
	});
});
