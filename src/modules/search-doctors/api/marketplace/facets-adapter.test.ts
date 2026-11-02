import { describe, expect, it } from 'vitest';
import { mapFacetsToFilterFacts } from './facets-adapter';
import type { MarketplaceFacetEntry, MarketplaceFacetsData } from './types';

// The application's cases (`api/marketplace/facets-adapter/index.unit.spec.ts`), the same titles and assertions.
function entry(overrides: Partial<MarketplaceFacetEntry> = {}): MarketplaceFacetEntry {
	return { value: 'CASH', label: 'Μετρητά', count: 3, ...overrides };
}

function facetsData(
	facets: Record<string, unknown> = {},
	data: Partial<Omit<MarketplaceFacetsData, 'facets'>> = {}
): MarketplaceFacetsData {
	return {
		pricingVisible: true,
		appliedFilters: {
			language: 'el',
			text: null,
			professionalIds: [],
			professionalSlugs: [],
			serviceSlugs: [],
			locationSlug: null,
			lat: null,
			lng: null,
			availability: 'all',
			paymentOptions: [],
			priceMin: null,
			priceMax: null,
			gender: 'ANY',
			speakLanguageCodes: [],
			disabilityAccess: false,
			parking: false
		},
		facets: {
			paymentOptions: [],
			services: [],
			specialties: [],
			genders: [],
			speakLanguages: [],
			amenities: [],
			priceRange: null,
			countsAreLowerBounds: false,
			...facets
		},
		...data
	} as MarketplaceFacetsData;
}

describe('marketplace::facets-adapter', () => {
	it('maps the happy path: every bucket becomes facts with counts and optional slug', () => {
		const facts = mapFacetsToFilterFacts(
			facetsData({
				paymentOptions: [entry({ value: 'CASH', label: 'Μετρητά', count: 42 })],
				services: [
					entry({ value: 'simple-visit', label: 'Απλή επίσκεψη', count: 7, slug: 'simple-visit' })
				],
				speakLanguages: [entry({ value: 'SL001', label: 'Ελληνικά', count: 100 })],
				amenities: [entry({ value: 'PARKING', label: 'Πάρκινγκ', count: 5 })],
				priceRange: { min: 20, max: 120 }
			})
		);

		expect(facts.paymentOptions).toEqual([{ value: 'CASH', label: 'Μετρητά', count: 42 }]);
		expect(facts.services).toEqual([
			{ value: 'simple-visit', label: 'Απλή επίσκεψη', count: 7, slug: 'simple-visit' }
		]);
		expect(facts.speakLanguages).toEqual([{ value: 'SL001', label: 'Ελληνικά', count: 100 }]);
		expect(facts.amenities).toEqual([{ value: 'PARKING', label: 'Πάρκινγκ', count: 5 }]);
		expect(facts.priceRange).toEqual({ min: 20, max: 120 });
	});

	it('omits the slug key when the backend does not send one', () => {
		const facts = mapFacetsToFilterFacts(
			facetsData({ paymentOptions: [entry({ value: 'CARD', label: 'Κάρτα', count: 1 })] })
		);

		expect(facts.paymentOptions[0]).not.toHaveProperty('slug');
	});

	it('degrades an absent amenities bucket to [] (older backend / deployment skew)', () => {
		expect(mapFacetsToFilterFacts(facetsData({ amenities: undefined })).amenities).toEqual([]);
		expect(mapFacetsToFilterFacts(facetsData({ amenities: null })).amenities).toEqual([]);
	});

	it('keeps a valid price range and drops invalid or absent ones', () => {
		expect(mapFacetsToFilterFacts(facetsData({ priceRange: null })).priceRange).toBeNull();
		expect(
			mapFacetsToFilterFacts(facetsData({ priceRange: { min: 20, max: null } })).priceRange
		).toBeNull();
		expect(
			mapFacetsToFilterFacts(facetsData({ priceRange: { min: null, max: 120 } })).priceRange
		).toBeNull();
		expect(
			mapFacetsToFilterFacts(facetsData({ priceRange: { min: 120, max: 20 } })).priceRange
		).toBeNull();
		expect(
			mapFacetsToFilterFacts(facetsData({ priceRange: { min: 40, max: 40 } })).priceRange
		).toEqual({ min: 40, max: 40 });
	});

	it('passes the pricingVisible gate straight through (guest vs. authorized)', () => {
		expect(mapFacetsToFilterFacts(facetsData({}, { pricingVisible: true })).pricingVisible).toBe(
			true
		);
		expect(mapFacetsToFilterFacts(facetsData({}, { pricingVisible: false })).pricingVisible).toBe(
			false
		);
	});

	it.each([
		[true, true],
		[false, false],
		[undefined, false]
	] as const)('S-34.6: carries countsAreLowerBounds %p as %p', (flag, expected) => {
		expect(
			mapFacetsToFilterFacts(facetsData({ countsAreLowerBounds: flag })).countsAreLowerBounds
		).toBe(expected);
	});
});
