import { error } from '@sveltejs/kit';
import { readDoctorArticlesAddress } from '$modules/doctor-dashboard/lib/paths';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 5.2 · screen 85 «Τα άρθρα μου» (D-W52-102 / 103; the doctor's `reviews/[...path]` precedent): ONE route under the
 * doctor's frame, a closed list — the list at `/doctor/articles`, «Νέο άρθρο» at `…/new` and one article at `…/<id>`;
 * anything else is a 404 (U-65.6). Nothing is read here: the cookies live on the API, so the doctor's articles are the
 * browser's read.
 */
export const load: PageLoad = ({ params }) => {
	const address = readDoctorArticlesAddress(params.path);
	if (!address) error(404);
	return { address };
};
