import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import { getOwnReview, getRatingInvitation } from './endpoints';

/** Screen 54's invitation, keyed by its id; 🔴 U-65.6: personal, gone at a sign-out. */
export function ratingInvitationQuery(invitationId: string) {
	return queryOptions({
		queryKey: appointmentsQueryKeys.invitation(invitationId),
		queryFn: ({ signal }) => getRatingInvitation(invitationId, signal),
		meta: personalQueryMeta
	});
}

/** «Η κριτική σας» by its id (P-B4 §13.3.5); personal, gone at a sign-out. */
export function ownReviewQuery(ratingId: string) {
	return queryOptions({
		queryKey: appointmentsQueryKeys.review(ratingId),
		queryFn: ({ signal }) => getOwnReview(ratingId, signal),
		meta: personalQueryMeta
	});
}
