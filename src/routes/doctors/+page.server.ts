import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { loadResultsFirstPage } from '$modules/search-doctors/api/results';
import { readResultsScope } from '$modules/search-doctors/lib/results-scope';
import type { PageServerLoad } from './$types';

/**
 * The results' first page on the server (U-24, §7.7): the address's criteria and filters (their scope, read by the
 * results' readers; the server has no position, U-32.1), ONE page of five, so the first paint already has its cards;
 * the map is the browser's alone. A client navigation (a new filter, a new search: `isDataRequest`) asks nothing
 * here — the page's own read answers it in place, without a round trip.
 * D-103 (MINOR-7 of r1): the query is read UNTRACKED, so a new filter or search after the first paint never waits
 * for this load again (the page's read starts at the press; its first page seeds only its own key).
 */
export const load: PageServerLoad = async ({ fetch, url, isDataRequest, untrack }) =>
	loadResultsFirstPage(
		fetch,
		untrack(() => readResultsScope(new URLSearchParams(url.search), null)),
		getPageLocale(url),
		{ clientNavigation: isDataRequest }
	);
