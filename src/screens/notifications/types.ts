import type { NotificationsAddress } from '$modules/notifications/lib/paths';

/** The route's data (D-W45-49): the choice the address names, or none. */
export type NotificationsScreenData = { address: NotificationsAddress };

export type NotificationsScreenProps = { data: NotificationsScreenData };
