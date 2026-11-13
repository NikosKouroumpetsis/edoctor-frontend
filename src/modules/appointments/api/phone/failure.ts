import { ApiError } from '$shared/lib/http';
import type { BookingPhoneFailure, PhoneChangeFailure } from './types';

// The backend's codes of a refused code, the same the sign-in reads (`modules/auth/lib/failures`).
const INVALID_CODES = ['EC011', 'EC010'];
const LOCKED_CODES = ['USER_LOCKED', 'EC008'];
const STALE_CODES = ['EC007', 'EC009'];

/**
 * Why a step of the challenge was refused: the lock first, then the code's own reason, then the status. A wrong or spent
 * code is a `401` too (`EC011`, `EC007`, `EC009`): it is read by its code, and every other `401` is a session that ended.
 */
export function readBookingPhoneFailure(error: unknown): BookingPhoneFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	const code = error.errorCode ?? '';
	if (LOCKED_CODES.includes(code)) return 'locked';
	if (STALE_CODES.includes(code)) return 'stale-code';
	if (INVALID_CODES.includes(code)) return 'invalid-code';
	if (error.status === 401) return 'session';
	if (error.status === 409) return 'number-taken';
	if (error.status === 429) return 'rate-limited';
	return 'unknown';
}

const SESSION_REFUSED_ERROR_CODE = 'EC401';

/**
 * Wave 4.5 · screen 58 («Κινητό», the same three calls): a refused step by the server's own code. A `401` alone says
 * nothing — a wrong or spent code and a channel that may not open are `401` too — so only `EC401`, the session gate's
 * refusal, is a session that ended; a lock says the general «it did not go through», with no detail.
 */
export function readPhoneChangeFailure(error: unknown): PhoneChangeFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	const code = error.errorCode ?? '';
	if (error.status === 401 && code === SESSION_REFUSED_ERROR_CODE) return 'session';
	if (LOCKED_CODES.includes(code)) return 'unknown';
	if (error.status === 409) return 'taken';
	if (error.status === 429) return 'rate-limited';
	if (STALE_CODES.includes(code)) return 'stale-code';
	if (INVALID_CODES.includes(code)) return 'invalid-code';
	if (error.status === 400 || error.status === 422) return 'invalid-value';
	return 'unknown';
}
