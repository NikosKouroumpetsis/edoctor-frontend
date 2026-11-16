import { ApiError } from '$shared/lib/http';
import type { AppointmentCancelLinkFailure } from './types';

// _source: backend `booking-blockers` — the patient's cancel after its deadline names this code (a `403`).
const AFTER_CUTOFF = /\bCANCEL_AFTER_CANCELLATION_CUTOFF\b/u;

/**
 * 🔴 D-W51-72: why the page's read or its cancel was refused — the link no longer holds (`404`; a read refused by the
 * token's shape, `422`), the deadline passed meanwhile (`403 CANCEL_AFTER_CANCELLATION_CUTOFF`), the visit changed
 * (`409`), a field of the write (`422`), too many (`429`); else nobody decided.
 */
export function readAppointmentCancelLinkFailure(
	error: unknown,
	during: 'read' | 'write'
): AppointmentCancelLinkFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	const { status, message, errorCode } = error;
	if (status === 404) return 'gone';
	if (status === 429) return 'rate-limited';
	if (status === 422) return during === 'read' ? 'gone' : 'invalid';
	if (status === 409) return 'changed';
	if (
		status === 403 &&
		(AFTER_CUTOFF.test(message) || errorCode === 'CANCEL_AFTER_CANCELLATION_CUTOFF')
	)
		return 'deadline';
	return 'unknown';
}
