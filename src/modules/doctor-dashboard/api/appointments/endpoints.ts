import type { ApiRequestBody, ApiResponseData } from '$shared/lib/api-client';
import {
	httpSessionGet,
	httpSessionPatch,
	httpSessionPost,
	httpSessionPut
} from '$shared/lib/http';
import {
	mapDoctorAppointmentDetail,
	mapDoctorAppointmentPage,
	mapDoctorNewSlots,
	mapDoctorRescheduleSlots,
	mapDoctorServices
} from './map';
import type {
	DoctorAppointmentDetailFacts,
	DoctorAppointmentListRequest,
	DoctorAppointmentOutcome,
	DoctorAppointmentPageFacts,
	DoctorCancelRequest,
	DoctorChargesRequest,
	DoctorNewAppointmentRequest,
	DoctorRejectRequest,
	DoctorRescheduleSlotsFacts,
	DoctorServiceFacts
} from './types';

const APPOINTMENTS = '/appointment/appointments';
const one = (appointmentId: string) => `${APPOINTMENTS}/${encodeURIComponent(appointmentId)}`;

/**
 * 🔴 D-W51-22: one page of the doctor's side of the list, with the cookies — ALWAYS `as=doctor` (the doctor's practice,
 * never their own visits as a patient, D-92), oldest first unless the request asks `desc` (screen 67's history,
 * D-W51-29). The request names the requests, a window or one of the server's tabs, and the office when one is chosen.
 */
export async function listDoctorAppointments(
	request: DoctorAppointmentListRequest,
	signal?: AbortSignal
): Promise<DoctorAppointmentPageFacts> {
	const { sortDir = 'asc', officeId, ...filter } = request;
	return mapDoctorAppointmentPage(
		await httpSessionGet<ApiResponseData<'listAppointments', 200>>(APPOINTMENTS, {
			params: { ...filter, ...(officeId ? { officeId } : {}), as: 'doctor', sortDir },
			signal
		})
	);
}

/**
 * 🔴 Screen 68 (D-W51-33, D-W51-38): one appointment of the doctor's side, with the cookies (`GET …/{id}`: the side
 * comes from the appointment itself) — the detail as FACTS, `null` for an answer that names none. Another doctor's
 * appointment is the server's one `403`, read by the page as «not found» (D-W51-06).
 */
export async function getDoctorAppointment(
	appointmentId: string,
	signal?: AbortSignal
): Promise<DoctorAppointmentDetailFacts | null> {
	return mapDoctorAppointmentDetail(
		await httpSessionGet<ApiResponseData<'getAppointment', 200>>(one(appointmentId), { signal })
	);
}

/**
 * 🔴 D-W51-25: «Επιβεβαίωση», one tap (`POST …/confirm`, idempotent on a booked one, `409` on one that closed): the
 * appointment the server answered as the detail's FACTS (every write answers the whole appointment, D-W51-33), `null`
 * for an answer that names none.
 */
export async function confirmDoctorAppointment(
	appointmentId: string
): Promise<DoctorAppointmentDetailFacts | null> {
	const body: ApiRequestBody<'confirmAppointment'> = {};
	return mapDoctorAppointmentDetail(
		await httpSessionPost<ApiResponseData<'confirmAppointment', 200>>(
			`${one(appointmentId)}/confirm`,
			{ body }
		)
	);
}

/**
 * 🔴 D-W51-25: «Δεν ήρθε» / «Ολοκληρώθηκε», one tap (`POST …/outcome`, `409` before the start or once settled): the
 * detail's FACTS as answered.
 */
export async function declareDoctorAppointmentOutcome(
	appointmentId: string,
	outcome: DoctorAppointmentOutcome
): Promise<DoctorAppointmentDetailFacts | null> {
	const body: ApiRequestBody<'declareAppointmentOutcome'> = { outcome };
	return mapDoctorAppointmentDetail(
		await httpSessionPost<ApiResponseData<'declareAppointmentOutcome', 200>>(
			`${one(appointmentId)}/outcome`,
			{ body }
		)
	);
}

/**
 * 🔴 Screen 69 (D-W51-47, D-W51-48): «Απόρριψη αιτήματος» (`POST …/reject`, `409` on a request no longer waiting): the
 * reason of the doctor's four and the words, at most 500 (U-65.6 / D-W51-34, the server checks them again) — the
 * appointment the server answered as the detail's FACTS, `null` for an answer that names none.
 */
export async function rejectDoctorAppointment(
	appointmentId: string,
	request: DoctorRejectRequest
): Promise<DoctorAppointmentDetailFacts | null> {
	const body: ApiRequestBody<'rejectAppointment'> = request;
	return mapDoctorAppointmentDetail(
		await httpSessionPost<ApiResponseData<'rejectAppointment', 200>>(
			`${one(appointmentId)}/reject`,
			{ body }
		)
	);
}

/**
 * 🔴 Screen 69 (D-W51-47, D-W51-48): «Ακύρωση ραντεβού» by the doctor (`POST …/cancel`, at any hour; `409` on one that
 * closed): the reason of the doctor's three and the words, at most 500 — the detail's FACTS as answered.
 */
