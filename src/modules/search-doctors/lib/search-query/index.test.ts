import { describe, expect, it } from 'vitest';
import type { SearchDoctorsCriteria } from '$modules/search-doctors/lib/search-criteria';
import { emptyScopeFilters } from '$modules/search-doctors/api/marketplace/build-search-query';
import { buildSearchDoctorsScope, DEFAULT_SEARCH_AVAILABILITY } from '.';

// The application's cases (`lib/search-query/index.unit.spec.ts`), the same inputs and scopes.
function criteria(overrides: Partial<SearchDoctorsCriteria> = {}): SearchDoctorsCriteria {
	return {
		availability: '',
		what: '',
		where: '',
		whatSelection: null,
		whereSelection: null,
		...overrides
	};
}

describe('search-doctors::search-query', () => {
	it('maps a professional what-selection to a professional scope carrying id and slug', () => {
		expect(
			buildSearchDoctorsScope(
				criteria({
					whatSelection: {
						kind: 'professional',
						label: 'Cardiology',
						id: 'prof-cardiology',
						slug: 'cardiology'
					}
				})
			).what
		).toEqual({
			kind: 'professional',
			professionalId: 'prof-cardiology',
			professionalSlug: 'cardiology'
		});
	});

	it('maps a professional selection without a slug to an id-only professional scope', () => {
		expect(
			buildSearchDoctorsScope(
				criteria({
					whatSelection: { kind: 'professional', label: 'Cardiology', id: 'prof-cardiology' }
				})
			).what
		).toEqual({ kind: 'professional', professionalId: 'prof-cardiology' });
	});

	it('maps a service what-selection to a service scope', () => {
		expect(
			buildSearchDoctorsScope(
				criteria({
					whatSelection: {
						kind: 'service',
						label: 'Video consultation',
						slug: 'video-consultation'
					}
				})
			).what
		).toEqual({ kind: 'service', serviceSlug: 'video-consultation' });
	});

	it('maps a free-text what-selection to a text scope', () => {
		expect(
			buildSearchDoctorsScope(criteria({ whatSelection: { kind: 'text', label: '  knee pain  ' } }))
				.what
		).toEqual({ kind: 'text', text: 'knee pain' });
	});

	it('defaults an empty what-selection, or a professional missing its id, to the default scope', () => {
		expect(buildSearchDoctorsScope(criteria()).what).toEqual({ kind: 'default' });
		expect(
			buildSearchDoctorsScope(
				criteria({ whatSelection: { kind: 'professional', label: 'Cardiology' } })
			).what
		).toEqual({ kind: 'default' });
	});

	it('maps a location where-selection to a location scope, a current-location to a geo scope', () => {
		expect(
			buildSearchDoctorsScope(
				criteria({ whereSelection: { kind: 'location', label: 'Piraeus', slug: 'dimos-peiraia' } })
			).where
		).toEqual({ kind: 'location', locationSlug: 'dimos-peiraia' });
		expect(
			buildSearchDoctorsScope(
				criteria({
					whereSelection: {
						kind: 'current-location',
						label: 'Current location',
						latitude: 37.98,
						longitude: 23.72
					}
				})
			).where
		).toEqual({ kind: 'geo', lat: 37.98, lng: 23.72 });
	});

	it('S-01.3: a free-typed or empty «Πού;» searches the default region (Αττική), never its words', () => {
		expect(
			buildSearchDoctorsScope(criteria({ whereSelection: { kind: 'text', label: 'somewhere' } }))
				.where
		).toEqual({ kind: 'default' });
		expect(buildSearchDoctorsScope(criteria()).where).toEqual({ kind: 'default' });
	});

	it('passes a canonical availability token straight through', () => {
		expect(buildSearchDoctorsScope(criteria({ availability: 'next7Days' })).availability).toBe(
			'next7Days'
		);
	});

	it('U-22 (app = web): an empty or unknown «Πότε;» asks the next three days — the window shows no default', () => {
		expect(DEFAULT_SEARCH_AVAILABILITY).toBe('next3Days');
		expect(buildSearchDoctorsScope(criteria()).availability).toBe('next3Days');
		expect(buildSearchDoctorsScope(criteria({ availability: 'bogus' })).availability).toBe(
			'next3Days'
		);
	});

	it('NIT-2 (U-29): the default filters’ scope is the api’s empty scope filters — ONE «no filter», never two', () => {
		const scope = buildSearchDoctorsScope({
			...criteria(),
			whatSelection: null,
			whereSelection: null
		});
		expect(scope.filters).toEqual(emptyScopeFilters);
	});
});
