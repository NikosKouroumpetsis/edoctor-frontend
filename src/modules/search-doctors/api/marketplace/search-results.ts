import {
	infiniteQueryOptions,
	keepPreviousData,
	queryOptions,
	type QueryClient
} from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import type { SearchDoctorsScope } from './build-search-query';
import { mapFacetsToFilterFacts } from './facets-adapter';
import { fetchFilterFacets } from './facets-source';
import { marketplaceQueryKeys } from './query-keys';
import { fetchSearchResults } from './search-source';

/**
 * The results' reads, the application's query hooks (`use-search-results-infinite-query`,
 * `use-search-results-count-query`, `use-filter-facets-query`) as TanStack query options: the same keys, sizes and
 * windows; the page's hooks run them (D-103: at the reader's action, never after a motion).
 */

/**
 * How many cards each page of the results fetches (the application's `SEARCH_RESULTS_PAGE_SIZE`, 5). The web names
 * it `_LIMIT` (the request's `limit`): its scale guard reads every `*_SIZE = n` as a size in pixels.
 */
export const SEARCH_RESULTS_PAGE_LIMIT = 5;

/** The live count reads one card: only its `total` and lower-bound flag count. */
const COUNT_PROBE_LIMIT = 1;

/** Facets hold while the filters' window is open (the application's `FILTER_FACETS_STALE_TIME`). */
const FILTER_FACETS_STALE_TIME = 5 * 60 * 1000;

/**
 * 🔴 A submitted search as an INFINITE (cursor) read: each page five cards, the next by the page's `nextCursor`
 * while `hasNextPage` holds; the scope hashed into the key, so a new search starts at page one. 🔴 U-34.4: a member's
 * pages come with the cookies and hold amounts: they live on a key of their own, and go at a sign-out; a guest's never
 * show them.
 */
export function searchResultsInfiniteQuery(
	queryClient: QueryClient,
	scope: SearchDoctorsScope,
	lang: string,
	withSession = false
) {
	return infiniteQueryOptions({
		queryKey: [
			...marketplaceQueryKeys.searchResultsInfinite(scope, lang),
			withSession ? 'member' : 'guest'
		] as const,
		meta: withSession ? personalQueryMeta : undefined,
		queryFn: ({ pageParam, signal }) =>
			fetchSearchResults(
				queryClient,
				scope,
				lang,
				{ cursor: pageParam, limit: SEARCH_RESULTS_PAGE_LIMIT },
				withSession ? { signal, withSession } : { signal }
			),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) =>
			lastPage.hasNextPage ? (lastPage.nextCursor ?? undefined) : undefined
	});
}

/**
 * 🔴 U-34.4: the first page once more, for a member, with the session's cookies: the server drew it for a guest, so this
 * ONE read brings the amounts: never again by itself (no focus, no reconnect). Never for a guest, and nothing else
 * depends on it: a failure leaves the words as they are.
 */
export function memberFirstPageQuery(
	queryClient: QueryClient,
	scope: SearchDoctorsScope,
	lang: string
) {
	return queryOptions({
		queryKey: [...marketplaceQueryKeys.searchResultsInfinite(scope, lang), 'member-first'] as const,
		meta: personalQueryMeta,
		queryFn: ({ signal }) =>
			fetchSearchResults(
				queryClient,
				scope,
				lang,
				{ limit: SEARCH_RESULTS_PAGE_LIMIT },
				{ signal, withSession: true }
			),
		staleTime: 60_000,
		retry: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	});
}

/**
 * The filters' live count: a one-card search over the whole scope (criteria + the debounced draft); the last count
 * stays while the next one loads (`keepPreviousData`). `total` is `null` from an older backend, «N+» on a lower bound.
 */
export function searchResultsCountQuery(
	queryClient: QueryClient,
	scope: SearchDoctorsScope,
	lang: string
) {
	return queryOptions({
		queryKey: marketplaceQueryKeys.searchResultsCount(scope, lang),
		queryFn: ({ signal }) =>
			fetchSearchResults(queryClient, scope, lang, { limit: COUNT_PROBE_LIMIT }, { signal }),
		placeholderData: keepPreviousData,
		select: ({ total, totalIsLowerBound }) => ({ total, totalIsLowerBound })
	});
}

/** The filters' facets and pricing gate, scoped by the CRITERIA (`scope` with empty filters), as facts. */
export function filterFacetsQuery(
	queryClient: QueryClient,
	scope: SearchDoctorsScope,
	lang: string
) {
	return queryOptions({
		queryKey: marketplaceQueryKeys.filterFacets(scope, lang),
		queryFn: ({ signal }) => fetchFilterFacets(queryClient, scope, lang, { signal }),
		staleTime: FILTER_FACETS_STALE_TIME,
		select: mapFacetsToFilterFacts
	});
}
