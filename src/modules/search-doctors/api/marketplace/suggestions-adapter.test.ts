import { describe, expect, it } from 'vitest';
import type { MarketplaceFacetsData, MarketplaceSuggestionsData } from './types';
import { mapFacetsToPopularSpecialties, mapSuggestionsToFacts } from './suggestions-adapter';

// The application's cases (`api/marketplace/suggestions-adapter/index.unit.spec.ts`), the same inputs and results.
function suggestions(items: unknown[]): MarketplaceSuggestionsData {
	return { items, language: 'en' } as unknown as MarketplaceSuggestionsData;
}

function facetsWith(specialties: unknown): MarketplaceFacetsData {
	return {
		pricingVisible: false,
		appliedFilters: {},
		facets: {
			paymentOptions: [],
			services: [],
			genders: [],
			speakLanguages: [],
			priceRange: null,
			specialties
		}
	} as unknown as MarketplaceFacetsData;
}

describe('marketplace::suggestions-adapter', () => {
	it('maps each recognized kind and keeps the doctor supporting label', () => {
		expect(
			mapSuggestionsToFacts(
				suggestions([
					{ type: 'professional', id: 'prof-1', slug: 'cardiology', label: 'Cardiology' },
					{ type: 'service', id: 'svc-1', slug: 'video-consultation', label: 'Video consultation' },
					{
						type: 'doctor',
						id: 'doc-1',
						slug: 'dr-x',
						label: 'Dr X',
						supportingLabel: 'Cardiology'
					}
				])
			)
		).toEqual([
			{ kind: 'professional', id: 'prof-1', slug: 'cardiology', label: 'Cardiology' },
			{ kind: 'service', id: 'svc-1', slug: 'video-consultation', label: 'Video consultation' },
			{ kind: 'doctor', id: 'doc-1', slug: 'dr-x', label: 'Dr X', supportingLabel: 'Cardiology' }
		]);
	});

	it('drops items with an unrecognized kind', () => {
		const facts = mapSuggestionsToFacts(
			suggestions([
				{ type: 'clinic', id: 'c-1', slug: 'clinic-x', label: 'Clinic X' },
				{ type: 'professional', id: 'prof-1', slug: 'cardiology', label: 'Cardiology' }
			])
		);
		expect(facts).toHaveLength(1);
		expect(facts[0].id).toBe('prof-1');
	});

	it('maps the top N specialty buckets to professional facts', () => {
		expect(
			mapFacetsToPopularSpecialties(
				facetsWith([
					{ value: 'prof-1', label: 'Cardiology', count: 40 },
					{ value: 'prof-2', label: 'Pediatrics', count: 30 },
					{ value: 'prof-3', label: 'Dermatology', count: 20 }
				]),
				2
			)
		).toEqual([
			{ kind: 'professional', id: 'prof-1', label: 'Cardiology' },
			{ kind: 'professional', id: 'prof-2', label: 'Pediatrics' }
		]);
	});

	it('adopts the optional bucket slug when present and omits it otherwise', () => {
		expect(
			mapFacetsToPopularSpecialties(
				facetsWith([
					{ value: 'prof-1', slug: 'cardiology', label: 'Cardiology', count: 40 },
					{ value: 'prof-2', label: 'Pediatrics', count: 30 }
				]),
				6
			)
		).toEqual([
			{ kind: 'professional', id: 'prof-1', slug: 'cardiology', label: 'Cardiology' },
			{ kind: 'professional', id: 'prof-2', label: 'Pediatrics' }
		]);
	});

	it('is absent-safe: yields an empty list when the specialties bucket is missing', () => {
		expect(mapFacetsToPopularSpecialties(facetsWith(undefined), 6)).toEqual([]);
	});
});