export async function cancelDoctorAppointment(
	appointmentId: string,
	request: DoctorCancelRequest
): Promise<DoctorAppointmentDetailFacts | null> {
	const body: ApiRequestBody<'cancelAppointment'> = request;
	return mapDoctorAppointmentDetail(
		await httpSessionPost<ApiResponseData<'cancelAppointment', 200>>(
			`${one(appointmentId)}/cancel`,
			{ body }
		)
	);
}

/**
 * 🔴 Screen 70 «Αλλαγή ώρας» (D-W51-41, U-189.1): the doctor's REAL free hours to move one appointment to
 * (`GET …/reschedule-slots`) — `days` from `date` (the server's «today» without one), at its own office and for its own
 * length, the appointment itself not busy; as FACTS.
 */
export async function listDoctorRescheduleSlots(
	appointmentId: string,
	window: { date: string | undefined; days: number },
	signal?: AbortSignal
): Promise<DoctorRescheduleSlotsFacts> {
	const params = { ...(window.date ? { date: window.date } : {}), days: window.days };
	return mapDoctorRescheduleSlots(
		await httpSessionGet<ApiResponseData<'listAppointmentRescheduleSlots', 200>>(
			`${one(appointmentId)}/reschedule-slots`,
			{ params, signal }
		)
	);
}

/**
 * 🔴 Screen 70 (D-W51-42, U-190.2): the doctor moves the appointment to one of those hours (`PATCH …/{id}` with the hour
 * alone) — a request is confirmed in the same write, a kept one stays kept; the detail's FACTS as answered.
 */
export async function moveDoctorAppointment(
	appointmentId: string,
	startTime: string
): Promise<DoctorAppointmentDetailFacts | null> {
	const body: ApiRequestBody<'rescheduleAppointment'> = { startTime };
	return mapDoctorAppointmentDetail(
		await httpSessionPatch<ApiResponseData<'rescheduleAppointment', 200>>(one(appointmentId), {
			body
		})
	);
}

/**
 * 🔴 Screen 70 «Υπηρεσίες και κόστος» (D-W51-44): the services and the final price in ONE write (`PUT …/charges`; the
 * server decides the VAT, the length is the longest service) — the detail's FACTS as answered.
 */
export async function editDoctorAppointmentCharges(
	appointmentId: string,
	request: DoctorChargesRequest
): Promise<DoctorAppointmentDetailFacts | null> {
	const body: ApiRequestBody<'editAppointmentCharges'> = request;
	return mapDoctorAppointmentDetail(
		await httpSessionPut<ApiResponseData<'editAppointmentCharges', 200>>(
			`${one(appointmentId)}/charges`,
			{ body }
		)
	);
}

/**
 * 🔴 Screen 70 «Υπηρεσίες και κόστος» (D-W51-44): the doctor's own services (`GET /doctor-service/doctor-services`: the
 * session names the doctor, nothing in the request does), each titled in the page's language; as FACTS.
 */
export async function listDoctorServices(signal?: AbortSignal): Promise<DoctorServiceFacts[]> {
	return mapDoctorServices(
		await httpSessionGet<ApiResponseData<'listDoctorServices', 200>>(
			'/doctor-service/doctor-services',
			{ signal }
		)
	);
}

/**
 * 🔴 Screen 72 (D-W51-56, U-189.1): the doctor's REAL free hours for a NEW appointment (`GET /appointment/doctor/slots`)
 * — at one of its offices, for the chosen services (the longest decides the length), `days` from `date` (the server's
 * «today» without one); as FACTS.
 */
export async function listDoctorNewSlots(
	window: {
		officeId: string;
		doctorServiceIds: readonly string[];
		date: string | undefined;
		days: number;
	},
	signal?: AbortSignal
): Promise<DoctorRescheduleSlotsFacts> {
	const params = {
		officeId: window.officeId,
		doctorServiceIds: [...window.doctorServiceIds],
		...(window.date ? { date: window.date } : {}),
		days: window.days
	};
	return mapDoctorNewSlots(
		await httpSessionGet<ApiResponseData<'listDoctorSlots', 200>>('/appointment/doctor/slots', {
			params,
			signal
		})
	);
}

/**
 * 🔴 Screen 72 (D-W51-56, U-197.2): «Κλείσιμο ραντεβού» — ONE write of the doctor side (`POST /appointment/appointments`),
 * `booked` at once, for exactly one person; the appointment the server answered as the detail's FACTS (its 68 opens on
 * it), `null` for an answer that names none.
 */
export async function createDoctorAppointment(
	request: DoctorNewAppointmentRequest
): Promise<DoctorAppointmentDetailFacts | null> {
	const body: ApiRequestBody<'createAppointment'> = request;
	return mapDoctorAppointmentDetail(
		await httpSessionPost<ApiResponseData<'createAppointment', 201>>(APPOINTMENTS, { body })
	);
}
