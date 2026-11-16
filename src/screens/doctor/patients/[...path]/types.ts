import type { DoctorPatientsAddress } from '$modules/doctor-dashboard/lib/paths';

/** The route's data (D-W51-73): what the address shows, from the closed list. */
export type DoctorPatientsScreenData = { address: DoctorPatientsAddress };

export type DoctorPatientsScreenProps = { data: DoctorPatientsScreenData };
