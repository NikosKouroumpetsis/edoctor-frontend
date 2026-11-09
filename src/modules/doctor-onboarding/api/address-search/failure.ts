import { ApiError } from '$shared/lib/http';
import type { DoctorOnboardingAddressFailure } from './types';

/** Why the address search could not answer (B-7): `422 ADDRESS_OUTSIDE_GREECE`, `429`, `503`, the session, else. */
export function readDoctorOnboardingAddressFailure(error: unknown): DoctorOnboardingAddressFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	if (error.status === 401) return 'session';
	if (error.status === 429) return 'rate-limited';
	if (/\bADDRESS_OUTSIDE_GREECE\b/u.test(error.message)) return 'outside-greece';
	if (error.status === 503 || /\bADDRESS_SEARCH_UNAVAILABLE\b/u.test(error.message)) {
		return 'unavailable';
	}
	return 'unknown';
}
