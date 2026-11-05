import type { DoctorProfileLoad } from '$modules/doctor/api/profile';

/** The doctor's page: its route's load (a missing profile or a failed read is the route's error page). */
export type DoctorAboutScreenProps = {
	data: { load: Extract<DoctorProfileLoad, { state: 'ready' }> };
};
