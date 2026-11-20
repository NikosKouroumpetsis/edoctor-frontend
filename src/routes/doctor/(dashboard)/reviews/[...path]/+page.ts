import { error } from '@sveltejs/kit';
import { readDoctorReviewsAddress } from '$modules/doctor-dashboard/lib/paths';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 5.2 · screen 84 «Κριτικές» (D-W52-91 / 92; the doctor's `patients/[...path]` precedent): ONE route under the
 * doctor's frame, a closed list — the list at `/doctor/reviews` (`?filter=unanswered`, `?review=<id>`), the reply to one
 * review at `/doctor/reviews/<id>/reply` and its report at `…/report`; anything else is a 404 (U-65.6). Nothing is read
 * here: the cookies live on the API, so the doctor's reviews are the browser's read.
 */
export const load: PageLoad = ({ params, url }) => {
	const address = readDoctorReviewsAddress(params.path, url.searchParams);
	if (!address) error(404);
	return { address };
};
