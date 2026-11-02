import { describe, expect, it } from 'vitest';
import type { MarketplaceLocationSuggestionsData } from './types';
import { mapLocationSuggestionsToFacts } from './location-suggestions-adapter';

// The application's cases (`api/marketplace/location-suggestions-adapter/index.unit.spec.ts`).
function locationSuggestions(items: unknown[]): MarketplaceLocationSuggestionsData {
	return { items, language: 'en' } as unknown as MarketplaceLocationSuggestionsData;
}

const piraeus = {
	slug: 'dimos-peiraia',
	type: 'MUNICIPALITY',
	label: 'Piraeus',
	displayName: 'Municipality of Piraeus',
	context: 'Piraeus, Attica',
	hierarchy: { region: 'Attica', regionalUnit: 'Piraeus', municipality: 'Municipality of Piraeus' },
	latitude: 37.9425,
	longitude: 23.6465
};

describe('marketplace::location-suggestions-adapter', () => {
	it('maps each recognized administrative level to a fact in wire order', () => {
		const facts = mapLocationSuggestionsToFacts(
			locationSuggestions([
				{ ...piraeus, type: 'REGION', slug: 'attiki' },
				{ ...piraeus, type: 'REGIONAL_UNIT', slug: 'pe-peiraios' },
				piraeus,
				{ ...piraeus, type: 'SETTLEMENT', slug: 'neo-faliro' }
			])
		);
		expect(facts.map((fact) => fact.type)).toEqual([
			'REGION',
			'REGIONAL_UNIT',
			'MUNICIPALITY',
			'SETTLEMENT'
		]);
		expect(facts[2]).toEqual(piraeus);
	});

	it('drops items with an unrecognized administrative level', () => {
		const facts = mapLocationSuggestionsToFacts(
			locationSuggestions([{ ...piraeus, type: 'city', slug: 'legacy-city' }, piraeus])
		);
		expect(facts).toHaveLength(1);
		expect(facts[0].slug).toBe('dimos-peiraia');
	});

	it('preserves the null-able context and hierarchy facts', () => {
		const facts = mapLocationSuggestionsToFacts(
			locationSuggestions([
				{
					...piraeus,
					type: 'REGION',
					slug: 'attiki',
					displayName: 'Attica',
					context: null,
					hierarchy: { region: 'Attica', regionalUnit: null, municipality: null }
				}
			])
		);
		expect(facts[0].context).toBeNull();
		expect(facts[0].hierarchy).toEqual({
			region: 'Attica',
			regionalUnit: null,
			municipality: null
		});
	});
});
