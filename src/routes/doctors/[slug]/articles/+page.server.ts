import { error } from '@sveltejs/kit';
import { getPathnameLocale } from '$shared/preferences/i18n/page-locale';
import { loadArticlesFirstPage, type ArticlesListScope } from '$modules/articles/api';
import { readArticleType } from '$modules/articles/lib/article-list';
import { loadDoctorProfile } from '$modules/doctor/api/profile';
import type { PageServerLoad } from './$types';

/**
 * 🔴 U-77.1, U-92.3: all the articles of one doctor, the list's first page (12) on the server, whole without JavaScript:
 * the profile first (the doctor's name and id, and the counts that name the page), as the profile's route answers it
 * (404 for a doctor nobody may see, 503 for a failed read), then ONE read of the list with `doctorId`.
 */
export const load: PageServerLoad = async ({ fetch, params, url }) => {
	const lang = getPathnameLocale(url);
	const result = await loadDoctorProfile(fetch, params.slug, lang);
	if (result.state === 'not-found') error(404);
	if (result.state === 'failed') error(503);
	const doctorId = result.profile.doctorId;
	if (!doctorId) error(404);
	const scope: ArticlesListScope = {
		lang,
		type: readArticleType(url.searchParams),
		q: null,
		serviceId: null,
		doctorId
	};
	return { load: result, scope, list: await loadArticlesFirstPage(fetch, scope) };
};
