import { ApiError } from '$shared/lib/http';
import type { DoctorServicesFailure } from './types';

/**
 * 🔴 D-W52-71 … 74 (`w52-b7` §9): why a write of the services was refused, read from the status and from the marker the
 * server writes at the end of its message — `DOCTOR_SERVICE_LAST_ONE` (409) the last service, any other 409 a service
 * the doctor already offers, `DOCTOR_SERVICE_ORDER_MISMATCH` (422) and a `404` of the order a list that is no longer
 * the doctor's, the licence's own words for years past it, any other 422 a field the server would not take. A `403`
 * that names the licence is no licence; any other `403` / `404` of one service is a service that is no longer there
 * (D-107 answers a foreign and an unknown one alike). Anything else is `unknown`: what was typed stays.
 */
export function readDoctorServicesFailure(error: unknown): DoctorServicesFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	const { status, message } = error;
	if (status === 401) return 'session';
	if (status === 429) return 'rate-limited';
	if (status === 409) return message.includes('DOCTOR_SERVICE_LAST_ONE') ? 'last' : 'owned';
	if (status === 422) {
		if (message.includes('DOCTOR_SERVICE_ORDER_MISMATCH')) return 'mismatch';
		return /yearsOfexperience must not exceed/u.test(message) ? 'years' : 'invalid';
	}
	if (status === 403) return /licence is required/iu.test(message) ? 'forbidden' : 'gone';
	if (status === 404) return /\/order$/u.test(error.url) ? 'mismatch' : 'gone';
	return 'unknown';
}
