import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fallbackConsentRegistry } from './consent-fallback-registry';

const applicationRegistry = readFileSync(
	join(process.cwd(), '../application/src/modules/consent/config/fallback-registry/index.ts'),
	'utf8'
);

const backendRegistry = readFileSync(
	join(process.cwd(), '../backend/src/modules/consent/config/index.ts'),
	'utf8'
);

describe('shell::config::consent-fallback-registry', () => {
	it('U-24.4 (app = web): OpenFreeMap is an essential tool of the web too, in the application’s own words', () => {
		const tool = fallbackConsentRegistry.tools.find((entry) => entry.id === 'openfreemap');
		expect(tool).toMatchObject({
			category: 'essential',
			platforms: ['app', 'web'],
			policyUrl: null
		});
		for (const language of ['el', 'en'] as const) {
			expect(applicationRegistry).toContain(tool?.translations[language]?.description);
			expect(tool?.translations[language]?.title).toBe('OpenFreeMap');
		}
	});

	// The version and the third tool changed by the orchestrator's decision 7 of `w2-fix-w` (`texts-notes.md` §Υλοποίηση 6).
	it('U-24.4 (negative): the bundled catalogue keeps the backend’s version — the served registry still wins when it answers', () => {
		expect(fallbackConsentRegistry.registryVersion).toBe('1.1.0');
		expect(backendRegistry).toContain(
			`CONSENT_REGISTRY_VERSION = '${fallbackConsentRegistry.registryVersion}'`
		);
		expect(fallbackConsentRegistry.tools.map((entry) => entry.id)).toEqual([
			'edoctor-api',
			'openfreemap',
			'helpful-answers-storage'
		]);
	});

	it('U-78.1: the key that remembers «Ήταν χρήσιμο;» is an essential tool of the web, in the backend’s own words', () => {
		const tool = fallbackConsentRegistry.tools.find(
			(entry) => entry.id === 'helpful-answers-storage'
		);
		expect(tool).toMatchObject({ category: 'essential', platforms: ['web'], policyUrl: null });
		expect(backendRegistry).toContain(`id: '${tool?.id}'`);
		for (const language of ['el', 'en'] as const) {
			expect(backendRegistry).toContain(tool?.translations[language]?.title);
			expect(backendRegistry).toContain(tool?.translations[language]?.description);
		}
	});

	// NIT-6 of the architecture audit (U-29): these words are data in the server's shape, out of the Paraglide catalogs
	// that `i18n-parity` guards, so their parity is guarded here.
	it('U-29 (NIT-6): every tool of the bundled catalogue has a title and a description in Greek and English', () => {
		expect(fallbackConsentRegistry.tools.length).toBeGreaterThan(0);
		for (const tool of fallbackConsentRegistry.tools) {
			for (const language of ['el', 'en'] as const) {
				expect(tool.translations[language]?.title?.trim(), `${tool.id} ${language}`).toBeTruthy();
				expect(
					tool.translations[language]?.description?.trim(),
					`${tool.id} ${language}`
				).toBeTruthy();
			}
		}
	});
});
