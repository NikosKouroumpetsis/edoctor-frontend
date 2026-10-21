import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type Catalog = Record<string, unknown>;

interface InlangSettings {
	baseLocale: string;
	locales: string[];
}

const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const fromRoot = (path: string) => resolve(projectRoot, path);

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

const placeholdersOf = (text: string) =>
	[...text.matchAll(PLACEHOLDER)]
		.map((match) => match[1])
		.sort()
		.join(',');

/**
 * Lists every way the message catalogs drift from the base locale: a declared locale without
 * a catalog, a catalog without a declared locale, missing or extra keys, empty texts, texts
 * whose `{placeholders}` differ from the base, and values not shaped like the base value.
 */
function findParityIssues(
	baseLocale: string,
	locales: readonly string[],
	catalogs: Record<string, Catalog>
): string[] {
	const issues: string[] = [];
	const base = catalogs[baseLocale];

	for (const locale of Object.keys(catalogs)) {
		if (!locales.includes(locale)) issues.push(`${locale}: catalog for an undeclared locale`);
	}

	for (const locale of locales) {
		const catalog = catalogs[locale];

		if (!catalog) {
			issues.push(`${locale}: catalog file is missing`);
			continue;
		}

		for (const [key, value] of Object.entries(catalog)) {
			const baseValue = base?.[key];

			if (base && !Object.hasOwn(base, key)) {
				issues.push(`${locale}: extra key "${key}"`);
			} else if (typeof value === 'string') {
				if (!value.trim()) {
					issues.push(`${locale}: empty value for "${key}"`);
				} else if (
					typeof baseValue === 'string' &&
					placeholdersOf(value) !== placeholdersOf(baseValue)
				) {
					issues.push(`${locale}: placeholders of "${key}" differ from ${baseLocale}`);
				}
			} else if (
				typeof value !== typeof baseValue ||
				Array.isArray(value) !== Array.isArray(baseValue)
			) {
				issues.push(`${locale}: "${key}" is not shaped like ${baseLocale}`);
			}
		}

		for (const key of Object.keys(base ?? {})) {
			if (!Object.hasOwn(catalog, key)) issues.push(`${locale}: missing key "${key}"`);
		}
	}

	return issues;
}

/**
 * Reads the declared locales from the inlang project settings and every catalog under
 * `messages/`, keyed by the locale in its file name.
 */
function readProjectCatalogs() {
	const settings = readJson(fromRoot('project.inlang/settings.json')) as InlangSettings;
	const catalogs = Object.fromEntries(
		readdirSync(fromRoot('messages'))
			.filter((file) => file.endsWith('.json'))
			.map((file) => [
				file.slice(0, -'.json'.length),
				readJson(fromRoot(`messages/${file}`)) as Catalog
			])
	);

	return { settings, catalogs };
}

const greek: Catalog = {
	$schema: 'schema',
	greeting: 'Γεια σας {name}',
	progress: '{done} από {total}'
};

const english: Catalog = {
	$schema: 'schema',
	greeting: 'Hello {name}',
	progress: '{done} of {total}'
};

const check = (translation: Catalog) =>
	findParityIssues('el', ['el', 'en'], { el: greek, en: translation });

describe('i18n catalog parity checker', () => {
	it('accepts a translation with the same keys, texts and placeholders', () => {
		expect(check(english)).toEqual([]);
	});

	it('reports a key missing from the translation', () => {
		const translation = { ...english };
		delete translation.greeting;

		expect(check(translation)).toEqual(['en: missing key "greeting"']);
	});

	it('reports a key only the translation has', () => {
		expect(check({ ...english, farewell: 'Goodbye' })).toEqual(['en: extra key "farewell"']);
	});

	it('reports an empty translation', () => {
		expect(check({ ...english, greeting: '   ' })).toEqual(['en: empty value for "greeting"']);
	});

	it('reports a translation whose placeholders differ from the base', () => {
		expect(check({ ...english, progress: '{done} of {count}' })).toEqual([
			'en: placeholders of "progress" differ from el'
		]);
	});

	it('reports a translation that is not text where the base is text', () => {
		expect(check({ ...english, greeting: ['Hello'] })).toEqual([
			'en: "greeting" is not shaped like el'
		]);
	});

	it('reports a declared locale without a catalog and a catalog without a declared locale', () => {
		expect(findParityIssues('el', ['el', 'en'], { el: greek, de: english })).toEqual([
			'de: catalog for an undeclared locale',
			'en: catalog file is missing'
		]);
	});
});

describe('i18n catalog parity of the project', () => {
	it('keeps every declared locale in parity with the base locale', () => {
		const { settings, catalogs } = readProjectCatalogs();

		expect(settings.locales).toContain(settings.baseLocale);
		expect(findParityIssues(settings.baseLocale, settings.locales, catalogs)).toEqual([]);
	});
});
