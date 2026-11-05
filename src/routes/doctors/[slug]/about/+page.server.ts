import { error } from '@sveltejs/kit';
import { getPathnameLocale } from '$shared/preferences/i18n/page-locale';
import { loadDoctorProfile } from '$modules/doctor/api/profile';
import type { PageServerLoad } from './$types';

/**
 * 🔴 U-73.1 Ε1: the doctor's own page, drawn whole by the server from the profile's ONE read (its language from the
 * path); a doctor nobody may see is a 404, a failed read a 503, as the profile's own route.
 */
export const load: PageServerLoad = async ({ fetch, params, url }) => {
	const result = await loadDoctorProfile(fetch, params.slug, getPathnameLocale(url));
	if (result.state === 'not-found') error(404);
	if (result.state === 'failed') error(503);
	return { load: result };
};
