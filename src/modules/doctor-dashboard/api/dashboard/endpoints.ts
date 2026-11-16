import type { ApiRequestBody, DoctorDashboardView } from '$shared/lib/api-client';
import { httpSessionGet, httpSessionPut } from '$shared/lib/http';
import { mapDoctorDashboard } from './map';
import type { DoctorDashboardFacts, DoctorDashboardMode } from './types';

const DASHBOARD_PATH = '/doctor/me/dashboard';

/** D-W51-10: «who am I as a doctor» of the session's own account (`no-store`, with the cookies); `null` for no answer. */
export async function getDoctorDashboard(
	signal?: AbortSignal
): Promise<DoctorDashboardFacts | null> {
	return mapDoctorDashboard(await httpSessionGet<DoctorDashboardView>(DASHBOARD_PATH, { signal }));
}

/**
 * D-W51-11: the mode the account opens in next time. `PATIENT` always; `DOCTOR` only with a marketplace licence (else the
 * server's `403`). It answers the whole dashboard again.
 */
export async function setDoctorDashboardMode(
	mode: DoctorDashboardMode
): Promise<DoctorDashboardFacts | null> {
	const body: ApiRequestBody<'setDoctorDashboardMode'> = { mode };
	return mapDoctorDashboard(
		await httpSessionPut<DoctorDashboardView>(`${DASHBOARD_PATH}/mode`, { body })
	);
}
