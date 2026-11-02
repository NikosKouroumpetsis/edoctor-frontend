import type { DoctorProfileLoad } from '$modules/doctor/api/profile';

/** The profile's route data: its load (a missing profile or a failed read is the route's error page, never a screen). */
export type DoctorProfileScreenProps = {
	data: { load: Extract<DoctorProfileLoad, { state: 'ready' }> };
};
