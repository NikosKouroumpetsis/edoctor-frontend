import { error } from '@sveltejs/kit';
import { getPathnameLocale } from '$shared/preferences/i18n/page-locale';
import { loadDoctorProfile } from '$modules/doctor/api/profile';
import type { PageServerLoad } from './$types';

/**
 * 🔴 Wave 1.5 · screen 5 (U-28.4): the profile on the server — ONE read through SvelteKit's `fetch`, so the page is
 * whole without JavaScript and its `<head>` speaks for it. The language is the address's path (MAJOR-1 of r1: a
 * change of language reads again; the query is never read, so a window's `?office=` asks nothing). A profile nobody
 * may see is a 404, a failed read a 503 (MINOR-6 of r1): the profile's error page, never indexed.
 */
export const load: PageServerLoad = async ({ fetch, params, url }) => {
	const result = await loadDoctorProfile(fetch, params.slug, getPathnameLocale(url));
	if (result.state === 'not-found') error(404);
	if (result.state === 'failed') error(503);
	return { load: result };
};
