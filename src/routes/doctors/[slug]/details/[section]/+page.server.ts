import { error } from '@sveltejs/kit';
import { getPathnameLocale } from '$shared/preferences/i18n/page-locale';
import { loadDoctorProfile } from '$modules/doctor/api/profile';
import { isDoctorDetailSection } from '$modules/doctor/lib/detail';
import type { PageServerLoad } from './$types';

/**
 * 🔴 Π7: a window's own address (the application's `details/[section]`) — the profile read as on its own page (its
 * language from the path, MAJOR-1 of r1), the window opened on it; an unknown section or a profile nobody may see is
 * a 404, a failed read a 503 (MINOR-6 of r1).
 */
export const load: PageServerLoad = async ({ fetch, params, url }) => {
	const section = params.section;
	if (!isDoctorDetailSection(section)) error(404);
	const result = await loadDoctorProfile(fetch, params.slug, getPathnameLocale(url));
	if (result.state === 'not-found') error(404);
	if (result.state === 'failed') error(503);
	return { load: result, section };
};
