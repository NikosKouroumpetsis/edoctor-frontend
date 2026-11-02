import { InfiniteQueryObserver, QueryClient } from '@tanstack/svelte-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchDoctorsScope } from '$modules/search-doctors/lib/search-query';
import type { SearchDoctorsSearchResults } from './search-source';

const { fetchSearchResults } = vi.hoisted(() => ({ fetchSearchResults: vi.fn() }));
vi.mock('./search-source', () => ({ fetchSearchResults }));

import { marketplaceQueryKeys } from './query-keys';
import { SEARCH_RESULTS_PAGE_LIMIT, searchResultsInfiniteQuery } from './search-results';

const scope: SearchDoctorsScope = {
	what: { kind: 'default' },
	where: { kind: 'default' },
	availability: 'next3Days'
};

function page(overrides: Partial<SearchDoctorsSearchResults>): SearchDoctorsSearchResults {
	return {
		total: 128,
		totalIsLowerBound: false,
		items: [],
		nextCursor: null,
		hasNextPage: false,
		...overrides
	};
}

// The application's cases (`use-search-results-infinite-query/index.unit.spec.tsx` and the query-keys spec), the same
// titles; the web runs the query options through an observer of a real client, as the page's hook does.
describe('marketplace::searchResultsInfiniteQuery', () => {
	let client: QueryClient;
	let destroy: (() => void) | undefined;

	beforeEach(() => {
		fetchSearchResults.mockReset();
		client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
	});

	afterEach(() => {
		destroy?.();
		destroy = undefined;
		client.clear();
	});

	function observe() {
		const created = new InfiniteQueryObserver(
			client,
			searchResultsInfiniteQuery(client, scope, 'en')
		);
		destroy = () => created.destroy();
		const unsubscribe = created.subscribe(() => {});
		return { observer: created, unsubscribe };
	}

	it('encodes the submitted scope and language into the infinite search-results key', () => {
		expect(marketplaceQueryKeys.searchResultsInfinite(scope, 'el')).toEqual([
			'search-doctors',
			'marketplace',
			'search-results-infinite',
			scope,
			'el'
		]);
		expect(marketplaceQueryKeys.searchResultsInfinite(scope)).toEqual([
			'search-doctors',
			'marketplace',
			'search-results-infinite',
			scope,
			null
		]);
	});

	it('fetches the first page with the page size and no cursor', async () => {
		fetchSearchResults.mockResolvedValue(page({ items: [], nextCursor: '5', hasNextPage: true }));
		const { observer: query, unsubscribe } = observe();

		await vi.waitFor(() => expect(query.getCurrentResult().isSuccess).toBe(true));

		expect(fetchSearchResults).toHaveBeenCalledWith(
			client,
			scope,
			'en',
			{ cursor: undefined, limit: SEARCH_RESULTS_PAGE_LIMIT },
			{ signal: expect.anything() }
		);
		expect(query.getCurrentResult().hasNextPage).toBe(true);
		unsubscribe();
	});

	it('advances by the returned nextCursor when fetching the next page', async () => {
		fetchSearchResults.mockImplementation((_client, _scope, _lang, requested) =>
			Promise.resolve(
				requested.cursor === '5'
					? page({ nextCursor: null, hasNextPage: false })
					: page({ nextCursor: '5', hasNextPage: true })
			)
		);
		const { observer: query, unsubscribe } = observe();
		await vi.waitFor(() => expect(query.getCurrentResult().isSuccess).toBe(true));

		const next = await query.fetchNextPage();

		expect(next.data?.pages).toHaveLength(2);
		expect(fetchSearchResults).toHaveBeenLastCalledWith(
			client,
			scope,
			'en',
			{ cursor: '5', limit: SEARCH_RESULTS_PAGE_LIMIT },
			{ signal: expect.anything() }
		);
		expect(next.hasNextPage).toBe(false);
		unsubscribe();
	});

	it('stops paginating once the source reports no further page', async () => {
		fetchSearchResults.mockResolvedValue(page({ nextCursor: null, hasNextPage: false }));
		const { observer: query, unsubscribe } = observe();
		await vi.waitFor(() => expect(query.getCurrentResult().isSuccess).toBe(true));

		expect(query.getCurrentResult().hasNextPage).toBe(false);
		unsubscribe();
	});
});
