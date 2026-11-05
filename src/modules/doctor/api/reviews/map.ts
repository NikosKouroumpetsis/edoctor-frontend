import type {
	DoctorPublicMarketplaceReviewsResponseView,
	DoctorPublicMarketplaceReviewsSummaryResponseView
} from '$shared/lib/api-client';
import { toStarScore } from '$shared/lib/rating-stars';
import {
	aspectChips,
	mapDoctorReview,
	type DoctorReviewChipFacts,
	type DoctorReviewSnippet
} from '$modules/doctor/api/profile';
import { DOCTOR_REVIEW_TOPICS, type DoctorReviewTopic } from '$modules/doctor/config/review-topics';

/** One page of the reviews as FACTS. */
export type DoctorReviewsPage = {
	reviews: DoctorReviewSnippet[];
	nextCursor: string | null;
	/** Every match of the page's search, `null` from a backend without it. */
	total: number | null;
};

/** The window's totals as FACTS: the server's, never counted from what has been read (U-66.3). */
export type DoctorReviewsSummary = {
	count: number;
	/** The average on the 5 stars, `null` before the first review. */
	average: number | null;
	/** Stars 5 to 1. */
	buckets: { star: number; count: number }[];
	chips: DoctorReviewChipFacts[];
	/** U-66.2 «Οι ασθενείς αναφέρουν»: how many reviews speak about each topic, in the server's order. */
	topics: { topic: DoctorReviewTopic; count: number }[];
};

/**
 * One page of the answer (the application's `mapDoctorReviews`): `null` is the backend's own answer for a doctor
 * nobody may see, kept apart from `[]`. U-49: a review off the 5-star scale is left out (`mapDoctorReview`).
 */
export function mapDoctorReviews(
	data: DoctorPublicMarketplaceReviewsResponseView
): DoctorReviewsPage | null {
	if (!Array.isArray(data.reviews)) return null;
	return {
		reviews: data.reviews.flatMap((review) => mapDoctorReview(review) ?? []),
		nextCursor: data.nextCursor ?? null,
		total: typeof data.total === 'number' ? data.total : null
	};
}

/** 🔴 U-65.6: the one check of a topic read from an address or an answer: anything off the list is no topic. */
export function isDoctorReviewTopic(value: unknown): value is DoctorReviewTopic {
	return (DOCTOR_REVIEW_TOPICS as readonly unknown[]).includes(value);
}

const STARS = [5, 4, 3, 2, 1] as const;

/** The totals' answer: always the five stars, 5 first; `null` for a doctor nobody may see. */
export function mapDoctorReviewsSummary(
	data: DoctorPublicMarketplaceReviewsSummaryResponseView
): DoctorReviewsSummary | null {
	const { summary } = data;
	if (!summary) return null;
	return {
		count: summary.count,
		average: toStarScore(summary.average),
		buckets: STARS.map((star) => ({
			star,
			count: summary.distribution.find((bar) => bar.star === star)?.count ?? 0
		})),
		chips: aspectChips(summary.aspectAverages),
		// U-65.6: a topic this client does not know is left out, never drawn from the wire.
		topics: summary.topics.flatMap(({ topic, count }) =>
			isDoctorReviewTopic(topic) && count > 0 ? [{ topic, count }] : []
		)
	};
}
