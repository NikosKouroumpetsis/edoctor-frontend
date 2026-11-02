import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConsentRegistry } from './registry';

const { httpGet } = vi.hoisted(() => ({ httpGet: vi.fn() }));
vi.mock('$shared/lib/http', () => ({ httpGet }));

const words = {
	el: { title: 'Εργαλείο', description: 'Περιγραφή' },
	en: { title: 'Tool', description: '' }
};

afterEach(() => httpGet.mockReset());

describe('getConsentRegistry (the trust boundary, the application’s `mapConsentRegistryToFacts`)', () => {
	// MAJOR-3 (r1): r0 passed `data.tools` as they came; a tool without `platforms` threw inside the frame's
	// `$derived` (every page), one without a language threw when «Διαχείριση» opened.
	it('U-16.5 (negative): a tool the web cannot describe is dropped — no id, an unknown category, no platform, a missing language', async () => {
		httpGet.mockResolvedValue({
			registryVersion: ' 3.0.0 ',
			tools: [
				{
					id: 'edoctor-api',
					category: 'essential',
					platforms: ['app', 'web'],
					policyUrl: null,
					translations: words
				},
				{ id: ' ', category: 'analytics', platforms: ['web'], translations: words },
				{ id: 'odd', category: 'telemetry', platforms: ['web'], translations: words },
				{ id: 'no-platform', category: 'analytics', translations: words },
				{ id: 'tv-only', category: 'analytics', platforms: ['tv'], translations: words },
				{ id: 'no-en', category: 'marketing', platforms: ['web'], translations: { el: words.el } },
				{
					id: 'blank-title',
					category: 'marketing',
					platforms: ['web'],
					translations: { el: { title: ' ' }, en: words.en }
				},
				null
			]
		});
		const registry = await getConsentRegistry();
		expect(registry).toEqual({
			registryVersion: '3.0.0',
			tools: [
				{
					id: 'edoctor-api',
					category: 'essential',
					platforms: ['app', 'web'],
					policyUrl: null,
					translations: { el: words.el, en: { title: 'Tool', description: '' } }
				}
			]
		});
	});

	it('U-16.5 (negative): a registry without a usable version is `null` (the caller keeps the bundled one)', async () => {
		for (const payload of [
			null,
			{},
			{ registryVersion: '  ', tools: [] },
			{ registryVersion: 3, tools: [] }
		]) {
			httpGet.mockResolvedValueOnce(payload);
			expect(await getConsentRegistry()).toBeNull();
		}
	});
});
