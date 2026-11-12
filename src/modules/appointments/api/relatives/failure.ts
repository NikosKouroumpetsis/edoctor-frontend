import { ApiError } from '$shared/lib/http';
import type { BookingRelativeField, BookingRelativeFailure, RelativeChangeFailure } from './types';

// P-B3-review A-4 / m3: the limit's code travels in the message, as every refusal of the appointment module's.
const LIMIT_MARKER = 'PATIENT_RELATIVES_LIMIT_REACHED';

/** Why adding a relative was refused: the limit first (its marker), then the status. */
export function readBookingRelativeFailure(error: unknown): BookingRelativeFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	if (error.message.includes(LIMIT_MARKER) || error.errorCode === LIMIT_MARKER) return 'limit';
	if (error.status === 429) return 'rate-limited';
	if (error.status === 401) return 'session';
	if (error.status === 400 || error.status === 422) return 'invalid';
	return 'unknown';
}

/**
 * Why changing or deleting a relative was refused (screen 55, P-W4 §4.6): a `403` / `404` is a relative that is not the
 * person's any more («Αυτός ο συγγενής δεν είναι πια διαθέσιμος.»), else the create's reasons. The create keeps its own
 * reading (`readBookingRelativeFailure`): its `403` means another thing.
 */
export function readRelativeChangeFailure(error: unknown): RelativeChangeFailure {
	if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
		return 'forbidden';
	}
	return readBookingRelativeFailure(error);
}

/** The body's fields, total over its type: a refusal names them by these words (`lastName is required.`, `"email" …`). */
const RELATIVE_FIELDS = {
	firstName: true,
	lastName: true,
	relationship: true,
	gender: true,
	phone: true,
	email: true,
	amka: true,
	afm: true
} as const satisfies Record<BookingRelativeField, true>;

const FIELDS = Object.keys(RELATIVE_FIELDS) as BookingRelativeField[];

// _source: backend `shared/utils/validators/validator-schemas.ts:145-151` — the names' rule («μόνο γράμματα») names no
// field, and in this write only the two names take it (`patient/domain/entities/relative/Entity.ts:15-16`); the phone's
// rule (`:32-143`) says «τηλέφωνο» and names none either. Guarded by `tests/architecture/server-words.test.ts`.
const NAMES_RULE = /μόνο γράμματα/u;
const PHONE_RULE = /τηλέφωνο/u;

/**
 * 🔴 W8-Σ2 · the fields a refused relative was refused for, read from the server's own words (the application's
 * `isBirthDateRefusal`, the booking's `readAppointmentFailure`): a field it names, the names' rule as both names (it
 * does not say which), the phone's rule as the phone; none for anything else (the limit, the rate, the session).
 */
export function readBookingRelativeRefusedFields(error: unknown): BookingRelativeField[] {
	if (readBookingRelativeFailure(error) !== 'invalid' || !(error instanceof ApiError)) return [];
	const { message } = error;
	return FIELDS.filter(
		(field) =>
			new RegExp(`\\b${field}\\b`, 'u').test(message) ||
			((field === 'firstName' || field === 'lastName') && NAMES_RULE.test(message)) ||
			(field === 'phone' && PHONE_RULE.test(message))
	);
}

// _source: backend `shared/domain/policies/greek-id/Policy.ts` — once its length is right, the ΑΜΚΑ's date and the
// ΑΦΜ's check digit have words of their own (the field the relative passes first). Guarded by `server-words.test.ts`.
const ID_VALIDITY_RULES = [
	['amka', /\bamka has an invalid date prefix\b/u],
	['afm', /\bafm is not a valid Greek tax identification number\b/u]
] as const satisfies readonly (readonly [BookingRelativeField, RegExp])[];

/**
 * 🔴 U-121.3 · the ΑΜΚΑ / ΑΦΜ a refusal found of the right length but not valid — its date, its check digit — by the
 * server's own words; none for its length or anything else.
 */
export function readBookingRelativeInvalidIds(error: unknown): BookingRelativeField[] {
	if (readBookingRelativeFailure(error) !== 'invalid' || !(error instanceof ApiError)) return [];
	const { message } = error;
	return ID_VALIDITY_RULES.filter(([, rule]) => rule.test(message)).map(([field]) => field);
}
