import type { DoctorProfileLoad } from '$modules/doctor/api/profile';
import type { DoctorDetailSection } from '$modules/doctor/lib/detail';

/** A window's own address: the profile's load and the window's section (anything else is the route's error page). */
export type DoctorDetailsScreenProps = {
	data: { load: Extract<DoctorProfileLoad, { state: 'ready' }>; section: DoctorDetailSection };
};
