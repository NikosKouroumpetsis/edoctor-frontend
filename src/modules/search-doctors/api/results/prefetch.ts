import { hashKey, type QueryClient } from '@tanstack/svelte-query';
import type { SearchDoctorsScope } from '$modules/search-doctors/api/marketplace/build-search-query';
import { searchResultsInfiniteQuery } from '$modules/search-doctors/api/marketplace/search-results';

/**
 * A press that goes to the results (U-32.1: read from its address by `lib/results-scope` `readResultsPress`): the
 * scope it searches (`null`: «Κοντά μου» without this visit's position) and the scope of the page already shown
 * (`null`: another page).
 */
export type ResultsPress = {
	scope: SearchDoctorsScope | null;
	shown: SearchDoctorsScope | null;
};

/**
 * 🔴 D-103 (MINOR-7 of r1): the results' first page is asked AT THE PRESS that goes there (a search, a filter), not
 * after SvelteKit's round trip for the page's data. The scope comes from the very address the press goes to, read by
 * the page's own readers (`readResultsPress`), so the page's read finds this one (the same key: one request).
 * «Κοντά μου» without this visit's position asks nothing (the page asks the device). NIT-r2-2: a press to the address
 * already shown (`shown`: the filters applied unchanged, the same search) asks nothing either — the page's own read
 * holds that key, and a prefetch of a key past its 30″ would fetch every page it has loaded again.
 */
export function prefetchSearchResults(
	queryClient: QueryClient,
	{ scope, shown }: ResultsPress,
	lang: string
): void {
	if (!scope) return;
	if (shown && hashKey([shown]) === hashKey([scope])) return;
	void queryClient.prefetchInfiniteQuery(searchResultsInfiniteQuery(queryClient, scope, lang));
}
