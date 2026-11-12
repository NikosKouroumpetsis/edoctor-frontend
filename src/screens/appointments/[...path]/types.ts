import type { AppointmentsAddress } from '$modules/appointments/lib/paths';

/** The route's data (D-W4-20): what the address shows, from the closed list. */
export type AppointmentsScreenData = { address: AppointmentsAddress };

export type AppointmentsScreenProps = { data: AppointmentsScreenData };
