import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { buildSectionCriteria } from '$modules/search-doctors/lib/section-link';
import { buildSectionQuery as buildSectionLinkQuery } from './build-section-query';
import { EMPTY_CATEGORY_SCOPE } from './category-scope';
import { homeSectionConfigs } from './sections';

const { resolveLocationSlug, resolveSpecialtyScope } = vi.hoisted(() => ({
	resolveLocationSlug: vi.fn(),
	resolveSpecialtyScope: vi.fn()
}));
vi.mock('./resolvers', () => ({ resolveLocationSlug, resolveSpecialtyScope }));

const [athens, psychologists, internalMedicine] = homeSectionConfigs;
const client = () => new QueryClient();

/**
 * 🔴 U-32.1: the api answers the row's search and the FACTS of its «→» (`link`); `lib/section-link` makes them the
 * results' criteria. The guards below read the two together, as the home does, with their assertions as before.
 */
async function buildSectionQuery(...args: Parameters<typeof buildSectionLinkQuery>) {
	const query = await buildSectionLinkQuery(...args);
	return query && { params: query.params, criteria: buildSectionCriteria(query.link) };
}

afterEach(() => {
	resolveLocationSlug.mockReset();
	resolveSpecialtyScope.mockReset();
});

describe('buildSectionQuery (the home rows, the application’s queries)', () => {
	it('U-20: the three rows are the application’s `homeSectionConfigs` — Athens, psychologists, internal medicine & GPs', () => {
		expect(
			homeSectionConfigs.map((config) => [config.id, config.sortBy, config.availability])
		).toEqual([
			['popular-athens', 'popularity', 'next7Days'],
			['popular-psychologists', 'popularity', 'next7Days'],
			['internal-medicine-gp', 'popularity', 'next7Days']
		]);
	});

	it('U-20: «Δημοφιλείς γιατροί στην Αθήνα» scopes to the resolved area; its «→» opens the same area', async () => {
		resolveLocationSlug.mockResolvedValue({ locationSlug: 'athina', locationType: 'municipality' });
		const query = await buildSectionQuery(client(), athens, EMPTY_CATEGORY_SCOPE, 'el');
		expect(query?.params).toEqual({
			sortBy: 'popularity',
			availability: 'next7Days',
			limit: 8,
			lang: 'el',
			locationSlug: 'athina'
		});
		expect(query?.criteria).toEqual({
			availability: 'next7Days',
			what: '',
			where: 'Αθήνα',
			whatSelection: null,
			whereSelection: {
				kind: 'location',
				label: 'Αθήνα',
				slug: 'athina',
				locationType: 'municipality'
			}
		});
	});

	// NIT-4 (r1): on /en the r0 «→» opened `where=Athina`, the matcher's term, not the area's own words.
	it('S-03.2: the «→» opens the area by its own words (the suggestion’s label), the matcher’s term only without one', async () => {
		resolveLocationSlug.mockResolvedValue({ locationSlug: 'athina', label: 'Athens' });
		const query = await buildSectionQuery(client(), athens, EMPTY_CATEGORY_SCOPE, 'en');
		expect(query?.criteria.where).toBe('Athens');
		expect(query?.criteria.whereSelection).toMatchObject({ kind: 'location', label: 'Athens' });
		expect(resolveLocationSlug).toHaveBeenCalledWith(
			expect.anything(),
			'Athina',
			expect.anything()
		);
	});

	it('U-20 (negative): an area row whose area does not resolve is hidden, never shown unscoped', async () => {
		resolveLocationSlug.mockResolvedValue({});
		expect(await buildSectionQuery(client(), athens, EMPTY_CATEGORY_SCOPE, 'el')).toBeNull();
	});

	it('U-20: one resolved professional is a structured «Τι» (id and slug); several are the first term’s words', async () => {
		resolveSpecialtyScope.mockResolvedValue({
			professionals: [{ id: 'p-psy', slug: 'psychologos', label: 'Ψυχολόγος' }]
		});
		const one = await buildSectionQuery(client(), psychologists, EMPTY_CATEGORY_SCOPE, 'el');
		expect(one?.params.professionalIds).toEqual(['p-psy']);
		expect(one?.criteria.whatSelection).toEqual({
			kind: 'professional',
			label: 'Ψυχολόγος',
			id: 'p-psy',
			slug: 'psychologos'
		});

		resolveSpecialtyScope
			.mockResolvedValueOnce({
				professionals: [{ id: 'p-int', slug: 'pathologos', label: 'Παθολόγος' }]
			})
			.mockResolvedValueOnce({
				professionals: [{ id: 'p-gp', slug: 'genikos', label: 'Γενικός Γιατρός' }]
			});
		const two = await buildSectionQuery(client(), internalMedicine, EMPTY_CATEGORY_SCOPE, 'el');
		expect(two?.params.professionalIds).toEqual(['p-int', 'p-gp']);
		expect(two?.criteria.whatSelection).toEqual({ kind: 'text', label: 'Παθολόγος' });
	});

	it('U-20: the chosen category adds its scope to each row; an unresolved specialty falls back to words', async () => {
		resolveLocationSlug.mockResolvedValue({ locationSlug: 'athina' });
		const scoped = await buildSectionQuery(
			client(),
			athens,
			{
				professionalIds: ['p-derm'],
				professionals: [{ id: 'p-derm', slug: 'dermatologos', label: 'Δερματολόγος' }]
			},
			'el'
		);
		expect(scoped?.params.professionalIds).toEqual(['p-derm']);
		expect(scoped?.criteria.whatSelection).toMatchObject({ kind: 'professional', id: 'p-derm' });

		resolveSpecialtyScope.mockResolvedValue({ textFallback: 'Psychologist' });
		const words = await buildSectionQuery(client(), psychologists, EMPTY_CATEGORY_SCOPE, 'en');
		expect(words?.params).toMatchObject({ text: 'Psychologist', lang: 'en' });
		expect(words?.params.professionalIds).toBeUndefined();
		expect(words?.criteria.whatSelection).toEqual({ kind: 'text', label: 'Psychologist' });
	});
});
