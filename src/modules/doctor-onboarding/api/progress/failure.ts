import { ApiError } from '$shared/lib/http';
import type { DoctorOnboardingFailure } from './types';

/**
 * The server's own marks inside a refusal's message (m3: the `errorCode` is generic, the mark names the rule), in the
 * order a screen tells them apart (w3-b3's codes). The age wins inside `DOCTOR_ONBOARDING_INCOMPLETE: …` (it says what
 * to fix); the terms only alone (41): inside `complete`'s refusal the progress is read again and opens them (B-9).
 */
const MARKS: [RegExp, DoctorOnboardingFailure][] = [
	[/\bDOCTOR_UNDER_MINIMUM_AGE\b/u, 'under-age'],
	[/\bDOCTOR_ONBOARDING_NOT_STARTED\b/u, 'not-started'],
	[/\bDOCTOR_ONBOARDING_INCOMPLETE\b/u, 'incomplete'],
	[/\bDOCTOR_TERMS_NOT_ACCEPTED\b/u, 'terms-not-accepted'],
	[/\b(OFFICE_POINT_OUTSIDE_GREECE|ADDRESS_OUTSIDE_GREECE)\b/u, 'outside-greece'],
	[/\bDOCTOR_NOTIFICATION_EMAIL_SEND_FAILED\b/u, 'email-send-failed']
];

// _source: backend `modules/doctor/application/commands/onboarding/Command.ts:843-847` — the registration lock is a
// `403` with the server's own words and the generic `EC403` (a doctor's own write meets no other `403` there).
const REGISTRATION_LOCKED = /\bregistration is locked\b/u;

/**
 * Why a write of the sign-up (or its read) was refused (contract §5, P-B3 review m3, B-9, w3-b3's codes): the session,
 * the account's lock, the sign-up's lock (W8 Delta 1), the rate, a mark, then a field the server judged (`400`,
 * `409 …OFFICE_ADDRESS_REQUIRED`, `422`), any other `4xx` the server answered (`403` without the lock's words, `404`,
 * `413`: W8 Delta 2), else — no answer at all, or a `5xx`.
 */
export function readDoctorOnboardingFailure(error: unknown): DoctorOnboardingFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	if (error.status === 401) return 'session';
	if (error.errorCode === 'USER_LOCKED') return 'locked';
	if (error.status === 403 && REGISTRATION_LOCKED.test(error.message)) return 'registration-locked';
	if (error.status === 429) return 'rate-limited';
	const mark = MARKS.find(([pattern]) => pattern.test(error.message));
	if (mark) return mark[1];
	if (error.status === 400 || error.status === 409 || error.status === 422) return 'invalid';
	if (error.status >= 400 && error.status < 500) return 'refused';
	return 'unknown';
}

// _source: backend `shared/utils/validators/validator-schemas.ts:32-143` — every refusal of the server's phone rule says
// «τηλέφωνο» and names no field («Μη έγκυρος κωδικός χώρας για το τηλέφωνο.»; guarded by
// `tests/architecture/server-words.test.ts`). The names — the office's `phone` (38), the contact's `salesContactPhone`
// or its old `phoneNumber` (42, `Command.ts:667-675`) — are defensive: today's server names none (its schema's `422`,
// «Validation failed fields: …», names no field and stays the frame's).
const PHONE_REFUSAL = /\b(?:phone|salesContactPhone|phoneNumber)\b|τηλέφωνο/u;

/**
 * W8-Σ1 · the `400` / `422` that refuses a phone the doctor typed (the application's `isBirthDateRefusal`: the server's
 * own words): the field says it, never the frame — the office's on 38 (`details`), the contact's on 42 (`complete`,
 * W8 Delta 1). Neither write judges anything else typed by these words.
 */
export function isDoctorOnboardingPhoneRefusal(error: unknown): boolean {
	return (
		error instanceof ApiError &&
		(error.status === 400 || error.status === 422) &&
		!MARKS.some(([pattern]) => pattern.test(error.message)) &&
		PHONE_REFUSAL.test(error.message)
	);
}
