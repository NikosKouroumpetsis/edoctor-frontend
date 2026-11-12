import type {
	ApiRequestBody,
	AppointmentConfirmationMode,
	AppointmentStatus
} from '$shared/lib/api-client';
import type { BookingBlockerCode } from '$modules/appointments/api/readiness';

export type { AppointmentConfirmationMode, AppointmentStatus };

type AppointmentCreateBody = ApiRequestBody<'createAppointment'>;

/**
 * The one write of the booking (`POST /appointment/appointments`), as the page assembles it: the contract's body (W-4),
 * with the relative and the note always named (`null` when none) and one quantity per line. `firstVisit` (wave 3, A-2)
 * travels only when the page asked the question; `status` and `vatRate` are never named — the office's mode decides the
 * one (D-01), the server's price the other.
 */
export type AppointmentCreateRequest = Required<
	Pick<
		AppointmentCreateBody,
		| 'doctorId'
		| 'officeId'
		| 'patientId'
		| 'bookedForType'
		| 'relativeId'
		| 'startTime'
		| 'patientNote'
	>
> &
	Pick<AppointmentCreateBody, 'firstVisit'> & {
		services: Required<
			Pick<AppointmentCreateBody['services'][number], 'doctorServiceId' | 'quantity'>
		>[];
	};

/** The fields of that body: the names the server labels its refusals with (`firstVisit` too, NIT-4 of R1). */
export type AppointmentRequestField = keyof AppointmentCreateRequest;

/**
 * Review w3-w3 R1 MINOR-2 (D-06, the application's `buildDoneCard`): what the appointment froze when it was made — who
 * the visit is for (the person's or the relative's names as booked), the service of its first active line (its title
 * and length then) and what it costs as the server keeps it. A later rename, a deleted relative or a new price of the
 * doctor's changes none of it.
 */
export type AppointmentSnapshotFacts = {
	visitor: { kind: 'self' | 'relative'; name: string | null };
	service: { title: string; durationInMinutes: number | null } | null;
	totalAmount: number | null;
};

/** Who acted on an appointment, as the contract names the sides (`AppointmentActorKind`). */
export type AppointmentActorKind = 'DOCTOR' | 'BACKOFFICE' | 'PATIENT' | 'SYSTEM';

/** One service line as booked (D-71: a line the doctor removed stays, `isActive: false`): its title, length and cost. */
export type AppointmentServiceLineFacts = {
	doctorServiceId: string;
	title: string;
	durationInMinutes: number | null;
	/** The line's gross amount, `null` when the server names none. */
	amount: number | null;
	isActive: boolean;
};

/** The office's address in one of the languages it had when the visit was booked (D-06). */
export type AppointmentOfficeTranslationFacts = {
	language: string;
	street: string | null;
	streetNumber: string | null;
	city: string | null;
	state: string | null;
	floor: number | null;
};

/** Where the visit takes place, as the appointment froze it: the address parts, the floor, the phone, its languages. */
export type AppointmentOfficeFacts = {
	officeId: string;
	street: string | null;
	streetNumber: string | null;
	city: string | null;
	postalCode: string | null;
	state: string | null;
	/** `0` the ground floor, below it a basement: only a non-number is absence. */
	floor: number | null;
	phone: string | null;
	translations: AppointmentOfficeTranslationFacts[];
};

/**
 * 🔴 U-139.5: the relative the visit was booked for, as frozen (D-06) — the names, and the relationship and gender as the
 * server spells them (`''` on a row older than the snapshot of them, P-B4 §4): the words are `lib/`'s. Never the
 * relative's phone, email, ΑΜΚΑ or ΑΦΜ (U-65.6: no page of the appointment shows them).
 */
export type AppointmentRelativeFacts = {
	relativeId: string | null;
	firstName: string | null;
	lastName: string | null;
	relationship: string;
	gender: string;
};

/** One line of the appointment's trail: what happened, who did it (`null` when the reader may not learn it), the hours. */
export type AppointmentAuditFacts = {
	action: string;
	actorKind: AppointmentActorKind | null;
	at: string;
	previousStartTime: string | null;
	nextStartTime: string | null;
};

/** D-W4-01 (P-B4 §13.1): the visit's open invitation to rate it — only one that takes a review now. */
export type AppointmentRatingInvitationRef = { invitationId: string; expiresAt: string };

/** P-B4 §13.1 · why the patient may not move the hour: closed, past the deadline, or the moves are spent. */
export type AppointmentRescheduleDenial = 'STATUS' | 'AFTER_CUTOFF' | 'LIMIT_REACHED';

/**
 * One appointment of the person as FACTS (the list and the page read it the same way): its state and hours on the
 * office's clock, the deadline of an open request (D-49), what it froze (`snapshot`, `office`, `relative`,
 * `serviceLines`), how it ended (who, when, the reason, the other side's words) and its trail. 🔴 U-137.5: never
 * `canceledLate` — the patient never reads it, so it never leaves `api/`. `patientHasEmail` is the snapshot's email as a
 * flag (D-W4-11), never the address. `ratingInvitation` / `ratingId` (D-W4-01): the open invitation and the review, the
 * patient's side only. Absence is `null`.
 */
