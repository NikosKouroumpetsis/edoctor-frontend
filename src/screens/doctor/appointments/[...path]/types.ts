import type { DoctorAppointmentsAddress } from '$modules/doctor-dashboard/lib/paths';

/** The route's data (D-W51-31): what the address shows, from the closed list. */
export type DoctorAppointmentsScreenData = { address: DoctorAppointmentsAddress };

export type DoctorAppointmentsScreenProps = { data: DoctorAppointmentsScreenData };
