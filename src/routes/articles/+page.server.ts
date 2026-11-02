import { getPathnameLocale } from '$shared/preferences/i18n/page-locale';
import {
	isServiceId,
	loadArticlesFirstPage,
	normalizeArticleSearch,
	type ArticlesListScope
} from '$modules/articles/api';
import { articleTypeFromParam } from '$modules/articles/lib/article-list';
import type { PageServerLoad } from './$types';

/**
 * 🔴 Wave 1.5 · screen 6 (U-57.2, U-57.3): the list's first page (12) on the server — ONE read through SvelteKit's
 * `fetch`, so the page is whole without JavaScript. The address holds the view, so a chip is a link and a search is
 * shared: `?type=article|advice` (anything else «Όλα»), `?q=` (the words, as the backend takes them) and `?service=`
 * (a service's id; anything not an id is no filter); the language is the path's. Never throws: a failed read is the
 * page's error with «Δοκιμάστε ξανά».
 */
export const load: PageServerLoad = async ({ fetch, url }) => {
	const service = url.searchParams.get('service');
	const scope: ArticlesListScope = {
		lang: getPathnameLocale(url),
		type: articleTypeFromParam(url.searchParams.get('type')),
		q: normalizeArticleSearch(url.searchParams.get('q')),
		serviceId: isServiceId(service) ? service : null
	};
	return { scope, list: await loadArticlesFirstPage(fetch, scope) };
};
