import type { DoctorMessagesAddress } from '$modules/messages/lib/paths';

/** The route's data (D-W51-85): what the address shows, from the closed list. */
export type DoctorMessagesScreenData = { address: DoctorMessagesAddress };

export type DoctorMessagesScreenProps = { data: DoctorMessagesScreenData };
