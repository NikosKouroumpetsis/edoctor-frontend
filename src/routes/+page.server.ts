import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { loadHomeSections, searchDoctorsCategories } from '$modules/search-doctors/api/home';
import type { PageServerLoad } from './$types';

/**
 * Streamed SSR load for the discovery home.
 *
 * `categories` resolves immediately so the rail renders with the shell. Each home section
 * is returned as an un-awaited promise (`loadHomeSections`), so SvelteKit streams them
 * into the document and they reveal serially as the backend responds — skeleton while
 * pending, cards once resolved. This is the `all` view; category filtering is handled
 * client-side by `useHomeSections`.
 */
export const load: PageServerLoad = async ({ fetch, url }) => {
	const lang = getPageLocale(url);

	return {
		categories: searchDoctorsCategories,
		sections: await loadHomeSections(fetch, lang)
	};
};
