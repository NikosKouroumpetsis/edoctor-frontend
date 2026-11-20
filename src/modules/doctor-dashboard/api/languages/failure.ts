import { ApiError } from '$shared/lib/http';
import type { DoctorLanguagesFailure } from './types';

/**
 * 🔴 D-W52-66 (`w52-b6` §5): why a save of the languages was refused, read from the status and — where the server
 * names no code of its own — from the code it writes at the end of its message
 * (`DOCTOR_SPEAK_LANGUAGE_NOT_IN_CATALOGUE`, as a whole word). Any other `422` is a set the server will not take (more
 * than ten, one twice, a code out of shape). Anything else is `unknown`: the page keeps the choice and says the save
 * did not happen.
 */
export function readDoctorLanguagesFailure(error: unknown): DoctorLanguagesFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	const { status, message } = error;
	if (status === 401) return 'session';
	if (status === 403) return 'forbidden';
	if (status === 409) return 'conflict';
	if (status === 429) return 'rate-limited';
	if (status === 422) {
		return /\bDOCTOR_SPEAK_LANGUAGE_NOT_IN_CATALOGUE\b/u.test(message)
			? 'not-in-catalogue'
			: 'invalid';
	}
	return 'unknown';
}
