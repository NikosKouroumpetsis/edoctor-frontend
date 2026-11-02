import type { DoctorDetailReviewCardContent, DoctorDetailReviewRatingBucket } from '../types';

/** The star rows of the reviews window, 5 first — every row, a star nobody gave included. */
const RATING_STARS = [5, 4, 3, 2, 1] as const;

/** The star a fractional rating counts under (3,9 ⇒ 4), clamped to 1…5; `undefined` for a non-number. */
export function toDoctorReviewRatingStar(rating: number): number | undefined {
	if (!Number.isFinite(rating)) return undefined;
	return Math.min(5, Math.max(1, Math.round(rating)));
}

/**
 * The spread 5…1 of the reviews, counted in the browser from the very list the window shows (the backend
 * publishes only the average; the application's `buildDoctorReviewRatingDistribution`): `share` of the rated ones.
 */
export function buildDoctorReviewRatingDistribution(
	cards: Pick<DoctorDetailReviewCardContent, 'rating'>[]
): DoctorDetailReviewRatingBucket[] {
	const counts = new Map<number, number>();
	let total = 0;
	for (const card of cards) {
		const star = toDoctorReviewRatingStar(card.rating);
		if (star === undefined) continue;
		counts.set(star, (counts.get(star) ?? 0) + 1);
		total += 1;
	}
	return RATING_STARS.map((star) => {
		const count = counts.get(star) ?? 0;
		return { star, count, share: total === 0 ? 0 : count / total };
	});
}
