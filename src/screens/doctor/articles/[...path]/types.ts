import type { DoctorArticlesAddress } from '$modules/doctor-dashboard/lib/paths';

/** The route's data (D-W52-102 / 103): what the address shows, from the closed list. */
export type DoctorArticlesScreenData = { address: DoctorArticlesAddress };

export type DoctorArticlesScreenProps = { data: DoctorArticlesScreenData };
