import type { DoctorServiceFacts } from '$modules/doctor/api/profile';

/**
 * The doctor's primary visit (the application's `resolvePrimaryDoctorService`): the first service — the backend
 * lists the common visit first; `undefined` without services (no slots to ask, no fee to show, U-38.1).
 */
export function resolvePrimaryDoctorService(
	services: DoctorServiceFacts[] | undefined
): DoctorServiceFacts | undefined {
	return services?.[0];
}
