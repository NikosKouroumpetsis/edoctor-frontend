import type {
	PatientSelfResponseView,
	PatientSelfUpsertResponseView
} from '$shared/lib/api-client';
import { httpSessionGet, httpSessionPatch } from '$shared/lib/http';
import type { BookingProfilePatch } from './types';

/** The signed-in person (`GET /patient/me`), with the cookies: `null` is a session without a patient profile. */
export function getBookingPatient(signal?: AbortSignal): Promise<PatientSelfResponseView> {
	return httpSessionGet<PatientSelfResponseView>('/patient/me', { signal });
}

/**
 * The person's name or date of birth (`PATCH /patient/me/profile`): only the fields asked for travel (`200`). The
 * answer — the whole patient, the ΑΜΚΑ / ΑΦΜ of them and of every relative — never leaves `api/` (review w3-w6 R2
 * MINOR-1): the page reads the person again (`bookingPatientQuery`).
 */
export async function updateBookingPatientProfile(patch: BookingProfilePatch): Promise<void> {
	await httpSessionPatch<PatientSelfUpsertResponseView>('/patient/me/profile', { body: patch });
}
