import { ApiError } from '$shared/lib/http';
import type { DoctorSpecializationsFailure } from './types';

/**
 * 🔴 D-W52-54 (`w52-b4` §9): why a save of the picks was refused, read from the status and — where the server names no
 * code of its own — from the code it writes at the end of its message (`DOCTOR_SPECIALIZATION_NOT_OF_SPECIALTY`, as a
 * whole word). Any other `422` is a set the server will not take (more than three, one twice, a code out of shape).
 * Anything else is `unknown`: the page keeps the choice and says the save did not happen.
 */
export function readDoctorSpecializationsFailure(error: unknown): DoctorSpecializationsFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	const { status, message } = error;
	if (status === 401) return 'session';
	if (status === 403) return 'forbidden';
	if (status === 409) return 'conflict';
	if (status === 429) return 'rate-limited';
	if (status === 422) {
		return /\bDOCTOR_SPECIALIZATION_NOT_OF_SPECIALTY\b/u.test(message)
			? 'not-of-specialty'
			: 'invalid';
	}
	return 'unknown';
}
