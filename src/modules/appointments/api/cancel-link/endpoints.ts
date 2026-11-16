import type { ApiResponseData } from '$shared/lib/api-client';
import { ApiError, httpGet, httpPublicPost } from '$shared/lib/http';
import { mapAppointmentCancelLink } from './map';
import type { AppointmentCancelLinkFacts, AppointmentCancelLinkRequest } from './types';

const CANCEL_LINKS = '/appointment/public/cancel-links';

/**
 * 🔴 D-W51-72: the link's secret goes ONLY in the request's address — never in an error the page may keep or show: a
 * refusal comes back with the route's name in place of the address (status, code and details kept).
 */
function withoutToken(error: unknown): unknown {
	if (!(error instanceof ApiError)) return error;
	return new ApiError(
		error.message,
		error.status,
		`${CANCEL_LINKS}/:cancelToken`,
		error.errorCode,
		error.details
	);
}

const linkPath = (token: string) => `${CANCEL_LINKS}/${encodeURIComponent(token)}`;

/**
 * 🔴 D-W51-72 · U-198.1: the page of one cancel link, with NO session (never the cookies) — the doctor, the hour, the
 * office and the terms as FACTS, `null` for an answer that names none. Every link that cancels nothing is the server's
 * one `404`.
 */
export async function getAppointmentCancelLink(
	token: string,
	signal?: AbortSignal
): Promise<AppointmentCancelLinkFacts | null> {
	try {
		return mapAppointmentCancelLink(
			await httpGet<ApiResponseData<'getAppointmentCancelLink', 200>>(linkPath(token), { signal })
		);
	} catch (error) {
		throw withoutToken(error);
	}
}

/**
 * 🔴 D-W51-72 · U-198.1: the patient without an account cancels the ONE visit of the link (`POST`, no session) — by the
 * rules of a patient's own cancel; the canceled visit's page as answered.
 */
export async function cancelAppointmentByLink(
	token: string,
	request: AppointmentCancelLinkRequest
): Promise<AppointmentCancelLinkFacts | null> {
	const body: AppointmentCancelLinkRequest = request;
	try {
		return mapAppointmentCancelLink(
			await httpPublicPost<ApiResponseData<'cancelAppointmentByLink', 200>>(linkPath(token), {
				body
			})
		);
	} catch (error) {
		throw withoutToken(error);
	}
}
