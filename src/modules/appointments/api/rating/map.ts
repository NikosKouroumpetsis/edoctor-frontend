import type { ApiResponseData } from '$shared/lib/api-client';
import { toStarScore } from '$shared/lib/rating-stars';
import { readInstant } from '$modules/appointments/api/instant';
import { RATING_ASPECTS } from '$modules/appointments/config';
import type {
	OwnReviewFacts,
	RatingAspectId,
	RatingInvitationFacts,
	RatingInvitationStatus,
	RatingModeration,
	RatingSubmitBlocker
} from './types';

type RatingInvitationView = ApiResponseData<'getRatingInvitation', 200>;
type RatingView = ApiResponseData<'getRating', 200>;

// W-4: a text only when it is one, a record only when it is one — a broken answer reads as none, never a throw.
const text = (value: unknown): string | null =>
	typeof value === 'string' ? value.trim() || null : null;
const instant = readInstant;
const record = (value: unknown): Record<string, unknown> | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
const oneOf = <T extends string>(table: Record<T, true>, value: unknown): T | null =>
	typeof value === 'string' && Object.hasOwn(table, value) ? (value as T) : null;

/** Total over the contract's unions: a word it adds fails the build here instead of reaching the page. */
const INVITATION_STATUSES = {
	OPEN: true,
	SUBMITTED: true,
	EXPIRED: true,
	REVOKED: true
} as const satisfies Record<RatingInvitationStatus, true>;
export const RATING_SUBMIT_BLOCKERS = {
	RATING_INVITATION_NOT_OPEN: true,
	RATING_INVITATION_EXPIRED: true,
	RATING_PATIENT_IS_THE_DOCTOR: true,
	RATING_DOCTOR_LICENSE_INACTIVE: true
} as const satisfies Record<RatingSubmitBlocker, true>;
const MODERATIONS = {
	PENDING: true,
	APPROVED: true,
	REJECTED: true
} as const satisfies Record<RatingModeration, true>;

/**
 * The invitation as FACTS; `null` for an answer that names no invitation, no appointment or a state the contract does
 * not have. A review is acceptable only when the server says `true`. 🔴 D-W4-26: the name the review will carry is the
 * server's own (`patientName`, `patientInitial`, written by the code that stores it), `null` when it sends none.
 */
export function mapRatingInvitation(
	view: RatingInvitationView | null | undefined
): RatingInvitationFacts | null {
	const invitation = record(view);
	const invitationId = text(invitation?.invitationId);
	const appointmentId = text(invitation?.appointmentId);
	const status = oneOf(INVITATION_STATUSES, invitation?.status);
	if (!invitation || !invitationId || !appointmentId || !status) return null;
	return {
		invitationId,
		appointmentId,
		status,
		expiresAt: instant(invitation.expiresAt),
		canSubmit: invitation.canSubmit === true,
		submitBlocker: oneOf(RATING_SUBMIT_BLOCKERS, invitation.submitBlocker),
		ratingId: text(invitation.ratingId),
		patientName: text(invitation.patientName),
		patientInitial: text(invitation.patientInitial)
	};
}

/** The five aspects on the stars (U-49: a value off the 0–5 scale is none), `null` without the aspect record. */
function mapAspects(value: unknown): Record<RatingAspectId, number | null> | null {
	const aspect = record(value);
	if (!aspect) return null;
	return Object.fromEntries(
		RATING_ASPECTS.map(({ id, field }) => [
			id,
			toStarScore(typeof aspect[field] === 'number' ? (aspect[field] as number) : null)
		])
	) as Record<RatingAspectId, number | null>;
}

/**
 * 🔴 The person's own review as FACTS (U-138.5); `null` without its id, its appointment or a moderation the contract
 * has. The doctor's reply only when the server gives it approved (`replyModerationStatus`, the patient's rule); the
 * moderator's note and ids are never read.
 */
export function mapOwnReview(view: RatingView | null | undefined): OwnReviewFacts | null {
	const review = record(view);
	const ratingId = text(review?.id);
	const appointmentId = text(review?.appointmentId);
	const moderation = oneOf(MODERATIONS, review?.ratingModerationStatus);
	if (!review || !ratingId || !appointmentId || !moderation) return null;
	const replyBody = text(review.doctorReply);
	return {
		ratingId,
		appointmentId,
		doctorId: text(review.doctorId) ?? '',
		patientName: text(review.patientName),
		patientInitial: text(review.patientInitial),
		overallStars: toStarScore(
			typeof review.overallRating === 'number' ? review.overallRating : null
		),
		comment: text(review.comment),
		moderation,
		aspects: mapAspects(review.aspect),
		reply:
			review.replyModerationStatus === 'APPROVED' && replyBody
				? { body: replyBody, at: instant(review.doctorReplyAt) }
				: null,
		createdAt: instant(review.createdAt)
	};
}
