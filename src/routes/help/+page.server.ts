import { getPathnameLocale } from '$shared/preferences/i18n/page-locale';
import { FAQ_PAGE_SLUG } from '$modules/help/config/faq';
import type { HelpFaqSource } from '$modules/help/types';
import { loadContentPage } from '$modules/legal/api/page';
import type { PageServerLoad } from './$types';

/**
 * 🔴 Wave 1.5 · screen 8 (U-60.1): the CMS page `faq` on the server, ONE read through SvelteKit's `fetch`, awaited — the
 * questions and their answers are in the page without JavaScript (the accordions open natively). The search and the
 * topic live in the address (`?q=`, `?topic=`) and are the screen's, so a chip never reads the CMS again. A failure
 * keeps the help centre with its «Δοκιμάστε ξανά» and «Δεν βρήκατε απάντηση;»; a CMS without the page is its «empty».
 */
export const load: PageServerLoad = async ({ fetch, url }) => {
	const result = await loadContentPage(fetch, {
		slug: FAQ_PAGE_SLUG,
		lang: getPathnameLocale(url)
	});
	const faq: HelpFaqSource =
		result.state === 'ready'
			? { state: 'ready', body: result.document.body, language: result.document.language }
			: result.state === 'not-found'
				? { state: 'ready', body: null, language: null }
				: { state: 'failed' };
	return { faq };
};
