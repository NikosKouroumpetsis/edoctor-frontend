import { error, redirect } from '@sveltejs/kit';
import { localizeHref } from '$paraglide/runtime';
import { getPathnameLocale } from '$shared/preferences/i18n/page-locale';
import { loadDoctorProfile } from '$modules/doctor/api/profile';
import { doctorAboutPath, isDoctorDetailSection } from '$modules/doctor/lib/detail';
import type { PageServerLoad } from './$types';

/**
 * 🔴 Π7: a window's own address (the application's `details/[section]`) — the profile read as on its own page (its
 * language from the path, MAJOR-1 of r1), the window opened on it; an unknown section or a profile nobody may see is
 * a 404, a failed read a 503 (MINOR-6 of r1). 🔴 U-73.1 Ε1: the old `details/description` is the doctor's own page now,
 * so a link that was shared still arrives.
 */
export const load: PageServerLoad = async ({ fetch, params, url }) => {
	const section = params.section;
	if (section === 'description') {
		redirect(308, localizeHref(doctorAboutPath(params.slug), { locale: getPathnameLocale(url) }));
	}
	if (!isDoctorDetailSection(section)) error(404);
	const result = await loadDoctorProfile(fetch, params.slug, getPathnameLocale(url));
	if (result.state === 'not-found') error(404);
	if (result.state === 'failed') error(503);
	return { load: result, section };
};
