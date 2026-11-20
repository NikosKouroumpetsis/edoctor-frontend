import { ApiError } from '$shared/lib/http';
import type { DoctorReviewsFailure } from './types';

/**
 * 🔴 D-W52-86 / 87 (`w52-b8` §10): why a write of screen 84 was refused, read from the status and from the words the
 * server writes — `401` the session, `429` the rate; a `409` that says the review «is not published» and every `403`
 * (D-107: another doctor's review and an unknown one read alike) a review no longer on the doctor's page; a `409` of an
 * «open report» a report already open; any other `409` («already exists» / «does not exist») a reply that changed in
 * the meantime; a `422` words the server would not take. Anything else is `unknown`: what was typed stays.
 */
export function readDoctorReviewsFailure(error: unknown): DoctorReviewsFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	const { status, message } = error;
	if (status === 401) return 'session';
	if (status === 429) return 'rate-limited';
	if (status === 403 || status === 404) return 'gone';
	if (status === 409) {
		if (/not published/iu.test(message)) return 'gone';
		if (/open report/iu.test(message)) return 'reported';
		return 'changed';
	}
	if (status === 422) return 'invalid';
	return 'unknown';
}
