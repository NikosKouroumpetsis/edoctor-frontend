/**
 * The booking's static limits (wave 3 · screen 30), each the copy of a rule the server owns, so the page never accepts
 * what the server refuses (the application's `config/booking`).
 */

/** `patientNote` (D-39, m11): at most 500, in UTF-16 code units as the server's schema counts them (D-W4-36.8). */
export const BOOKING_PATIENT_NOTE_MAX_LENGTH = 500;

/** U-103.2: the patient books ONE visit, of quantity one; the contract's list stays the server's. */
export const BOOKING_SERVICE_QUANTITY = 1;

/** The names of a relative and of the person: the server's `maxLength` (`patient/me/profile`, `relatives`). */
export const BOOKING_NAME_MAX_LENGTH = 100;

/**
 * U-65.6: the mobiles (the relative's, and the person's own on «Το κινητό σας», review w3-w3 R1 MINOR-3) and the relative's
 * email, the way the form caps them (the server checks them again).
 */
export const BOOKING_RELATIVE_PHONE_MAX_LENGTH = 16;
export const BOOKING_RELATIVE_EMAIL_MAX_LENGTH = 120;

/** The phone challenge's code: 6 digits, and a new one after 60 seconds (the sign-in's cooldown). */
export const BOOKING_PHONE_CODE_LENGTH = 6;
export const BOOKING_PHONE_RESEND_SECONDS = 60;

/**
 * Wave 4.0 · screen 50: ten appointments a page (the application's `APPOINTMENTS_PAGE_SIZE`). `_LIMIT`, the request's
 * word: the scale guard reads every `*_SIZE = n` as pixels (the search's `SEARCH_RESULTS_PAGE_LIMIT`).
 */
export const APPOINTMENTS_PAGE_LIMIT = 10;

/** D-W4-21: the ONE read of the upcoming a relative's deletion asks — the server's largest page (`listPageSizeMax`). */
export const APPOINTMENTS_SCAN_LIMIT = 100;

/** 🔴 D-W4-59.2: … read on by its `nextCursor` to the end, ten pages of a hundred at most; past them it is not whole. */
export const APPOINTMENTS_SCAN_MAX_PAGES = 10;

/** Screen 53 (U-137.1, record §9.4): the patient's words to the doctor, 500 at most (the server takes 2000). */
export const APPOINTMENT_CANCEL_MESSAGE_MAX_LENGTH = 500;

/** The other side's words read back (a doctor's reason, a cancellation's message): cut at the server's own bound. */
export const APPOINTMENT_REASON_TEXT_MAX_LENGTH = 2000;

/** Screen 54: a review's text, 2000 at most, as the server's `OPTIONAL_TEXT_SCHEMA` (`rating/Policy.ts`). */
export const RATING_COMMENT_MAX_LENGTH = 2000;

/** Screen 55: the relatives one person keeps (`PATIENT_RELATIVES_MAX`, backend `shared/config/relatives`). */
export const PATIENT_RELATIVES_MAX = 20;

/**
 * The five reasons a patient may cancel for, in the server's order (`APPOINTMENT_PATIENT_CANCEL_REASONS`, backend
 * `appointment/domain/policies/appointment-reasons/Policy.ts`). Guarded by `tests/architecture/appointment-rules.test.ts`.
 */
export const PATIENT_CANCEL_REASONS = [
	'SCHEDULE_CONFLICT',
	'FEELING_BETTER',
	'FOUND_ANOTHER_DOCTOR',
	'PERSONAL',
	'OTHER'
] as const;

/**
 * Screen 54: the five aspects of a review in the server's order, the field the submit names, and the weight of each in
 * the review's grade (`RATING_WEIGHTS`, backend `appointment-rating/domain/policies/rating/Policy.ts`; their sum is 5).
 * The ids are the profile's chips (`doctor_review_chip_*`). Guarded by `tests/architecture/appointment-rules.test.ts`.
 */
export const RATING_ASPECTS = [
	{ id: 'in-depth', field: 'inDepthRating', weight: 1.2 },
	{ id: 'trust', field: 'trustRating', weight: 1.0 },
	{ id: 'expertise', field: 'expertiseRating', weight: 1.2 },
	{ id: 'punctuality', field: 'punctualRating', weight: 0.8 },
	{ id: 'friendliness', field: 'friendlyRating', weight: 0.8 }
] as const;
