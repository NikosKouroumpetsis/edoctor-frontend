import type { ApiResponseData } from '$shared/lib/api-client';
import { httpSessionGet, httpSessionPost } from '$shared/lib/http';
import { mapOwnReview, mapRatingInvitation } from './map';
import type { OwnReviewFacts, RatingInvitationFacts, RatingSubmitRequest } from './types';

const INVITATIONS = '/appointment-rating/rating-invitations';
const RATINGS = '/appointment-rating/ratings';

/**
 * Screen 54: the invitation the email links to (`ratings/<invitationId>`), its patient's only, with the cookies; `null`
 * for an answer that names none (the contract's view never leaves `api/`).
 */
export async function getRatingInvitation(
	invitationId: string,
	signal?: AbortSignal
): Promise<RatingInvitationFacts | null> {
	return mapRatingInvitation(
		await httpSessionGet<ApiResponseData<'getRatingInvitation', 200>>(
			`${INVITATIONS}/${encodeURIComponent(invitationId)}`,
			{ signal }
		)
	);
}

/** Screen 54's one write: the review the server made (`201`, waiting for moderation), `null` for an answer of none. */
export async function submitRating(
	invitationId: string,
	request: RatingSubmitRequest
): Promise<OwnReviewFacts | null> {
	return mapOwnReview(
		await httpSessionPost<ApiResponseData<'submitRatingInvitation', 201>>(
			`${INVITATIONS}/${encodeURIComponent(invitationId)}/submit`,
			{ body: request }
		)
	);
}

/** P-B4 §13.3.5: the review by the `ratingId` of its appointment — the side comes from the review itself (no `as`). */
export async function getOwnReview(
	ratingId: string,
	signal?: AbortSignal
): Promise<OwnReviewFacts | null> {
	return mapOwnReview(
		await httpSessionGet<ApiResponseData<'getRating', 200>>(
			`${RATINGS}/${encodeURIComponent(ratingId)}`,
			{ signal }
		)
	);
}
