import { createQuery } from '@tanstack/svelte-query';
import { ownReviewQuery } from '$modules/appointments/api/rating';

/**
 * 🔴 U-138.5 · P-B4 §13.3.5 (card rule 5): «Η κριτική σας» of the visit on screen 51, read by the `ratingId` its
 * appointment names — only then, only for a member, in the browser; never by a list of reviews per appointment. Personal
 * (gone at a sign-out). `null` while it is read, when it failed (the card is simply not drawn) or there is none.
 */
export function useOwnReview(options: { ratingId: () => string | null; enabled: () => boolean }) {
	const query = createQuery(() => ({
		...ownReviewQuery(options.ratingId() ?? ''),
		enabled: options.enabled() && Boolean(options.ratingId())
	}));

	const live = $derived(options.enabled() && Boolean(options.ratingId()));
	const review = $derived(live ? (query.data ?? null) : null);

	return {
		get review() {
			return review;
		}
	};
}
