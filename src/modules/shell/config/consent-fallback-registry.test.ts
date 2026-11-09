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

/** C-1 (`texts/legal/changes.md`): the approved words of OpenFreeMap, the same in the backend and the application. */
const openFreeMapWords = {
	el: 'Φορτώνει τους χάρτες της εφαρμογής και του ιστότοπου, όπως τον χάρτη που δείχνει πού βρίσκεται το ιατρείο. Ο πάροχος του χάρτη λαμβάνει τη διεύθυνση IP σας και την περιοχή του χάρτη που βλέπετε. Δεν ορίζει cookies.',
	en: 'Loads the maps of the app and the website, such as the map that shows where a practice is located. The map provider receives your IP address and the map area you are viewing. It sets no cookies.'
} as const;

describe('shell::config::consent-fallback-registry', () => {
	// Rewritten by C-1: it guarded the application's old words («Φορτώνει τον χάρτη…», `app` only in the backend).
	it('C-1 (U-24.4, app = web): OpenFreeMap is an essential tool of the app and the website, in the approved words of the backend and the application', () => {
		const tool = fallbackConsentRegistry.tools.find((entry) => entry.id === 'openfreemap');
		expect(tool).toMatchObject({
			category: 'essential',
			platforms: ['app', 'web'],
			policyUrl: null
		});
		for (const language of ['el', 'en'] as const) {
			expect(tool?.translations[language]?.description).toBe(openFreeMapWords[language]);
			expect(backendRegistry).toContain(openFreeMapWords[language]);
			expect(applicationRegistry).toContain(openFreeMapWords[language]);
			expect(tool?.translations[language]?.title).toBe('OpenFreeMap');
		}
	});

	// The version and the third tool changed by the orchestrator's decision 7 of `w2-fix-w` (`texts-notes.md` §Υλοποίηση 6);
	// the version again by C-1 (1.1.0 ⇒ 1.2.0: OpenFreeMap a web tool, as `c32abfc5` did for a web tool, 1.0.0 ⇒ 1.1.0).
	it('C-1 (U-24.4, negative): the bundled catalogue keeps the backend’s and the application’s version — the served registry still wins when it answers', () => {
		expect(fallbackConsentRegistry.registryVersion).toBe('1.2.0');
		expect(backendRegistry).toContain(
			`CONSENT_REGISTRY_VERSION = '${fallbackConsentRegistry.registryVersion}'`
		);
		expect(applicationRegistry).toContain(
			`registryVersion: '${fallbackConsentRegistry.registryVersion}'`
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
