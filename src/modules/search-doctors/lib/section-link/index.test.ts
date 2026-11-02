import { describe, expect, it } from 'vitest';
import type { StreamedHomeSection } from '$modules/search-doctors/api/home/load';
import type {
	SearchDoctorsCardFacts,
	SearchDoctorsSectionLink
} from '$modules/search-doctors/api/marketplace/types';
import { searchResultsHref } from '$modules/search-doctors/lib/search-criteria';
import { buildHomeSection, buildSectionCriteria, buildStreamedHomeRows } from '.';

// The server's «now»: Saturday 24 October 2026, 12:00 in Athens.
const NOW = Date.parse('2026-10-24T12:00:00+03:00');

const card = (id: string): SearchDoctorsCardFacts => ({
	id,
	doctorSlug: `dr-${id}`,
	name: `Γιατρός ${id}`,
	professionalName: 'Ψυχολόγος',
	imageUrl: null,
	office: { city: 'Αθήνα', street: null, streetNumber: null, distanceKm: null },
	point: null,
	description: null,
	availability: {
		nextAvailableAt: '2026-10-24T17:30:00+03:00',
		hasToday: true,
		hasNext3Days: true
	},
	rating: 4.8,
	reviewCount: 12,
	pricingVisible: false,
	primaryServicePrice: null,
	readAt: NOW
});

const psychologists: SearchDoctorsSectionLink = {
	availability: 'next7Days',
	what: { kind: 'professional', label: 'Ψυχολόγος', id: 'p-psy', slug: 'psychologos' },
	where: { kind: 'location', label: 'Αθήνα', slug: 'athina', locationType: 'municipality' }
};

// 🔴 U-32.1: the api answers a row's facts (its cards and its link); the home's words and criteria are built here.
describe('search-doctors::lib::section-link', () => {
	it('U-32.1: a row’s link is the results’ criteria — the «Τι» and «Πού» by their words, the selections, the availability; the same address as before', () => {
		const criteria = buildSectionCriteria(psychologists);
		expect(criteria).toEqual({
			availability: 'next7Days',
			what: 'Ψυχολόγος',
			where: 'Αθήνα',
			whatSelection: { kind: 'professional', label: 'Ψυχολόγος', id: 'p-psy', slug: 'psychologos' },
			whereSelection: {
				kind: 'location',
				label: 'Αθήνα',
				slug: 'athina',
				locationType: 'municipality'
			}
		});
		const href = searchResultsHref('/doctors', criteria);
		expect(href).toContain('whatId=p-psy');
		expect(href).toContain('whereSlug=athina');
		expect(
			buildSectionCriteria({
				availability: 'next7Days',
				what: { kind: 'text', label: 'Παθολόγος' },
				where: null
			})
		).toMatchObject({ what: 'Παθολόγος', where: '', whereSelection: null });
	});

	it('U-32.1: a home row from its facts — the cards in the page’s language, the «→» criteria; a row without a link opens none', () => {
		const row = buildHomeSection(
			{ id: 'popular-psychologists', items: [card('1')], link: psychologists },
			'el'
		);
		expect(row.id).toBe('popular-psychologists');
		expect(row.doctors).toEqual([
			expect.objectContaining({
				name: 'Γιατρός 1',
				specialty: 'Ψυχολόγος',
				area: 'Αθήνα',
				availabilityLabel: 'Σήμερα · 17:30',
				ratingLabel: '4,8'
			})
		]);
		expect(row.criteria).toEqual(buildSectionCriteria(psychologists));
		expect(buildHomeSection({ id: 'popular-athens', items: [], link: null }, 'en')).toEqual({
			id: 'popular-athens',
			doctors: [],
			criteria: null
		});
	});

	it('U-32.1 (negative): the streamed rows stay promises that never reject — a failed row is still the error, in its place', async () => {
		const sections: StreamedHomeSection[] = [
			{
				id: 'popular-athens',
				result: Promise.resolve({ status: 'ok', items: [card('a')], link: null })
			},
			{ id: 'popular-psychologists', result: Promise.resolve({ status: 'error' }) }
		];
		const rows = buildStreamedHomeRows(sections, 'en');
		expect(rows.map((row) => row.id)).toEqual(['popular-athens', 'popular-psychologists']);
		await expect(rows[0].result).resolves.toMatchObject({
			status: 'ok',
			criteria: null,
			doctors: [expect.objectContaining({ availabilityLabel: 'Today · 17:30' })]
		});
		await expect(rows[1].result).resolves.toEqual({ status: 'error' });
	});

	// 🔴 U-32.9: the builder runs inside the streamed chain on the server; a throw there must never reject it.
	it('U-32.9: a row the builder cannot write is the error — `buildStreamedHomeRows` never rejects, nothing goes unhandled', async () => {
		const rejections: unknown[] = [];
		const record = (reason: unknown) => rejections.push(reason);
		process.on('unhandledRejection', record);
		try {
			const odd = { ...card('x'), availability: undefined } as unknown as SearchDoctorsCardFacts;
			const rows = buildStreamedHomeRows(
				[
					{
						id: 'popular-athens',
						result: Promise.resolve({ status: 'ok', items: [odd], link: null })
					},
					{ id: 'popular-psychologists', result: Promise.reject(new Error('rejected after all')) },
					{
						id: 'internal-medicine-gp',
						result: Promise.resolve({ status: 'ok', items: [card('b')], link: psychologists })
					}
				],
				'el'
			);
			await expect(rows[0].result).resolves.toEqual({ status: 'error' });
			await expect(rows[1].result).resolves.toEqual({ status: 'error' });
			// The usual way is as before.
			await expect(rows[2].result).resolves.toMatchObject({
				status: 'ok',
				criteria: buildSectionCriteria(psychologists),
				doctors: [
					expect.objectContaining({ name: 'Γιατρός b', availabilityLabel: 'Σήμερα · 17:30' })
				]
			});
			await new Promise((resolve) => setTimeout(resolve, 10));
		} finally {
			process.off('unhandledRejection', record);
		}
		expect(rejections).toEqual([]);
	});
});
