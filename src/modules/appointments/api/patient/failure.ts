import { ApiError } from '$shared/lib/http';
import type { BookingProfileFailure } from './types';

/**
 * Why the person's own write was refused (`PATCH /patient/me/profile`, the application's `isBirthDateRefusal`): the
 * `422` that names `dateOfBirth` (after today, beyond 120 years), the session, a field, else.
 */
export function readBookingProfileFailure(error: unknown): BookingProfileFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	if (error.status === 401) return 'session';
	if (error.status === 422 && /\bdateOfBirth\b/u.test(error.message)) return 'birth-date';
	if (error.status === 400 || error.status === 422) return 'invalid';
	return 'unknown';
}
