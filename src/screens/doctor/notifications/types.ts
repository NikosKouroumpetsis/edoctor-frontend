import type { NotificationsAddress } from '$modules/notifications/lib/paths';

/** The route's data (D-W51-89): the choice the address names, or none — screen 63's own reading of it. */
export type DoctorNotificationsScreenData = { address: NotificationsAddress };

export type DoctorNotificationsScreenProps = { data: DoctorNotificationsScreenData };
