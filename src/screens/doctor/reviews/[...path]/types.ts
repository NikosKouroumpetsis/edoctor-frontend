import type { DoctorReviewsAddress } from '$modules/doctor-dashboard/lib/paths';

/** The route's data (D-W52-91 / 92): what the address shows, from the closed list. */
export type DoctorReviewsScreenData = { address: DoctorReviewsAddress };

export type DoctorReviewsScreenProps = { data: DoctorReviewsScreenData };
