/**
 * Query keys for cached marketplace resolver reads (facets, suggestions, locations).
 * These back the `queryClient.fetchQuery` calls in `resolvers.ts` so repeated slug/id
 * resolution across sections reuses one cached network response.
 */
export const marketplaceQueryKeys = {
	all: ['search-doctors', 'marketplace'] as const,
	facets: (lang?: string) => [...marketplaceQueryKeys.all, 'facets', lang ?? null] as const,
	suggestions: (query: string, lang?: string) =>
		[...marketplaceQueryKeys.all, 'suggestions', query, lang ?? null] as const,
	locations: (query: string, lang?: string) =>
		[...marketplaceQueryKeys.all, 'locations', query, lang ?? null] as const
};
