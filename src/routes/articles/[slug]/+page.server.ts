import { error } from '@sveltejs/kit';
import { getPathnameLocale } from '$shared/preferences/i18n/page-locale';
import { loadArticle } from '$modules/articles/api';
import type { PageServerLoad } from './$types';

/**
 * 🔴 Wave 1.5 · screen 6 (U-57.4): one article on the server — the article and «Περισσότερα άρθρα» read at once
 * through SvelteKit's `fetch`, so the page is whole without JavaScript and its `<head>` speaks for it (U-28.4). The
 * language is the path's. A slug nobody published is the site's 404 (screen 9, U-61.1), a failed read its error page with «Δοκιμάστε
 * ξανά».
 */
export const load: PageServerLoad = async ({ fetch, params, url }) => {
	const result = await loadArticle(fetch, params.slug, getPathnameLocale(url));
	if (result.state === 'not-found') error(404);
	if (result.state === 'failed') error(503);
	return { article: result.article, related: result.related };
};
