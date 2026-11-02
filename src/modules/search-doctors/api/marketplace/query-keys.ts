import type { MarketplaceSuggestionType } from './types';

/**
 * Query keys for cached marketplace reads (facets, suggestions, locations), the application's `marketplaceQueryKeys`.
 * They back both the resolvers' `queryClient.fetchQuery` (one cached response for repeated slug/id resolution) and
 * the search's live typeaheads. `suggestions` folds `types`/`limitPerType` in, so the capped «Τι;» typeahead never
 * shares a cache entry with the resolvers' uncapped read of the same words; `locations` folds the optional device
 * `lat`/`lng` in, so the proximity-ranked «Πού;» read stays apart from the relevance-only one (both `null` without).
 */
export const marketplaceQueryKeys = {
	all: ['search-doctors', 'marketplace'] as const,
	facets: (lang?: string) => [...marketplaceQueryKeys.all, 'facets', lang ?? null] as const,
	suggestions: (
		query: string,
		lang?: string,
		types?: MarketplaceSuggestionType[],
		limitPerType?: number
	) =>
		[
			...marketplaceQueryKeys.all,
			'suggestions',
			query,
			lang ?? null,
			types ? [...types].sort() : null,
			limitPerType ?? null
		] as const,
	locations: (query: string, lang?: string, lat?: number, lng?: number) =>
		[
			...marketplaceQueryKeys.all,
			'locations',
			query,
			lang ?? null,
			lat ?? null,
			lng ?? null
		] as const,
	/**
	 * A submitted search's pages (infinite, by cursor): the scope (criteria + filters), hashed deterministically by
	 * TanStack, so an equal scope reuses its entry and a new search starts at page one (the application's key).
	 */
	searchResultsInfinite: (scope: unknown, lang?: string) =>
		[...marketplaceQueryKeys.all, 'search-results-infinite', scope, lang ?? null] as const,
	/** The filters' facets, scoped by the CRITERIA only (empty filters): stable while the draft changes. */
	filterFacets: (scope: unknown, lang?: string) =>
		[...marketplaceQueryKeys.all, 'filter-facets', scope, lang ?? null] as const,
	/** The filters' live count: a one-card search over the whole scope (criteria + the draft). */
	searchResultsCount: (scope: unknown, lang?: string) =>
		[...marketplaceQueryKeys.all, 'search-results-count', scope, lang ?? null] as const
};
