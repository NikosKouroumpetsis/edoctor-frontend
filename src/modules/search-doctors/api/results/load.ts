import { QueryClient } from '@tanstack/svelte-query';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { SearchDoctorsScope } from '$modules/search-doctors/api/marketplace/build-search-query';
import { SEARCH_RESULTS_PAGE_LIMIT } from '$modules/search-doctors/api/marketplace/search-results';
import {
	fetchSearchResults,
	type SearchDoctorsSearchResults
} from '$modules/search-doctors/api/marketplace/search-source';

/** The results' first page the server drew, with the scope and language it was asked for (the query's key). */
export type ResultsFirstPage = {
	scope: SearchDoctorsScope;
	lang: string;
	page: SearchDoctorsSearchResults;
};

/** What the results route's load hands to its screen. */
export type ResultsPageData = {
	/** The server's first page, or `null` (a client navigation, «Κοντά μου», a failed read: the page asks for it). */
	firstPage: ResultsFirstPage | null;
	/** The server's «now» when it drew the page (D-118), or `null` on a client navigation. */
	serverNow: number | null;
};

/**
 * The results' first page on the server (as the home's rows): the scope the address searches (U-32.1: read by the
 * route with `lib/results-scope` `readResultsScope`), ONE page of five through a request-scoped `QueryClient` (the
 * resolvers' cache) and SvelteKit's `fetch`. It never throws: a failed read is `null` and the page asks again in the
 * browser. «Κοντά μου» has no position on the server (S-07.3 rule 11, web: the address carries none; its scope is
 * `null`), so it always loads in the browser; a client navigation (`clientNavigation`, SvelteKit's `isDataRequest`)
 * asks nothing — the page's own read answers it in place.
 */
export async function loadResultsFirstPage(
	fetchImpl: typeof fetch,
	scope: SearchDoctorsScope | null,
	lang: SupportedLocale,
	{ clientNavigation = false }: { clientNavigation?: boolean } = {}
): Promise<ResultsPageData> {
	if (clientNavigation) return { firstPage: null, serverNow: null };
	const serverNow = Date.now();
	if (!scope) return { firstPage: null, serverNow };
	try {
		const page = await fetchSearchResults(
			new QueryClient(),
			scope,
			lang,
			{ limit: SEARCH_RESULTS_PAGE_LIMIT },
			{ fetch: fetchImpl }
		);
		return { firstPage: { scope, lang, page }, serverNow };
	} catch {
		return { firstPage: null, serverNow };
	}
}
