// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { projectRoot } from './source-scan';

const WEB_VALUES = join(projectRoot, 'src/shared/design/tokens/tokens.ts');
const APP_VALUES = resolve(projectRoot, '../application/src/shared/design/tokens/values/index.ts');
const CANONICAL =
	'The application is canonical: change application/src/shared/design/tokens/values/index.ts, then copy it to frontend/src/shared/design/tokens/tokens.ts';

/** Runs a values module the way a bundler would and returns its exports, in declaration order. */
function exportsOf(source: string): Record<string, unknown> {
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
	});
	const module = { exports: {} as Record<string, unknown> };
	runInNewContext(outputText, { module, exports: module.exports });
	return module.exports;
}

/** The first place two export trees differ (`radius.md: 12 ≠ 8`, a renamed or moved key), or `null`. */
function firstDifference(app: unknown, web: unknown, path = ''): string | null {
	const at = path || '(exports)';
	if (app && web && typeof app === 'object' && typeof web === 'object') {
		const appKeys = Object.keys(app);
		const webKeys = Object.keys(web);
		for (let index = 0; index < Math.max(appKeys.length, webKeys.length); index += 1) {
			const [appKey, webKey] = [appKeys[index], webKeys[index]];
			if (appKey !== webKey)
				return `${at} key #${index + 1}: ${appKey ?? '(none)'} ≠ ${webKey ?? '(none)'}`;
			const child = path ? `${path}.${appKey}` : appKey;
			const difference = firstDifference(
				(app as Record<string, unknown>)[appKey],
				(web as Record<string, unknown>)[webKey],
				child
			);
			if (difference) return difference;
		}
		return null;
	}
	return Object.is(app, web) ? null : `${at}: ${JSON.stringify(app)} ≠ ${JSON.stringify(web)}`;
}

const sample = `export const radius = { xs: 4, md: 12 } as const;
export const icon = { sm: 16 } as const satisfies Record<string, number>;
export type Role = keyof typeof radius;`;

describe('scale parity checker', () => {
	it('finds no difference between two copies with different formatting', () => {
		const reformatted = sample
			.replace(/ {2}|\t/g, '\t')
			.replace('{ xs: 4, md: 12 }', '{\n\txs: 4,\n\tmd: 12\n}');
		expect(firstDifference(exportsOf(sample), exportsOf(reformatted))).toBeNull();
	});

	it('names the first value that differs', () => {
		expect(firstDifference(exportsOf(sample), exportsOf(sample.replace('md: 12', 'md: 8')))).toBe(
			'radius.md: 12 ≠ 8'
		);
	});

	it('names a family or key that is missing, renamed or out of order', () => {
		const withoutIcon = sample.replace(/export const icon[^\n]*\n/, '');
		expect(firstDifference(exportsOf(sample), exportsOf(withoutIcon))).toBe(
			'(exports) key #2: icon ≠ (none)'
		);
		const reordered = sample.replace('{ xs: 4, md: 12 }', '{ md: 12, xs: 4 }');
		expect(firstDifference(exportsOf(sample), exportsOf(reordered))).toBe('radius key #1: xs ≠ md');
	});
});

describe('scale parity with the application', () => {
	it('finds the application repository next to this one', () => {
		expect(existsSync(APP_VALUES), `missing ${APP_VALUES}`).toBe(true);
	});

	it('carries every family of the shared scale, none of them empty', () => {
		const web = exportsOf(readFileSync(WEB_VALUES, 'utf8'));
		expect(Object.keys(web).length).toBeGreaterThan(10);
		for (const [family, values] of Object.entries(web)) {
			expect(Object.keys(values as object).length, family).toBeGreaterThan(0);
		}
	});

	it('exports exactly the values of the application file, in the same order', () => {
		const app = exportsOf(readFileSync(APP_VALUES, 'utf8'));
		const web = exportsOf(readFileSync(WEB_VALUES, 'utf8'));
		expect(firstDifference(app, web), CANONICAL).toBeNull();
	});
});
