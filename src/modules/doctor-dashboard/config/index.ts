import type {
	DoctorCancelReasonCode,
	DoctorRejectReasonCode
} from '$modules/doctor-dashboard/api/appointments';

/**
 * Wave 5.1 · screen 66 (D-W51-22): the doctor's reads of the appointments go to the end, a page of the server's largest
 * (`listPageSizeMax` 100, `_LIMIT`: the scale guard reads every `*_SIZE = n` as pixels); ten pages at most, past which
 * the answer says it is not whole (the patient's D-W4-59 way).
 */
export const DOCTOR_APPOINTMENTS_PAGE_LIMIT = 100;
export const DOCTOR_APPOINTMENTS_MAX_PAGES = 10;

/**
 * Screen 67's «Ιστορικό» (D-W51-29): a page as the end of the list nears the screen, twenty a page — the open visits
 * of the days before (`scope=history` holds them too) are left out, so a page holds a little more than the patient's.
 */
export const DOCTOR_HISTORY_PAGE_LIMIT = 20;

/**
 * 🔴 D-W51-24: «Σήμερα» asks again every 60″ while the page shows (the worker's own cycle, the `messages` precedent:
 * TanStack's interval, never in the background) and whenever it comes back to the front.
 */
export const DOCTOR_TODAY_POLL_MS = 60_000;

/**
 * 🔴 D-W51-47 (screen 69): the doctor's reasons, in the server's order (backend `appointment-reasons/Policy.ts`
 * `APPOINTMENT_REJECT_REASONS`, `APPOINTMENT_DOCTOR_CANCEL_REASONS`) — a request's four, an appointment's three. Each a
 * code of the contract's enum (a code the server stops taking fails the build); guarded by
 * `tests/architecture/appointment-rules.test.ts`.
 */
export const DOCTOR_REJECT_REASONS = [
	'DOCTOR_UNAVAILABLE',
	'SLOT_TAKEN',
	'NEEDS_DIFFERENT_SERVICE',
	'OTHER'
] as const satisfies readonly DoctorRejectReasonCode[];
export const DOCTOR_CANCEL_REASONS = [
	'DOCTOR_UNAVAILABLE',
	'EMERGENCY',
	'OTHER'
] as const satisfies readonly DoctorCancelReasonCode[];

/**
 * 🔴 U-65.6 / D-W51-34: the doctor's words to the patient with a refusal or a cancellation, 500 at most — the
 * contract's `maxLength` of `reject.message` and `cancel.reasonText` (the server's `APPOINTMENT_REASON_TEXT_MAX_LENGTH`),
 * guarded by `tests/architecture/appointment-rules.test.ts`.
 */
export const DOCTOR_REASON_TEXT_MAX_LENGTH = 500;

/**
 * 🔴 D-W51-51 (screen 70): the doctor's free hours are read a week at a time — the server's most (`days` 1..7,
 * `APPOINTMENT_RESCHEDULE_SLOTS_MAX_DAYS`) — and «Επόμενες ημέρες» reads the next week.
 */
export const DOCTOR_RESCHEDULE_WINDOW_DAYS = 7;

/**
 * 🔴 U-65.6 / D-W51-44 (screen 70 «Υπηρεσίες και κόστος»): the contract's bounds of the one write — 1 to 10 services, a
 * final price of 0 to 99.999.999 € in whole cents (the server's `APPOINTMENT_SERVICES_MAX_ITEMS`,
 * `APPOINTMENT_MONEY_MAX_AMOUNT`); guarded by `tests/architecture/appointment-rules.test.ts`.
 */
export const DOCTOR_CHARGES_MAX_SERVICES = 10;
export const DOCTOR_CHARGES_MAX_AMOUNT = 99_999_999;
export const DOCTOR_CHARGES_AMOUNT_DECIMALS = 2;

/**
 * 🔴 Screen 72 «Νέο ραντεβού» (D-W51-55, D-W51-70; U-65.6): the search of «οι ασθενείς μου» — the words at most 40 (the
 * server's `q`), asked once the typing has been quiet a moment, a page of 10 (the most recent without words); and «Νέος
 * ασθενής» within the server's bounds (D-W51-54): a name of 1–80 letters, a Greek mobile as typed in 20 at most, an
 * email of 254 at most. Guarded by `tests/architecture/appointment-rules.test.ts`.
 */
export const DOCTOR_PATIENT_SEARCH_MAX_LENGTH = 40;
export const DOCTOR_PATIENT_SEARCH_DEBOUNCE_MS = 300;
export const DOCTOR_PATIENTS_PAGE_LIMIT = 10;
export const DOCTOR_NEW_PATIENT_NAME_MAX_LENGTH = 80;
export const DOCTOR_NEW_PATIENT_PHONE_MAX_LENGTH = 20;
export const DOCTOR_NEW_PATIENT_EMAIL_MAX_LENGTH = 254;

/**
 * 🔴 Screen 73 «Οι ασθενείς μου» (D-W51-64, D-W51-74; U-65.6): the list a page as the end of it nears the screen, twenty a
 * page (the server's `limit` is 1–50); the search is screen 72's (40 at most, quiet a moment). The card's two lists of
 * appointments («Επόμενα» / «Προηγούμενα») a page of ten after the first the card brings (`limit` 1–50).
 */
export const DOCTOR_PATIENTS_LIST_LIMIT = 20;
export const DOCTOR_PATIENT_APPOINTMENTS_LIMIT = 10;
