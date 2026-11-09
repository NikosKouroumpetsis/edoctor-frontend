import { ApiError } from '$shared/lib/http';
import type { BookingPhoneFailure } from './types';

// The backend's codes of a refused code, the same the sign-in reads (`modules/auth/lib/failures`).
const INVALID_CODES = ['EC011', 'EC010'];
const LOCKED_CODES = ['USER_LOCKED', 'EC008'];
const STALE_CODES = ['EC007', 'EC009'];

/** Why a step of the challenge was refused: the lock first, then the status, then the code's own reason. */
export function readBookingPhoneFailure(error: unknown): BookingPhoneFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	const code = error.errorCode ?? '';
	if (LOCKED_CODES.includes(code)) return 'locked';
	if (error.status === 401) return 'session';
	if (error.status === 409) return 'number-taken';
	if (error.status === 429) return 'rate-limited';
	if (STALE_CODES.includes(code)) return 'stale-code';
	if (INVALID_CODES.includes(code)) return 'invalid-code';
	return 'unknown';
}
