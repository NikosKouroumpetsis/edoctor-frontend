import type { QueryClient } from '@tanstack/svelte-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchDoctorsScope } from '$modules/search-doctors/lib/search-query';

const { resolveLocationSlug, resolveSpecialtyScope } = vi.hoisted(() => ({
	resolveLocationSlug: vi.fn(),
	resolveSpecialtyScope: vi.fn()
}));
vi.mock('./resolvers', () => ({ resolveLocationSlug, resolveSpecialtyScope }));

import { buildSearchDoctorsParams } from './build-search-query';

const queryClient = {} as QueryClient;

function scope(overrides: Partial<SearchDoctorsScope> = {}): SearchDoctorsScope {
	return {
		what: { kind: 'default' },
		where: { kind: 'default' },
		availability: 'next3Days',
		...overrides
	};
}

const filters = {
	sortBy: 'popularity',
	gender: 'ANY',
	paymentOptions: [],
	speakLanguageCodes: [],
	serviceSlugs: [],
	priceMin: null,
	priceMax: null,
	disabilityAccess: false,
	parking: false
} satisfies NonNullable<SearchDoctorsScope['filters']>;

// The application's cases (`api/marketplace/build-search-query/index.unit.spec.ts`), the same titles and assertions
// (S-22); the web passes SvelteKit's `fetch` on to the resolvers (`undefined` in the browser).
describe('marketplace::build-search-query', () => {
	beforeEach(() => {
		resolveSpecialtyScope.mockReset();
		resolveLocationSlug.mockReset();
		resolveSpecialtyScope.mockResolvedValue({ professionalIds: ['prof-gp'] });
		resolveLocationSlug.mockResolvedValue({ locationSlug: 'attiki' });
	});

	it('prefers professionalSlugs when the professional scope carries a slug', async () => {
		const params = await buildSearchDoctorsParams(
			queryClient,
			scope({
				what: {
					kind: 'professional',
					professionalId: 'prof-cardiology',
					professionalSlug: 'cardiology'
				}
			}),
			'en'
		);

		expect(params.professionalSlugs).toEqual(['cardiology']);
		expect(params.professionalIds).toBeUndefined();
		expect(resolveSpecialtyScope).not.toHaveBeenCalled();
	});

	it('falls back to professionalIds when the professional scope has no slug', async () => {
		const params = await buildSearchDoctorsParams(
			queryClient,
			scope({ what: { kind: 'professional', professionalId: 'prof-cardiology' } }),
			'en'
		);

		expect(params.professionalIds).toEqual(['prof-cardiology']);
		expect(params.professionalSlugs).toBeUndefined();
		expect(resolveSpecialtyScope).not.toHaveBeenCalled();
	});

	it('maps a service what-scope to serviceSlugs', async () => {
		const params = await buildSearchDoctorsParams(
			queryClient,
			scope({ what: { kind: 'service', serviceSlug: 'video-consultation' } }),
			'en'
		);

		expect(params.serviceSlugs).toEqual(['video-consultation']);
	});

	it('maps a text what-scope to the text param', async () => {
		const params = await buildSearchDoctorsParams(
			queryClient,
			scope({ what: { kind: 'text', text: 'knee pain' } }),
			'en'
		);

		expect(params.text).toBe('knee pain');
	});

	it('Κ-1: resolves the default what-scope to the general-practitioner professionalIds, by the catalogue’s name (locale-aware)', async () => {
		resolveSpecialtyScope.mockResolvedValue({ professionalIds: ['prof-gp-1', 'prof-gp-2'] });

		const paramsEn = await buildSearchDoctorsParams(queryClient, scope(), 'en');
		expect(resolveSpecialtyScope).toHaveBeenCalledWith(queryClient, 'General practitioner', {
			lang: 'en',
			queryTerm: 'General practitioner',
			fetch: undefined
		});
		expect(paramsEn.professionalIds).toEqual(['prof-gp-1', 'prof-gp-2']);

		await buildSearchDoctorsParams(queryClient, scope(), 'el');
		expect(resolveSpecialtyScope).toHaveBeenCalledWith(queryClient, 'Γενικός Γιατρός', {
			lang: 'el',
			queryTerm: 'Γενικός Γιατρός',
			fetch: undefined
		});
	});

	it('prefers the default what-scope professionalSlugs when the resolver returns them', async () => {
		resolveSpecialtyScope.mockResolvedValue({
			professionalIds: ['prof-gp-1'],
			professionalSlugs: ['genikos-iatros']
		});

		const params = await buildSearchDoctorsParams(queryClient, scope(), 'en');

		expect(params.professionalSlugs).toEqual(['genikos-iatros']);
		expect(params.professionalIds).toBeUndefined();
	});

	it('sends BOTH slug and id arrays when the resolved slugs do not cover every id', async () => {
		resolveSpecialtyScope.mockResolvedValue({
			professionalIds: ['prof-gp-1', 'prof-gp-2'],
			professionalSlugs: ['genikos-iatros']
		});

		const params = await buildSearchDoctorsParams(queryClient, scope(), 'en');

		expect(params.professionalSlugs).toEqual(['genikos-iatros']);
		expect(params.professionalIds).toEqual(['prof-gp-1', 'prof-gp-2']);
	});

	it('degrades the default what-scope to a text term when no professional resolves', async () => {
		resolveSpecialtyScope.mockResolvedValue({ textFallback: 'General practitioner' });

		const params = await buildSearchDoctorsParams(queryClient, scope(), 'en');

		expect(params.professionalIds).toBeUndefined();
		expect(params.text).toBe('General practitioner');
	});

	it('maps a location where-scope to locationSlug without resolving a location', async () => {
		const params = await buildSearchDoctorsParams(
			queryClient,
			scope({ where: { kind: 'location', locationSlug: 'dimos-peiraia' } }),
			'en'
		);

		expect(params.locationSlug).toBe('dimos-peiraia');
		expect(resolveLocationSlug).not.toHaveBeenCalled();
	});

	it('S-11/S-19.5: Κοντά μου sends lat/lng with sortBy=distance and no geoScope', async () => {
		const params = await buildSearchDoctorsParams(
			queryClient,
			scope({ where: { kind: 'geo', lat: 37.98, lng: 23.72 } }),
			'en'
		);

		expect(params).toStrictEqual({
			availability: 'next3Days',
			lang: 'en',
			professionalIds: ['prof-gp'],
			lat: 37.98,
			lng: 23.72,
			sortBy: 'distance'
		});
		expect(params).not.toHaveProperty('geoScope');
		expect(resolveLocationSlug).not.toHaveBeenCalled();
	});

	it('S-18.8: a regional-unit location scope sends its own slug and never resolves the Αττική default', async () => {
		const params = await buildSearchDoctorsParams(
			queryClient,
			scope({ where: { kind: 'location', locationSlug: 'server-slug-piraeus-unit' } }),
			'el'
		);

		expect(params.locationSlug).toBe('server-slug-piraeus-unit');
		expect(resolveLocationSlug).not.toHaveBeenCalled();
	});

	it('S-18.8: no selection searches the Αττική default (the where-scope resolves the Attica locationSlug, locale-aware)', async () => {
		resolveLocationSlug.mockResolvedValue({ locationSlug: 'attiki' });

		await buildSearchDoctorsParams(queryClient, scope(), 'el');

		expect(resolveLocationSlug).toHaveBeenCalledWith(queryClient, 'Αττική', {
			lang: 'el',
			queryTerm: 'Αττική',
			fetch: undefined
		});
	});

	it('never sets sortBy outside the geo path and always passes availability + lang', async () => {
		const params = await buildSearchDoctorsParams(
			queryClient,
			scope({
				what: { kind: 'text', text: 'x' },
				where: { kind: 'location', locationSlug: 's' },
				availability: 'today'
			}),
			'en'
		);

		expect(params.sortBy).toBeUndefined();
		expect(params.availability).toBe('today');
		expect(params.lang).toBe('en');
	});

	it('S-01.6 (app = web): the filters ride the search — a gender, payments, the one language, services unioned, amenities only when on, an explicit rating sort', async () => {
		const params = await buildSearchDoctorsParams(
			queryClient,
			scope({
				what: { kind: 'service', serviceSlug: 'video' },
				where: { kind: 'location', locationSlug: 's' },
				filters: {
					...filters,
					sortBy: 'rating',
					gender: 'FEMALE',
					paymentOptions: ['CARD'],
					speakLanguageCodes: ['SL002'],
					serviceSlugs: ['video', 'ecg'],
					disabilityAccess: true
				}
			}),
			'el'
		);

		expect(params).toMatchObject({
			sortBy: 'rating',
			gender: 'FEMALE',
			paymentOptions: ['CARD'],
			speakLanguageCodes: ['SL002'],
			serviceSlugs: ['video', 'ecg'],
			disabilityAccess: true
		});
		expect(params).not.toHaveProperty('parking');
		expect(params).not.toHaveProperty('priceMin');
	});

	it('S-01.6 (app = web, negative): `ANY` sends no gender, and a `distance` sort without a position sends no sort', async () => {
		const params = await buildSearchDoctorsParams(
			queryClient,
			scope({
				where: { kind: 'location', locationSlug: 's' },
				filters: { ...filters, sortBy: 'distance' }
			}),
			'el'
		);

		expect(params).not.toHaveProperty('gender');
		expect(params.sortBy).toBeUndefined();
	});
});
