import { describe, expect, it } from 'vitest';
import { marketplaceQueryKeys } from './query-keys';
import { pickReadyLocation, type ReadyLocationLookup } from './suggestions';

// The application's cases (`api/marketplace/query-keys/index.unit.spec.ts`, `use-ready-locations-query` `pickReadyLocation`).
describe('marketplace::query-keys', () => {
	it('keeps the uncapped resolver read and the capped typeahead on distinct keys', () => {
		const resolverKey = marketplaceQueryKeys.suggestions('cardiology', 'en');
		const typeaheadKey = marketplaceQueryKeys.suggestions(
			'cardiology',
			'en',
			['professional', 'service', 'doctor'],
			4
		);
		expect(resolverKey).not.toEqual(typeaheadKey);
		expect(resolverKey).toEqual([
			'search-doctors',
			'marketplace',
			'suggestions',
			'cardiology',
			'en',
			null,
			null
		]);
	});

	it('normalizes the types order so key identity is independent of argument order', () => {
		expect(marketplaceQueryKeys.suggestions('q', 'en', ['doctor', 'professional'], 4)).toEqual(
			marketplaceQueryKeys.suggestions('q', 'en', ['professional', 'doctor'], 4)
		);
	});

	it('defaults the location key coords to null and keeps a proximity read cache-distinct', () => {
		expect(marketplaceQueryKeys.locations('piraeus', 'en')).toEqual([
			'search-doctors',
			'marketplace',
			'locations',
			'piraeus',
			'en',
			null,
			null
		]);
		expect(marketplaceQueryKeys.locations('piraeus', 'en')).not.toEqual(
			marketplaceQueryKeys.locations('piraeus', 'en', 37.98, 23.72)
		);
		expect(marketplaceQueryKeys.locations('piraeus', 'en', 37.98, 23.72)).toEqual([
			'search-doctors',
			'marketplace',
			'locations',
			'piraeus',
			'en',
			37.98,
			23.72
		]);
	});
});

describe('marketplace::pickReadyLocation', () => {
	const lookup: ReadyLocationLookup = {
		name: 'Περιφερειακή Ενότητα Πειραιά',
		type: 'REGIONAL_UNIT'
	};
	const facts = [
		{
			slug: 'server-slug-7',
			type: 'REGIONAL_UNIT' as const,
			label: 'ΠΕΡΙΦΕΡΕΙΑΚΗ ΕΝΟΤΗΤΑ ΠΕΙΡΑΙΑ',
			displayName: 'x',
			context: null,
			hierarchy: { region: null, regionalUnit: null, municipality: null },
			latitude: 0,
			longitude: 0
		}
	];

	it('matches the name with case and accents folded', () => {
		expect(pickReadyLocation(facts, lookup)?.slug).toBe('server-slug-7');
	});

	it('never accepts a row of another level with the same name', () => {
		expect(pickReadyLocation(facts, { ...lookup, type: 'MUNICIPALITY' })).toBeNull();
	});
});
