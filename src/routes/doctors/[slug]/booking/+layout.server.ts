import { error } from '@sveltejs/kit';
import { getPathnameLocale } from '$shared/preferences/i18n/page-locale';
import { loadDoctorProfile } from '$modules/doctor/api/profile';
import type { LayoutServerLoad } from './$types';

/**
 * 🔴 Wave 3 · screens 30, 31 and their «Αλλαγή» screens (P-W3 §3.1): the doctor's public profile through SvelteKit's
 * `fetch`, ONE load shared by every page of the booking (the profile route's own, its language from the path). Review
 * w3-w3 R1 MINOR-6: the language is read without making the load depend on the address (`untrack`), so a move between
 * the booking's pages reads nothing again; another doctor (`params.slug`) does. The booking's pages offer no language
 * switch (the frame shows the mark alone), so another language arrives from another page. A profile nobody may see is
 * a 404, a failed read a 503: the profile's error page. Nothing personal is read here — the person's reads
 * are the browser's, with the cookies (U-80.1 Ε6).
 */
export const load: LayoutServerLoad = async ({ fetch, params, url, untrack }) => {
	const locale = untrack(() => getPathnameLocale(url));
	const result = await loadDoctorProfile(fetch, params.slug, locale);
	if (result.state === 'not-found') error(404);
	if (result.state === 'failed') error(503);
	return { load: result };
};
