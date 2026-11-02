import { error } from '@sveltejs/kit';
import { getPathnameLocale } from '$shared/preferences/i18n/page-locale';
import { loadContentPage } from '$modules/legal/api/page';
import { isLegalSlug } from '$modules/shell/lib/legal';
import type { PageServerLoad } from './$types';

/**
 * 🔴 Wave 1.5 · screen 7 (U-59.1): a legal text of the CMS on the server — only the application's three slugs (any
 * other is the site's 404 without a request, MINOR-2 of U-29), ONE read through SvelteKit's `fetch`, so the page is
 * whole without JavaScript. `?edition=upcoming` reads the announced text (the CMS's 404 when none); the language is
 * the path's. The CMS's 404 is the site's 404 (screen 9), any other failure its error page with «Δοκιμάστε ξανά» (U-61.2).
 */
export const load: PageServerLoad = async ({ fetch, params, url }) => {
	if (!isLegalSlug(params.slug)) error(404);
	const edition =
		url.searchParams.get('edition') === 'upcoming' ? ('upcoming' as const) : undefined;
	const result = await loadContentPage(fetch, {
		slug: params.slug,
		lang: getPathnameLocale(url),
		edition
	});
	if (result.state === 'not-found') error(404);
	if (result.state === 'failed') error(503);
	return { slug: params.slug, edition, document: result.document };
};
