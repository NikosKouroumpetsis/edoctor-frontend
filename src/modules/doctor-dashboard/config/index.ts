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

/**
 * 🔴 U-209.3 · D-W52-54 (screen 80): a doctor picks at most three specializations of the list of the specialty (the
 * server's own `DOCTOR_SPECIALIZATION_LIMIT`; a fourth is refused there too); guarded by
 * `tests/architecture/specialization-rules.test.ts`.
 */
export const DOCTOR_SPECIALIZATION_LIMIT = 3;

/**
 * 🔴 U-210 · D-W52-63 (screen 81): the bounds of one group of the biography, the server's own
 * (`DOCTOR_CREDENTIAL_MAX_ITEMS`, `…_TITLE_MAX`, `…_ORGANIZATION_MAX`, `…_MIN_YEAR`; a year runs to next year on the
 * platform's calendar) — said before a save and checked there again; guarded by
 * `tests/architecture/credential-rules.test.ts`.
 */
export const DOCTOR_CREDENTIAL_LIMIT = 20;
export const DOCTOR_CREDENTIAL_TITLE_MAX_LENGTH = 300;
export const DOCTOR_CREDENTIAL_ORGANIZATION_MAX_LENGTH = 200;
export const DOCTOR_CREDENTIAL_MIN_YEAR = 1950;

/**
 * 🔴 U-211 · D-W52-66 / 69 (screen 82): a doctor speaks at most ten languages of the catalogue (the server's own
 * `DOCTOR_SPEAK_LANGUAGE_LIMIT`; an eleventh is refused there too), Greek (`SPEAK_LANGUAGE_GREEK_CODE`) stands first in
 * every list, and the search of the catalogue takes a few words at most; guarded by
 * `tests/architecture/language-rules.test.ts`.
 */
export const DOCTOR_SPEAK_LANGUAGE_LIMIT = 10;
export const DOCTOR_SPEAK_LANGUAGE_GREEK_CODE = 'SL001';
export const DOCTOR_LANGUAGE_SEARCH_MAX_LENGTH = 60;

/**
 * 🔴 U-211 · D-W52-67 / 70 (screen 82): the four links of the doctor's page — the longest link a field keeps (the
 * server's own `DOCTOR_SOCIAL_LINK_MAX_LENGTH`) and the names of each network: a name itself and, where `subdomains`
 * is set, every name under it (the server's own `NETWORK_HOSTS`); guarded by
 * `tests/architecture/language-rules.test.ts`.
 */
export const DOCTOR_LINK_MAX_LENGTH = 2000;
export const DOCTOR_LINK_NETWORK_HOSTS = {
	facebook: [
		{ host: 'facebook.com', subdomains: true },
		{ host: 'fb.com', subdomains: false }
	],
	instagram: [
		{ host: 'instagram.com', subdomains: false },
		{ host: 'www.instagram.com', subdomains: false }
	],
	linkedin: [{ host: 'linkedin.com', subdomains: true }]
} as const satisfies Record<string, readonly { host: string; subdomains: boolean }[]>;

/**
 * 🔴 U-212 · D-W52-71 / 82 (screen 83): the bounds of one service, the server's own (`DOCTOR_SERVICE_PRICE_MAX`,
 * `…_SUBTITLE_MAX_LENGTH`, `…_DESCRIPTION_MAX_LENGTH`, `DOCTOR_SERVICE_YEARS_OF_EXPERIENCE_MAX`; the years never past
 * those of the practice licence) — whole euros from 1, four digits; said before a save and checked there again; guarded
 * by `tests/architecture/service-rules.test.ts`. The lengths are D-W52-10's ONE list, `$shared/lib/visit-length`.
 */
export const DOCTOR_SERVICE_PRICE_MAX = 9999;
export const DOCTOR_SERVICE_PRICE_DIGITS = 4;
export const DOCTOR_SERVICE_SUBTITLE_MAX_LENGTH = 120;
export const DOCTOR_SERVICE_DESCRIPTION_MAX_LENGTH = 1000;
export const DOCTOR_SERVICE_YEARS_MAX = 70;
export const DOCTOR_SERVICE_YEARS_DIGITS = 2;

/**
 * 🔴 U-218 · D-W52-91 / 92 (screen 84): the doctor's reviews — a page of the list (the server's default, 100 at most),
 * the longest reply and the longest words of a report (the server's own `APPOINTMENT_RATING_REPLY_MAX_LENGTH` /
 * `…_REPORT_TEXT_MAX_LENGTH`), and how many pages at most the list reads by itself to find the review an address names
 * (a notification, the row of 68); guarded by `tests/architecture/review-rules.test.ts`.
 */
export const DOCTOR_REVIEWS_PAGE_LIMIT = 20;
export const DOCTOR_REVIEW_REPLY_MAX_LENGTH = 2000;
export const DOCTOR_REVIEW_REPORT_TEXT_MAX_LENGTH = 1000;
export const DOCTOR_REVIEWS_FIND_PAGES_MAX = 25;

/**
 * 🔴 U-221 / U-222 · D-W52-102 / 103 (screen 85): «Τα άρθρα μου» — a page of the list (the server's default; 50 at most),
 * the title and the short description (the server's 200 / 300), and the pictures the page takes before a byte leaves:
 * JPG, PNG or WebP of at most 10 MB, a cover of at least 800 × 600 (`IMAGE_TOO_SMALL`), an image of the text of at least
 * 200 × 200 (`ArticleImagePolicy.CONTENT_MIN_DIMENSIONS`); guarded by `tests/architecture/article-rules.test.ts`.
 */
export const DOCTOR_ARTICLES_PAGE_LIMIT = 20;
export const DOCTOR_ARTICLE_TITLE_MAX_LENGTH = 200;
export const DOCTOR_ARTICLE_SHORT_DESCRIPTION_MAX_LENGTH = 300;
export const DOCTOR_ARTICLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const DOCTOR_ARTICLE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const DOCTOR_ARTICLE_COVER_LEAST_ACROSS = 800;
export const DOCTOR_ARTICLE_COVER_LEAST_DOWN = 600;
export const DOCTOR_ARTICLE_IMAGE_LEAST_PIXELS = 200;
