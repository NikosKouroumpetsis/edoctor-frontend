import type {
	ApiRequestBody,
	AppointmentConfirmationMode,
	AppointmentStatus
} from '$shared/lib/api-client';
import type { BookingBlockerCode } from '$modules/appointments/api/readiness';

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

/**
 * One appointment as the booking's last page reads it (screen 31): its state, its hour on the office's clock, the
 * deadline of an open request (D-49), the office's phone, the note and what it froze (`snapshot`). Absence is `null`.
 */
export type AppointmentFacts = {
	id: string;
	doctorId: string;
	officeId: string;
	officeTimeZone: string;
	status: AppointmentStatus;
	confirmationMode: AppointmentConfirmationMode | null;
	startTime: string;
	expiresAt: string | null;
	officePhone: string | null;
	patientNote: string | null;
	relativeId: string | null;
	serviceIds: string[];
	snapshot: AppointmentSnapshotFacts;
};

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
