import type { InfiniteData, QueryClient } from '@tanstack/svelte-query';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import type { DoctorReviewFacts, DoctorReviewsFilter, DoctorReviewsPageFacts } from './types';

const FILTERS: readonly DoctorReviewsFilter[] = ['all', 'unanswered'];

type Pages = InfiniteData<DoctorReviewsPageFacts, string | undefined>;

/** Every page held of the reviews — both choices of the list and the one review of each appointment — written anew. */
function rewritePages(
	client: QueryClient,
	rewrite: (page: DoctorReviewsPageFacts) => DoctorReviewsPageFacts
) {
	for (const filter of FILTERS) {
		client.setQueryData<Pages>(doctorDashboardQueryKeys.reviewList(filter), (held) =>
			held ? { ...held, pages: held.pages.map(rewrite) } : held
		);
	}
	client.setQueriesData<DoctorReviewsPageFacts>(
		{ queryKey: [...doctorDashboardQueryKeys.reviews(), 'appointment'] },
		(held) => (held ? rewrite(held) : held)
	);
}

/**
 * 🔴 D-W52-86: the review as the server now keeps it (a reply sent, changed or deleted) in every list held, so the card
 * the doctor goes back to already says it — before the reads that follow (the caller invalidates `reviews()`).
 */
export function keepDoctorReview(client: QueryClient, review: DoctorReviewFacts): void {
	rewritePages(client, (page) => ({
		...page,
		items: page.items.map((item) => (item.id === review.id ? review : item))
	}));
	client.setQueryData(doctorDashboardQueryKeys.review(review.id), review);
}

/**
 * 🔴 D-W52-87: a review just reported (at `now`, the server's clock), in every list held — its card says «Τη στείλατε
 * για έλεγχο …».
 */
export function keepDoctorReviewReported(client: QueryClient, ratingId: string, now: number): void {
	const reportedAt = new Date(now).toISOString();
	rewritePages(client, (page) =>
		page.items.some((item) => item.id === ratingId) &&
		!page.openReports.some((report) => report.ratingId === ratingId)
			? { ...page, openReports: [...page.openReports, { ratingId, reportedAt }] }
			: page
	);
}
