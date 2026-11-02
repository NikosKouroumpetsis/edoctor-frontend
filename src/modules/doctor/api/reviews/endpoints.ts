import { httpGet } from '$shared/lib/http';
import type { DoctorPublicMarketplaceReviewsResponseView } from '$shared/lib/api-client';
import type { DoctorRequestContext } from '$modules/doctor/api/profile';

/**
 * Every approved review, newest first (`GET /doctor/public/doctors/{slug}/reviews`, the application's
 * `getDoctorPublicReviews`): anonymous, at most the 500 most recent; the slug is path-encoded.
 */
export function getDoctorPublicReviews(
	doctorSlug: string,
	lang: string,
	context: DoctorRequestContext = {}
): Promise<DoctorPublicMarketplaceReviewsResponseView> {
	return httpGet<DoctorPublicMarketplaceReviewsResponseView>(
		`/doctor/public/doctors/${encodeURIComponent(doctorSlug)}/reviews`,
		{ params: { lang }, signal: context.signal, fetch: context.fetch }
	);
}
