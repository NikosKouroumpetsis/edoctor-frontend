import type {
	ApiRequestBody,
	ApiResponseData,
	AppointmentDetailResponseView
} from '$shared/lib/api-client';
import { httpSessionGet, httpSessionPatch, httpSessionPost } from '$shared/lib/http';
import { mapAppointmentDetail, mapAppointmentPage } from './map';
import type {
	AppointmentCancelRequest,
	AppointmentChangeRequest,
	AppointmentCreateRequest,
	AppointmentDetailFacts,
	AppointmentListRequest,
	AppointmentPageFacts
} from './types';

const APPOINTMENTS = '/appointment/appointments';
const one = (appointmentId: string) => `${APPOINTMENTS}/${encodeURIComponent(appointmentId)}`;

/**
 * The booking's one write, with the cookies: the appointment the server made (`201`) as FACTS — `null` for an answer that
 * names none (review w3-w6 R1 MINOR-1: the contract's view never leaves `api/`).
 */
export async function createAppointment(
	request: AppointmentCreateRequest
): Promise<AppointmentDetailFacts | null> {
	const body: ApiRequestBody<'createAppointment'> = request;
	return mapAppointmentDetail(
		await httpSessionPost<ApiResponseData<'createAppointment', 201>>(APPOINTMENTS, { body })
	);
}

/** One appointment of the person (`GET /appointment/appointments/{id}`): the last page read again after a reload. */
export function getAppointment(
	appointmentId: string,
	signal?: AbortSignal
): Promise<AppointmentDetailResponseView> {
	return httpSessionGet<AppointmentDetailResponseView>(one(appointmentId), { signal });
}

/**
 * Screen 50: one page of the person's appointments, with the cookies — always the PATIENT side (`as=patient`, D-92: a
 * doctor's account reads its own visits here, never its practice), the tab bounded by the server's clock (`scope`,
 * D-118), «Επερχόμενα» oldest first, «Ιστορικό» newest first (the application's `resolveAppointmentListFilters`).
 */
export async function listAppointments(
	{ scope, limit, cursor }: AppointmentListRequest,
	signal?: AbortSignal
): Promise<AppointmentPageFacts> {
	return mapAppointmentPage(
		await httpSessionGet<ApiResponseData<'listAppointments', 200>>(APPOINTMENTS, {
			params: {
				as: 'patient',
				scope,
				sortDir: scope === 'upcoming' ? 'asc' : 'desc',
				limit,
				cursor
			},
			signal
		})
	);
}

/**
 * Screen 52's write (`PATCH`, the `booking` rate class): the hour, the person or the note, nothing else — the office
 * and the services stay (the server's rule). The answer is the appointment with its `actions`, `null` for none.
 */
export async function changeAppointment(
	appointmentId: string,
	request: AppointmentChangeRequest
): Promise<AppointmentDetailFacts | null> {
	const body: ApiRequestBody<'rescheduleAppointment'> = request;
	return mapAppointmentDetail(
		await httpSessionPatch<ApiResponseData<'rescheduleAppointment', 200>>(one(appointmentId), {
			body
		})
	);
}

/** Screen 53's write (`POST …/cancel`, idempotent on the server): the canceled appointment, `null` for none. */
export async function cancelAppointment(
	appointmentId: string,
	request: AppointmentCancelRequest
): Promise<AppointmentDetailFacts | null> {
	return mapAppointmentDetail(
		await httpSessionPost<ApiResponseData<'cancelAppointment', 200>>(
			`${one(appointmentId)}/cancel`,
			{ body: request }
		)
	);
}
