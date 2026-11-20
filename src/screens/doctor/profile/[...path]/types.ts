import type { DoctorProfileAddress } from '$modules/doctor-dashboard/lib/paths';

/** The route's data (D-W52-41): what the address shows, from the closed list. */
export type DoctorProfileScreenData = { address: DoctorProfileAddress };

export type DoctorProfileScreenProps = { data: DoctorProfileScreenData };
