import { ApiError } from '$shared/lib/http';
import type { BookingBlockerCode } from '$modules/appointments/api/readiness';
import type { AppointmentFailureFacts, AppointmentRequestField } from './types';

/**
 * 🔴 Every blocker the contract publishes, as a table the COMPILER keeps total (the application's
 * `APPOINTMENT_BLOCKER_CODES`): the backend sends «<message>: <CODE>» with a generic `errorCode`, so the token is read
 * from the MESSAGE, on word boundaries, and a new code fails the build instead of degrading to «try again».
 */
const BLOCKER_CODES = {
	PATIENT_PHONE_UNVERIFIED: true,
	PATIENT_NAME_MISSING: true,
	RESCHEDULE_AFTER_CANCELLATION_CUTOFF: true,
	RESCHEDULE_INSIDE_CANCELLATION_CUTOFF: true,
	CANCEL_AFTER_CANCELLATION_CUTOFF: true,
	OFFICE_PHONE_REQUIRED: true,
	PATIENT_PENDING_LIMIT_REACHED: true,
	PATIENT_RESCHEDULE_LIMIT_REACHED: true,
	PATIENT_IS_THE_DOCTOR: true,
	DOCTOR_SERVICE_NOT_OWNED_BY_DOCTOR: true,
	AVAILABILITY_NOT_FOUND: true,
	AVAILABILITY_DISABLED: true,
	SCHEDULE_NOT_CONFIGURED: true,
	DOCTOR_NOT_VERIFIED: true,
	APPOINTMENTS_DISABLED: true,
	MARKETPLACE_LICENSE_INACTIVE: true,
	OUTSIDE_AVAILABILITY_WINDOW: true,
	OUTSIDE_WEEKLY_SCHEDULE: true,
	SLOT_STEP_MISMATCH: true,
	INTERVAL_DURATION_MISMATCH: true,
	INTERVAL_EXCEEDS_AVAILABLE_RANGE: true,
	SLOT_ALREADY_ELAPSED: true,
	BOOKING_NOTICE_TOO_SHORT: true,
	BOOKING_HORIZON_EXCEEDED: true,
	APPOINTMENT_OVERLAPS_EXISTING: true,
	EXTERNAL_CALENDAR_BUSY: true
} as const satisfies Record<BookingBlockerCode, true>;

const BLOCKERS = Object.keys(BLOCKER_CODES) as BookingBlockerCode[];

/** The fields of the create body, total over the request type: the server names its refusals with them. */
const REQUEST_FIELDS = {
	bookedForType: true,
	doctorId: true,
	firstVisit: true,
	officeId: true,
	patientId: true,
	patientNote: true,
	relativeId: true,
	services: true,
	startTime: true
} as const satisfies Record<AppointmentRequestField, true>;

const FIELDS = Object.keys(REQUEST_FIELDS) as AppointmentRequestField[];

// The 422 that means «that slot is not bookable» (backend `throwForPublicSlotBlockers`), not a field the caller got wrong.
const SLOT_NOT_AVAILABLE = 'APPOINTMENT_SLOT_NOT_AVAILABLE';

const named = (message: string, token: string) => new RegExp(`\\b${token}\\b`, 'u').test(message);

/**
 * 🔴 Why the create call was refused (the application's `readAppointmentFailure`). The blockers are read FIRST, from
 * wherever they came (`403` and `422` both carry them), then the taken hour (`409` or the slot's marker), then a field;
 * a `401` is the session that ended; anything nobody decided (a lost request, an outage) stays `unknown`.
 */
export function readAppointmentFailure(error: unknown): AppointmentFailureFacts {
	if (!(error instanceof ApiError)) return { kind: 'unknown', status: 0, blockers: [], fields: [] };
	const { status, message } = error;
	if (status === 401) return { kind: 'session', status, blockers: [], fields: [] };
	if (status < 400 || status >= 500) return { kind: 'unknown', status, blockers: [], fields: [] };
	const blockers = BLOCKERS.filter((code) => named(message, code));
	const fields = FIELDS.filter((field) => named(message, field)).sort(
		(left, right) => message.indexOf(left) - message.indexOf(right)
	);
	if (blockers.length > 0) return { kind: 'blocked', status, blockers, fields };
	if (status === 409 || message.includes(SLOT_NOT_AVAILABLE)) {
		return { kind: 'slot-unavailable', status, blockers, fields };
	}
	if (status === 400 || status === 422) return { kind: 'invalid', status, blockers, fields };
	return { kind: 'unknown', status, blockers, fields };
}
