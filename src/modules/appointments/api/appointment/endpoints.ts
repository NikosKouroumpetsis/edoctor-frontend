import type {
	ApiRequestBody,
	ApiResponseData,
	AppointmentDetailResponseView
} from '$shared/lib/api-client';
import { httpSessionGet, httpSessionPost } from '$shared/lib/http';
import { mapAppointment } from './map';
import type { AppointmentCreateRequest, AppointmentFacts } from './types';

/**
 * The booking's one write, with the cookies: the appointment the server made (`201`) as FACTS — `null` for an answer that
 * names none (review w3-w6 R1 MINOR-1: the contract's view never leaves `api/`).
 */
export async function createAppointment(
	request: AppointmentCreateRequest
): Promise<AppointmentFacts | null> {
	const body: ApiRequestBody<'createAppointment'> = request;
	return mapAppointment(
		await httpSessionPost<ApiResponseData<'createAppointment', 201>>('/appointment/appointments', {
			body
		})
	);
}

/** One appointment of the person (`GET /appointment/appointments/{id}`): the last page read again after a reload. */
export function getAppointment(
	appointmentId: string,
	signal?: AbortSignal
): Promise<AppointmentDetailResponseView> {
	return httpSessionGet<AppointmentDetailResponseView>(
		`/appointment/appointments/${encodeURIComponent(appointmentId)}`,
		{ signal }
	);
}
