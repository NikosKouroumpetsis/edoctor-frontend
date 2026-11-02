import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchSearchResults } = vi.hoisted(() => ({ fetchSearchResults: vi.fn() }));
vi.mock('$modules/search-doctors/api/marketplace/search-source', async (importOriginal) => ({
	...(await importOriginal<
		typeof import('$modules/search-doctors/api/marketplace/search-source')
	>()),
	fetchSearchResults
}));

import { readResultsScope } from '$modules/search-doctors/lib/results-scope';
import { loadResultsFirstPage as loadFirstPage } from './load';

/**
 * 🔴 U-32.1: the api reads the scope it is given; the route reads it off the address with the results' readers
 * (`readResultsScope`, the server without a position). The guards below read the two together, as the route does.
 */
const loadResultsFirstPage = (
	fetchImpl: typeof fetch,
	searchParams: URLSearchParams,
	lang: 'el' | 'en',
	options?: { clientNavigation?: boolean }
) => loadFirstPage(fetchImpl, readResultsScope(searchParams, null), lang, options);

const page = {
	total: 1,
	totalIsLowerBound: false,
	items: [],
	nextCursor: null,
	hasNextPage: false
};
const serverFetch = vi.fn() as unknown as typeof fetch;

describe('search-doctors::api::results::loadResultsFirstPage', () => {
	// A block, not an arrow's value: a function returned by `beforeEach` is run as the test's teardown.
	beforeEach(() => {
		fetchSearchResults.mockReset();
	});

	it('SSR (U-24): the first page of five comes from the server, for the address’s criteria and filters, with SvelteKit’s fetch', async () => {
		fetchSearchResults.mockResolvedValue(page);
		const data = await loadResultsFirstPage(
			serverFetch,
			new URLSearchParams(
				'what=Καρδιολόγος&whatKind=professional&whatId=p1&whatSlug=kardiologos&whatLabel=Καρδιολόγος&gender=FEMALE'
			),
			'el'
		);
		expect(fetchSearchResults).toHaveBeenCalledTimes(1);
		const [, scope, lang, request, context] = fetchSearchResults.mock.calls[0];
		expect(scope.what).toEqual({
			kind: 'professional',
			professionalId: 'p1',
			professionalSlug: 'kardiologos'
		});
		expect(scope.filters.gender).toBe('FEMALE');
		expect([lang, request, context]).toEqual(['el', { limit: 5 }, { fetch: serverFetch }]);
		expect(data.firstPage).toEqual({ scope, lang: 'el', page });
		expect(typeof data.serverNow).toBe('number');
	});

	it('S-32.2 (web): a «Κοντά μου» link without a position never searches Αττική — the server asks nothing, the browser finds the position', async () => {
		const data = await loadResultsFirstPage(
			serverFetch,
			new URLSearchParams('where=Κοντά μου&whereKind=current-location&whereLabel=Κοντά μου'),
			'el'
		);
		expect(fetchSearchResults).not.toHaveBeenCalled();
		expect(data.firstPage).toBeNull();
	});

	it('S-07.3 (κανόνας 11, web): an old link with coordinates is still «Κοντά μου» without them — nothing searched by the link’s point', async () => {
		const data = await loadResultsFirstPage(
			serverFetch,
			new URLSearchParams(
				'where=Κοντά μου&whereKind=current-location&whereLabel=Κοντά μου&whereLat=37.943&whereLng=23.647'
			),
			'el'
		);
		expect(fetchSearchResults).not.toHaveBeenCalled();
		expect(data.firstPage).toBeNull();
	});

	it('SSR (U-24): a client navigation (a new filter or search) asks the server nothing — the page reads in place', async () => {
		const data = await loadResultsFirstPage(
			serverFetch,
			new URLSearchParams('what=Καρδιολόγος&gender=FEMALE'),
			'el',
			{ clientNavigation: true }
		);
		expect(fetchSearchResults).not.toHaveBeenCalled();
		expect(data).toEqual({ firstPage: null, serverNow: null });
	});

	it('SSR (negative): a failed read never throws — the page asks again in the browser', async () => {
		fetchSearchResults.mockRejectedValue(new Error('down'));
		const data = await loadResultsFirstPage(serverFetch, new URLSearchParams(), 'el');
		expect(data.firstPage).toBeNull();
	});
});
