import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { loadHomeArticles } from '$modules/articles/api';
import { buildStreamedHomeArticles } from '$modules/articles/lib/article-card';
import { loadHomeSections, searchDoctorsCategories } from '$modules/search-doctors/api/home';
import { buildStreamedHomeRows } from '$modules/search-doctors/lib/section-link';
import type { PageServerLoad } from './$types';

/**
 * Streamed SSR load for the discovery home.
 *
 * `categories` resolves immediately so the rail renders with the frame. Each home section and the articles are
 * returned as un-awaited promises, so SvelteKit streams them into the document as the backend responds —
 * skeletons while pending (the doctors' rows only), cards once resolved. This is the `all` view; category
 * filtering is handled client-side by `useHomeSections`. «Δοκιμάστε ξανά» asks the failed sections again, in the browser.
 */
export const load: PageServerLoad = async ({ fetch, url }) => {
	const lang = getPageLocale(url);
	// The articles start with the sections' resolvers, not after them (D-103: no waterfall). U-32.1: the api answers
	// facts; the rows and the articles the page shows are built here, on the server, by the modules' libs. U-32.9: every
	// promise returned un-awaited for streaming never rejects (each lib closes its chain with a `catch`).
	const articles = buildStreamedHomeArticles(loadHomeArticles(fetch, lang), lang);

	return {
		categories: searchDoctorsCategories,
		sections: buildStreamedHomeRows(await loadHomeSections(fetch, lang), lang),
		articles,
		// The server's «now»: the browser keeps its difference for the category rows' «Σήμερα / Αύριο» (D-118).
		serverNow: Date.now()
	};
};
