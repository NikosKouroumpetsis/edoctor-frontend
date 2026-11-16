import type { ApiRequestBody, ApiResponseData } from '$shared/lib/api-client';
import { httpSessionGet, httpSessionPatch, httpSessionPost } from '$shared/lib/http';
import {
	mapDoctorAppointmentPage,
	type DoctorAppointmentPageFacts
} from '$modules/doctor-dashboard/api/appointments';
import {
	mapDoctorPatient,
	mapDoctorPatientCard,
	mapDoctorPatientKey,
	mapDoctorPatientPage,
	mapDoctorPatients
} from './map';
import type {
	DoctorPatientAppointmentsSection,
	DoctorPatientCardFacts,
	DoctorPatientFacts,
	DoctorPatientKey,
	DoctorPatientPageFacts,
	DoctorPatientRecordPatch
} from './types';

const PATIENTS = '/appointment/doctor/patients';

/**
 * 🔴 Screen 72 (D-W51-55): «οι ασθενείς μου», with the cookies — only the doctor's own (the session names the doctor,
 * nothing in the request does); `query` ≤ 40 (the server checks it again), none for the most recent; `limit` at most.
 */
export async function searchDoctorPatients(
	request: { query: string; limit: number },
	signal?: AbortSignal
): Promise<DoctorPatientFacts[]> {
	const params = { ...(request.query ? { q: request.query } : {}), limit: request.limit };
	return mapDoctorPatients(
		await httpSessionGet<ApiResponseData<'searchDoctorPatients', 200>>(PATIENTS, {
			params,
			signal
		})
	);
}

/**
 * 🔴 «Ίδιο κινητό» (D-W51-55, U-197.3): the doctor's people with one Greek mobile — a warning of the page, never a
 * refusal of the write; as FACTS.
 */
export async function matchDoctorPatientsByPhone(
	phone: string,
	signal?: AbortSignal
): Promise<DoctorPatientFacts[]> {
	return mapDoctorPatients(
		await httpSessionGet<ApiResponseData<'matchDoctorPatientsByPhone', 200>>(
			`${PATIENTS}/phone-match`,
			{ params: { phone }, signal }
		)
	);
}

/**
 * 🔴 D-W51-69 (`?kind=&id=`): one patient of the doctor by its key, the screen-72 facts of the card (`getDoctorPatient`)
 * — another doctor's, or none, is the server's one `404` (D-W51-63); `null` for an answer that names none.
 */
export async function getDoctorPatient(
	key: DoctorPatientKey,
	signal?: AbortSignal
): Promise<DoctorPatientFacts | null> {
	return mapDoctorPatient(
		await httpSessionGet<ApiResponseData<'getDoctorPatient', 200>>(
			`${PATIENTS}/${key.kind}/${encodeURIComponent(key.id)}`,
			{ signal }
		)
	);
}

const one = (key: DoctorPatientKey) => `${PATIENTS}/${key.kind}/${encodeURIComponent(key.id)}`;

/**
 * 🔴 Screen 73 (D-W51-64, D-W51-74): «Οι ασθενείς μου», one page — only the doctor's own (the session names the doctor);
 * `query` ≤ 40 (the server checks it again), `cursor` the previous page's `nextCursor`; as FACTS.
 */
export async function listDoctorPatients(
	request: { query: string; limit: number; cursor?: string },
	signal?: AbortSignal
): Promise<DoctorPatientPageFacts> {
	const params = {
		...(request.query ? { q: request.query } : {}),
		limit: request.limit,
		...(request.cursor ? { cursor: request.cursor } : {})
	};
	return mapDoctorPatientPage(
		await httpSessionGet<ApiResponseData<'searchDoctorPatients', 200>>(PATIENTS, {
			params,
			signal
		})
	);
}

/**
 * 🔴 Screen 73 (D-W51-63 / 65): one patient's card by its key — another doctor's, or none, is the server's one `404`
 * (never told apart); `null` for an answer that names none.
 */
export async function getDoctorPatientCard(
	key: DoctorPatientKey,
	signal?: AbortSignal
): Promise<DoctorPatientCardFacts | null> {
	return mapDoctorPatientCard(
		await httpSessionGet<ApiResponseData<'getDoctorPatient', 200>>(one(key), { signal })
	);
}

/** 🔴 D-W51-65: the next page of the card's «Επόμενα» or «Προηγούμενα» (this doctor only), as the doctor side reads it. */
export async function listDoctorPatientAppointments(
	key: DoctorPatientKey,
	request: { section: DoctorPatientAppointmentsSection; limit: number; cursor: string },
	signal?: AbortSignal
): Promise<DoctorAppointmentPageFacts> {
	return mapDoctorAppointmentPage(
		await httpSessionGet<ApiResponseData<'listDoctorPatientAppointments', 200>>(
			`${one(key)}/appointments`,
			{ params: request, signal }
		)
	);
}

/**
 * 🔴 D-W51-66 (screen 73 «Στοιχεία ασθενή»): the doctor's change of its OWN record (`PATCH …/record/{id}`); the key of
 * the card it answers, `null` for an answer that names none.
 */
export async function updateDoctorPatientRecord(
	recordId: string,
	patch: DoctorPatientRecordPatch
): Promise<DoctorPatientKey | null> {
	const body: ApiRequestBody<'updateDoctorPatientRecord'> = patch;
	return mapDoctorPatientKey(
		await httpSessionPatch<ApiResponseData<'updateDoctorPatientRecord', 200>>(
			one({ kind: 'record', id: recordId }),
			{ body }
		)
	);
}

/**
 * 🔴 D-W51-67 · U-198.2: the join of the doctor's record to an account patient of the same doctor on the same mobile
 * (`POST …/record/{id}/merge`) — only the doctor's side changes; the key of the account's card it answers.
 */
export async function mergeDoctorPatientRecord(
	recordId: string,
	patientId: string
): Promise<DoctorPatientKey | null> {
	const body: ApiRequestBody<'mergeDoctorPatientRecord'> = { patientId };
	return mapDoctorPatientKey(
		await httpSessionPost<ApiResponseData<'mergeDoctorPatientRecord', 200>>(
			`${one({ kind: 'record', id: recordId })}/merge`,
			{ body }
		)
	);
}
