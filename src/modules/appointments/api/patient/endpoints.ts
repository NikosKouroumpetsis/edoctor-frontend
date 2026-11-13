import type {
	PatientSelfResponseView,
	PatientSelfUpsertResponseView
} from '$shared/lib/api-client';
import { httpSessionGet, httpSessionPatch, httpSessionPut } from '$shared/lib/http';
import type { BookingProfilePatch, PatientIdentifiersPatch } from './types';

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

/**
 * Wave 4.5 · screen 58 (D-W45-10): the person's own ΑΜΚΑ / ΑΦΜ (`PUT /patient/me`) — a new value, `null` to remove it,
 * a field left out untouched. 🔴 U-168: the answer (the patient with its masks) never leaves `api/`; the page reads the
 * person again.
 */
export async function updatePatientIdentifiers(patch: PatientIdentifiersPatch): Promise<void> {
	await httpSessionPut<PatientSelfUpsertResponseView>('/patient/me', { body: patch });
}
