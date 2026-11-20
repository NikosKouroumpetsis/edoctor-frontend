import { ApiError } from '$shared/lib/http';
import type { BookingProfileFailure } from './types';

// _source: backend `shared/config/doctor` — the code the server names in the message of a locked name's write.
const NAME_LOCKED = /\bDOCTOR_NAME_LOCKED\b/u;

/**
 * Why the person's own write was refused (`PATCH /patient/me/profile`, the application's `isBirthDateRefusal`): the
 * `422` that names `dateOfBirth` (after today, beyond 120 years), the session, a field, 🔴 D-W52-44 / D-W52-50 the `409`
 * that names `DOCTOR_NAME_LOCKED` (a doctor's first licence locked the names; nothing of the call was written), else.
 */
export function readBookingProfileFailure(error: unknown): BookingProfileFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	if (error.status === 401) return 'session';
	if (error.status === 409 && NAME_LOCKED.test(error.message)) return 'name-locked';
	if (error.status === 422 && /\bdateOfBirth\b/u.test(error.message)) return 'birth-date';
	if (error.status === 400 || error.status === 422) return 'invalid';
	return 'unknown';
}