export type AppointmentFacts = {
	id: string;
	doctorId: string;
	officeId: string;
	officeTimeZone: string;
	status: AppointmentStatus;
	confirmationMode: AppointmentConfirmationMode | null;
	startTime: string;
	endTime: string | null;
	durationInMinutes: number | null;
	expiresAt: string | null;
	officePhone: string | null;
	patientNote: string | null;
	firstVisit: boolean | null;
	relativeId: string | null;
	serviceIds: string[];
	snapshot: AppointmentSnapshotFacts;
	serviceLines: AppointmentServiceLineFacts[];
	office: AppointmentOfficeFacts | null;
	relative: AppointmentRelativeFacts | null;
	patientHasEmail: boolean;
	confirmedAt: string | null;
	canceledAt: string | null;
	canceledBy: AppointmentActorKind | null;
	cancelReasonCode: string | null;
	cancelReasonText: string | null;
	rejectedAt: string | null;
	rejectedBy: AppointmentActorKind | null;
	rejectReasonText: string | null;
	updatedAt: string | null;
	auditTrail: AppointmentAuditFacts[];
	ratingInvitation: AppointmentRatingInvitationRef | null;
	ratingId: string | null;
};

/**
 * D-118: what the patient may do with ONE appointment NOW, by the server's clock (`actions`). The three of P-B4 §13.1
 * (D-W4-01, only on one appointment, D-W4-02) — the deadline's instant, why the hour may not move, the moves left — as
 * the server sends them, `null` for the doctor's side or an answer without them: never a guessed value (D-118).
 */
export type AppointmentActionsFacts = {
	canCancel: boolean;
	canReschedule: boolean;
	cancellationCutoffHours: number | null;
	isPastCancellationCutoff: boolean;
	cancellationDeadline: string | null;
	rescheduleDenial: AppointmentRescheduleDenial | null;
	reschedulesLeft: number | null;
};

/** One appointment as its own page reads it (`GET /appointment/appointments/{id}` and every write's answer). */
export type AppointmentDetailFacts = AppointmentFacts & { actions: AppointmentActionsFacts };

/** Screen 50's two tabs, as the server bounds them by its own clock (`scope`, D-118). */
export type AppointmentListScope = 'upcoming' | 'history';

/**
 * 🔴 D-W4-59: the person's upcoming appointments read to the end for the «Διαγραφή συγγενή;» window. `complete` is
 * false when the pages did not end within the reads allowed: a count out of part of them is never said as the whole.
 */
export type AppointmentScanFacts = { items: AppointmentFacts[]; complete: boolean };

/** One page of the person's appointments: the rows, the next page's cursor, the whole set's count. */
export type AppointmentPageFacts = {
	items: AppointmentFacts[];
	nextCursor: string | null;
	total: number;
};

/** What a read of the list asks for: the tab, how many, from where (`nextCursor`). */
export type AppointmentListRequest = {
	scope: AppointmentListScope;
	limit: number;
	cursor?: string;
};

type AppointmentPatchBody = ApiRequestBody<'rescheduleAppointment'>;

/**
 * Screen 52's one write (`PATCH /appointment/appointments/{id}`), the contract's body: the hour alone (with the «yes» of
 * U-91.1 when it was asked), the person with `firstVisit` only when it was asked, or the note (`null` removes it).
 */
export type AppointmentChangeRequest =
	| (Required<Pick<AppointmentPatchBody, 'startTime'>> &
			Pick<AppointmentPatchBody, 'acknowledgeInsideCancellationCutoff'>)
	| (Required<Pick<AppointmentPatchBody, 'bookedForType' | 'relativeId'>> &
			Pick<AppointmentPatchBody, 'firstVisit'>)
	| Required<Pick<AppointmentPatchBody, 'patientNote'>>;

/** Every reason the contract takes (both sides' lists: a doctor's cancellation is read on the patient's page too). */
export type AppointmentCancelReasonCode = ApiRequestBody<'cancelAppointment'>['reasonCode'];

/** Screen 53's one write (`POST …/cancel`): the reason always, the words only when there are some. */
export type AppointmentCancelRequest = ApiRequestBody<'cancelAppointment'>;

/**
 * 🔴 Why the create call was refused, as facts for `lib/` to phrase: `blocked` (the server named blockers, under `403`
 * or `422`), `slot-unavailable` (the hour was taken), `invalid` (a field), `session` (`401`: the session ended under
 * the page) or `unknown` (nobody decided: a lost request, an outage).
 */
export type AppointmentFailureFacts = {
	kind: 'blocked' | 'slot-unavailable' | 'invalid' | 'session' | 'unknown';
	status: number;
	blockers: BookingBlockerCode[];
	fields: AppointmentRequestField[];
};

/**
 * 🔴 Why a change or a cancellation of an appointment was refused (screens 52, 53), as facts for `lib/`: the create's
 * kinds, and `closed` (a `403` or `404` that names no code: the appointment closed meanwhile, or it is not this
 * account's), `changed` (`409` «changed concurrently»: still open, read it again), `rate-limited` (`429`).
 */
export type AppointmentChangeFailureFacts = {
	kind:
		| 'blocked'
		| 'slot-unavailable'
		| 'closed'
		| 'changed'
		| 'rate-limited'
		| 'invalid'
		| 'session'
		| 'unknown';
	status: number;
	blockers: BookingBlockerCode[];
};
