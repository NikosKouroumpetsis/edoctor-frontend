import { httpGet } from '$shared/lib/http';
import type {
	DoctorPublicMarketplaceReviewsResponseView,
	DoctorPublicMarketplaceReviewsSummaryResponseView
} from '$shared/lib/api-client';
import type { DoctorRequestContext } from '$modules/doctor/api/profile';
import type { DoctorReviewTopic } from '$modules/doctor/config/review-topics';

/** The orders the server sorts a doctor's reviews by (U-66.3). */
export type DoctorReviewsOrder = 'newest' | 'oldest' | 'highest' | 'lowest';

/**
 * One page of the reviews: at most `limit`, after `cursor`, in `sort`, with every word of `q` in the comment and, with
 * `mention`, only those that speak about that topic (one at a time, U-66.2).
 */
export type DoctorReviewsPageQuery = {
	limit: number;
	sort: DoctorReviewsOrder;
	cursor?: string;
	q?: string;
	mention?: DoctorReviewTopic;
};

/**
 * One page of the approved reviews (`GET /doctor/public/doctors/{slug}/reviews`, U-66.3): anonymous; the slug is
 * path-encoded. `total` counts every match, `nextCursor` names the next page.
 */
export function getDoctorPublicReviews(
	doctorSlug: string,
	lang: string,
	query: DoctorReviewsPageQuery,
	context: DoctorRequestContext = {}
): Promise<DoctorPublicMarketplaceReviewsResponseView> {
	return httpGet<DoctorPublicMarketplaceReviewsResponseView>(
		`/doctor/public/doctors/${encodeURIComponent(doctorSlug)}/reviews`,
		{
			params: {
				lang,
				limit: query.limit,
				sort: query.sort,
				cursor: query.cursor,
				q: query.q,
				mention: query.mention
			},
			signal: context.signal,
			fetch: context.fetch
		}
	);
}

/**
 * The totals of the window (U-66.3): how many, the five bars, the aspects, the topics (U-66.2); `summary: null` for a
 * hidden doctor.
 */
export function getDoctorPublicReviewsSummary(
	doctorSlug: string,
	lang: string,
	context: DoctorRequestContext = {}
): Promise<DoctorPublicMarketplaceReviewsSummaryResponseView> {
	return httpGet<DoctorPublicMarketplaceReviewsSummaryResponseView>(
		`/doctor/public/doctors/${encodeURIComponent(doctorSlug)}/reviews/summary`,
		{ params: { lang }, signal: context.signal, fetch: context.fetch }
	);
}
