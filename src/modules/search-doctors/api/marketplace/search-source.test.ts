import type { QueryClient } from '@tanstack/svelte-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchDoctorsScope } from '$modules/search-doctors/lib/search-query';

const { buildSearchDoctorsParams, searchDoctors, mapCardToFacts } = vi.hoisted(() => ({
	buildSearchDoctorsParams: vi.fn(),
	searchDoctors: vi.fn(),
	mapCardToFacts: vi.fn<(card: unknown, context: unknown) => unknown>(() => ({ id: 'card' }))
}));
vi.mock('./build-search-query', () => ({ buildSearchDoctorsParams }));
vi.mock('./endpoints', () => ({ searchDoctors }));
vi.mock('./card-adapter', () => ({ mapCardToFacts }));

import { fetchSearchResults } from './search-source';
import type { MarketplaceSearchData } from './types';

const queryClient = {} as QueryClient;
const scope: SearchDoctorsScope = {
	what: { kind: 'default' },
	where: { kind: 'default' },
	availability: 'next3Days'
};

function searchData(pageInfo: Record<string, unknown>): MarketplaceSearchData {
	return {
		items: [{ doctorId: 'd1' }, { doctorId: 'd2' }],
		pageInfo,
		pricingVisible: false,
		appliedFilters: {}
	} as unknown as MarketplaceSearchData;
}

// The application's cases (`api/marketplace/search-source/index.unit.spec.ts`), the same titles and assertions. Its
// «installs and returns the active source» has no web twin: the web has no demo source to install (no mock mode).
describe('marketplace::search-source', () => {
	beforeEach(() => {
		buildSearchDoctorsParams
			.mockReset()
			.mockResolvedValue({ availability: 'next3Days', lang: 'en' });
		searchDoctors.mockReset();
		mapCardToFacts.mockClear();
	});

	it('resolves the scope into params, searches, and reports the backend total', async () => {
		searchDoctors.mockResolvedValue(
			searchData({ total: 128, limit: 5, nextCursor: 'c5', hasNextPage: true })
		);

		const result = await fetchSearchResults(queryClient, scope, 'en', { limit: 5 });

		expect(buildSearchDoctorsParams).toHaveBeenCalledWith(queryClient, scope, 'en', undefined);
		// The first page sends the limit but no cursor.
		expect(searchDoctors).toHaveBeenCalledWith(
			{ availability: 'next3Days', lang: 'en', limit: 5 },
			{}
		);
		expect(result.total).toBe(128);
		expect(result.items).toHaveLength(2);
		expect(result).not.toHaveProperty('applied');
	});

	it('threads the cursor + limit into the search and surfaces the page info', async () => {
		searchDoctors.mockResolvedValue(
			searchData({ total: 128, limit: 5, nextCursor: 'c10', hasNextPage: true })
		);

		const result = await fetchSearchResults(queryClient, scope, 'en', { limit: 5, cursor: 'c5' });

		expect(searchDoctors).toHaveBeenCalledWith(
			{ availability: 'next3Days', lang: 'en', limit: 5, cursor: 'c5' },
			{}
		);
		expect(result.nextCursor).toBe('c10');
		expect(result.hasNextPage).toBe(true);
	});

	it('degrades to no further page when the backend omits the cursor fields', async () => {
		searchDoctors.mockResolvedValue(searchData({ total: 128, limit: 5 }));

		const result = await fetchSearchResults(queryClient, scope, 'en', { limit: 5 });

		expect(result.nextCursor).toBeNull();
		expect(result.hasNextPage).toBe(false);
	});

	it('treats total as unknown (null) when the backend pageInfo omits it', async () => {
		searchDoctors.mockResolvedValue(searchData({ limit: 2 }));

		const result = await fetchSearchResults(queryClient, scope, 'en', { limit: 5 });

		expect(result.total).toBeNull();
		expect(result.items).toHaveLength(2);
	});

	it.each([
		[true, true],
		[false, false],
		[undefined, false]
	] as const)(
		'S-34.6: carries totalIsLowerBound %p as %p, with the total as sent',
		async (flag, expected) => {
			searchDoctors.mockResolvedValue(
				searchData({ total: 1000, limit: 1, totalIsLowerBound: flag })
			);

			const result = await fetchSearchResults(queryClient, scope, 'en', { limit: 1 });

			expect(result.total).toBe(1000);
			expect(result.totalIsLowerBound).toBe(expected);
		}
	);

	// U-32.1: the cards are mapped to their FACTS (the page writes them in its language): the pricing gate, no `lang`
	// (the change of this assertion approved by the owner, U-33.1).
	it('U-24.4 (D-103): the map’s facts come with the page’s cards — one read, the cards mapped with the page’s pricing gate', async () => {
		searchDoctors.mockResolvedValue(searchData({ total: 2, limit: 5 }));
		await fetchSearchResults(queryClient, scope, 'el', { limit: 5 });
		expect(searchDoctors).toHaveBeenCalledTimes(1);
		expect(mapCardToFacts).toHaveBeenCalledWith({ doctorId: 'd1' }, { pricingVisible: false });
	});
});
