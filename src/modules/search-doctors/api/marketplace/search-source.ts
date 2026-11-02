import type { QueryClient } from '@tanstack/svelte-query';
import type { SearchDoctorsScope } from './build-search-query';
import { buildSearchDoctorsParams } from './build-search-query';
import { mapCardToFacts } from './card-adapter';
import { searchDoctors } from './endpoints';
import type { MarketplaceRequestContext, SearchDoctorsCardFacts } from './types';

/** One page request: how many cards, and the opaque cursor of the page to start at (none: the first). */
export type SearchResultsPage = { limit: number; cursor?: string };

/**
 * One page of a submitted search as FACTS (the application's `SearchDoctorsSearchResults`, U-32.1): the server's
 * total (`null` from an older backend) and whether it is only a lower bound (S-34.6), the cards' facts (the results
 * page builds their words, `lib/doctor-card`), the next page's cursor (`null`: none).
 */
export type SearchDoctorsSearchResults = {
	total: number | null;
	totalIsLowerBound: boolean;
	items: SearchDoctorsCardFacts[];
	nextCursor: string | null;
	hasNextPage: boolean;
};

/**
 * 🔴 The application's `backendSearchResultsSource.fetchSearchResults` (S-01.6, the same read): the scope resolved to
 * its parameters, ONE marketplace search of one page. A backend older than the contract may omit `pageInfo.total`
 * or `totalIsLowerBound` (the web's vendored contract predates the flag): an unknown total, an exact one — never NaN.
 */
export async function fetchSearchResults(
	queryClient: QueryClient,
	scope: SearchDoctorsScope,
	lang: string,
	page: SearchResultsPage,
	context: MarketplaceRequestContext = {}
): Promise<SearchDoctorsSearchResults> {
	const scopeParams = await buildSearchDoctorsParams(queryClient, scope, lang, context.fetch);
	// The page: `limit` always, `cursor` only from the second page on.
	const params = {
		...scopeParams,
		limit: page.limit,
		...(page.cursor ? { cursor: page.cursor } : {})
	};
	const result = await searchDoctors(params, context);
	const pageInfo = result.pageInfo as typeof result.pageInfo & { totalIsLowerBound?: unknown };
	const reportedTotal: unknown = pageInfo.total;

	return {
		total: typeof reportedTotal === 'number' ? reportedTotal : null,
		totalIsLowerBound: pageInfo.totalIsLowerBound === true,
		items: result.items.map((card) =>
			mapCardToFacts(card, { pricingVisible: result.pricingVisible })
		),
		nextCursor: pageInfo.nextCursor ?? null,
		hasNextPage: Boolean(pageInfo.hasNextPage)
	};
}
