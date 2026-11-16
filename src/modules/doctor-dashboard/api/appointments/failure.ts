import { ApiError } from '$shared/lib/http';
import { readInstant } from '$shared/lib/instant';
import type {
	DoctorActionFailureFacts,
	DoctorBookFailureFacts,
	DoctorCorrectionFailureFacts,
	DoctorNewPatientField,
	DoctorWriteFailureFacts
} from './types';

/**
 * 🔴 Why a one-tap answer of «Σήμερα» was refused (D-W51-23 / D-W51-25): the session (`401`), the appointment moved
 * under the page (`409`: answered, expired or settled meanwhile — the page reads it again), the server would not
 * (`403` / `404`: not this doctor's, the licence, U-183.5), anything else nobody decided (a lost request, `429`, `5xx`).
 */
export function readDoctorActionFailure(error: unknown): DoctorActionFailureFacts {
	if (!(error instanceof ApiError)) return { kind: 'unknown', status: 0 };
	const { status } = error;
	if (status === 401) return { kind: 'session', status };
	if (status === 409) return { kind: 'conflict', status };
	if (status === 403 || status === 404) return { kind: 'refused', status };
	return { kind: 'unknown', status };
}

// _source: backend `appointment-outcome/Policy.ts` `APPOINTMENT_CORRECTION_PATIENT_ALREADY_RATED` — the stable mark of the
// one `409` that names the review (`details.reason`, w51-b9); `tests/architecture/appointment-rules.test.ts` reads it there.
export const DOCTOR_CORRECTION_RATED = 'PATIENT_ALREADY_RATED';

/**
 * 🔴 D-W51-62 · U-196.1: why «Διόρθωση έκβασης» was refused — the session (`401`), the review the patient already wrote
 * (the `409` whose `details.reason` is `PATIENT_ALREADY_RATED`, step 8: the mark, no longer the message's words), the
 * correction no longer allowed (any other `409`, `403`, `404`), too many (`429`); else nobody decided.
 */
export function readDoctorCorrectionFailure(error: unknown): DoctorCorrectionFailureFacts {
	if (!(error instanceof ApiError)) return { kind: 'unknown', status: 0 };
	const { status } = error;
	if (status === 401) return { kind: 'session', status };
	if (status === 429) return { kind: 'rate-limited', status };
	if (status === 409) {
		return { kind: error.details?.reason === DOCTOR_CORRECTION_RATED ? 'rated' : 'closed', status };
	}
	if (status === 403 || status === 404) return { kind: 'closed', status };
	return { kind: 'unknown', status };
}

// _source: backend `booking-blockers/Policy.ts` — the codes the server names in the message of a doctor's write.
const INTO_THE_PAST = /\bRESCHEDULE_INTO_THE_PAST\b/u;
const DOES_NOT_FIT = /\bCHARGES_DO_NOT_FIT\b/u;
// A visit of a day at most (the `details` are the server's, read as facts all the same).
const MAX_MINUTES = 1440;

/** The facts of «Δεν χωράει» (`details`: how long the visit would last, when the other one starts), else none. */
function clashOf(error: ApiError) {
	const minutes = error.details?.durationMinutes;
	const next = readInstant(error.details?.nextStartTime);
	return typeof minutes === 'number' &&
		Number.isInteger(minutes) &&
		minutes > 0 &&
		minutes <= MAX_MINUTES &&
		next
		? { durationMinutes: minutes, nextStartTime: next }
		: null;
}

/**
 * 🔴 Why a write of screen 70 was refused (D-W51-51, D-W51-52): the session (`401`), too many (`429`), the visit that no
 * longer fits (`409 CHARGES_DO_NOT_FIT`, its facts when the server sent them), any other `409` (the hour taken, the
 * appointment changed meanwhile), the hour that passed meanwhile (`422 RESCHEDULE_INTO_THE_PAST`), a field (`400` /
 * `422`), a state that no longer allows it or one that is not this doctor's (`403` / `404`); else nobody decided.
 */
export function readDoctorWriteFailure(error: unknown): DoctorWriteFailureFacts {
	if (!(error instanceof ApiError)) return { kind: 'unknown', status: 0 };
	const { status, message } = error;
	if (status === 401) return { kind: 'session', status };
	if (status === 429) return { kind: 'rate-limited', status };
	if (status === 409) {
		return DOES_NOT_FIT.test(message)
			? { kind: 'clash', status, clash: clashOf(error) }
			: { kind: 'conflict', status };
	}
	if (status === 422 && INTO_THE_PAST.test(message)) return { kind: 'past', status };
	if (status === 400 || status === 422) return { kind: 'invalid', status };
	if (status === 403 || status === 404) return { kind: 'closed', status };
	return { kind: 'unknown', status };
}

/** The new patient's fields, total over their type: a refusal names them by these words (`phone must be …`). */
const NEW_PATIENT_FIELDS = {
	firstName: true,
	lastName: true,
	phone: true,
	email: true
} as const satisfies Record<DoctorNewPatientField, true>;
const FIELDS = Object.keys(NEW_PATIENT_FIELDS) as DoctorNewPatientField[];

// _source: backend `shared/utils/validators/validator-schemas.ts` `onlyCharactersSchema` — the names' rule («μόνο
// γράμματα») names no field, and in this write only the two names take it (`doctor-patient-record/Entity.ts`).
const NAMES_RULE = /μόνο γράμματα/u;

/**
 * 🔴 D-W51-70: why «Κλείσιμο ραντεβού» was refused — the session (`401`), too many (`429`), the hour taken meanwhile
 * (`409`), a field (`422` / `400`, with the new patient's fields its words name: a field by its name, the names' rule as
 * both names), the person no longer the doctor's (`404`), the account may not (`403`); else nobody decided.
 */
export function readDoctorBookFailure(error: unknown): DoctorBookFailureFacts {
	if (!(error instanceof ApiError)) return { kind: 'unknown', status: 0, fields: [] };
	const { status, message } = error;
	const none = { status, fields: [] };
	if (status === 401) return { kind: 'session', ...none };
	if (status === 429) return { kind: 'rate-limited', ...none };
	if (status === 409) return { kind: 'taken', ...none };
	if (status === 404) return { kind: 'missing', ...none };
	if (status === 403) return { kind: 'refused', ...none };
	if (status === 400 || status === 422) {
		const fields = FIELDS.filter(
			(field) =>
				new RegExp(`\\b${field}\\b`, 'u').test(message) ||
				((field === 'firstName' || field === 'lastName') && NAMES_RULE.test(message))
		);
		return { kind: 'invalid', status, fields };
	}
	return { kind: 'unknown', ...none };
}
