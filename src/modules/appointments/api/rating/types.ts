import type { ApiRequestBody } from '$shared/lib/api-client';
import type { RATING_ASPECTS } from '$modules/appointments/config';

/** An invitation's state on the server's clock (an `OPEN` one past `expiresAt` reads `EXPIRED`, D-118). */
export type RatingInvitationStatus = 'OPEN' | 'SUBMITTED' | 'EXPIRED' | 'REVOKED';

/** Why a review would be refused now (`RatingInvitationSubmitBlocker`): the form says it in words, never the code. */
export type RatingSubmitBlocker =
	| 'RATING_INVITATION_NOT_OPEN'
	| 'RATING_INVITATION_EXPIRED'
	| 'RATING_PATIENT_IS_THE_DOCTOR'
	| 'RATING_DOCTOR_LICENSE_INACTIVE';

/**
 * Screen 54's invitation (`GET /appointment-rating/rating-invitations/{id}`, its patient's own): the visit it rates,
 * whether a review is accepted now and why not, the review it produced. D-W4-26: the name the preview shows comes from
 * the server (`patientName`, `patientInitial`, written by the code that stores it), `null` when it sends none — 🔴 no
 * rule of a name on the client.
 */
export type RatingInvitationFacts = {
	invitationId: string;
	appointmentId: string;
	status: RatingInvitationStatus;
	expiresAt: string | null;
	canSubmit: boolean;
	submitBlocker: RatingSubmitBlocker | null;
	ratingId: string | null;
	patientName: string | null;
	patientInitial: string | null;
};

/** The five aspects by the profile's chip ids (`RATING_ASPECTS`, the server's order). */
export type RatingAspectId = (typeof RATING_ASPECTS)[number]['id'];

/** A review's moderation (`ratingModerationStatus`): «Σε έλεγχο» / «Δημοσιεύτηκε» / «Δεν δημοσιεύτηκε» in `lib/`. */
export type RatingModeration = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * 🔴 The person's own review of a visit (screen 51 «Η κριτική σας», U-138.5), on the 0–5 stars (U-49): its state, its
 * grade and aspects (a value off the scale is none), its date, its words as TEXT, and the doctor's reply only when the
 * server gives one approved (the patient never reads another). The moderator's note never leaves `api/`.
 */
export type OwnReviewFacts = {
	ratingId: string;
	appointmentId: string;
	doctorId: string;
	patientName: string | null;
	patientInitial: string | null;
	overallStars: number | null;
	comment: string | null;
	moderation: RatingModeration;
	aspects: Record<RatingAspectId, number | null> | null;
	reply: { body: string; at: string | null } | null;
	createdAt: string | null;
};

/** Screen 54's one write (`POST …/rating-invitations/{id}/submit`): the five aspects 1–10, the words only when some. */
export type RatingSubmitRequest = ApiRequestBody<'submitRatingInvitation'>;

/**
 * 🔴 Why the invitation's read or the submit was refused, as facts for `lib/`: `blocked` (a `403` naming a submit
 * blocker), `not-accessible` (the one `403` of an invitation of another account, or none), `already-rated` (`409`),
 * `rate-limited` (`429`), `invalid` (a field, the text's `<` `>`), `session` (`401`), `unknown`.
 */
export type RatingFailureFacts = {
	kind:
		| 'blocked'
		| 'not-accessible'
		| 'already-rated'
		| 'rate-limited'
		| 'invalid'
		| 'session'
		| 'unknown';
	status: number;
	blocker: RatingSubmitBlocker | null;
};
