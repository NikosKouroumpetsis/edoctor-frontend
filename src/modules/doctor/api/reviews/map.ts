import type { DoctorPublicMarketplaceReviewsResponseView } from '$shared/lib/api-client';
import { mapDoctorReview, type DoctorReviewSnippet } from '$modules/doctor/api/profile';

/**
 * The reviews' answer as FACTS (the application's `mapDoctorReviews`): `null` is the backend's own answer for a
 * doctor nobody may see, kept apart from `[]` (a doctor without approved reviews). U-49: a review off the 5-star scale
 * is left out (`mapDoctorReview`).
 */
export function mapDoctorReviews(
	data: DoctorPublicMarketplaceReviewsResponseView
): DoctorReviewSnippet[] | null {
	return Array.isArray(data.reviews)
		? data.reviews.flatMap((review) => mapDoctorReview(review) ?? [])
		: null;
}
