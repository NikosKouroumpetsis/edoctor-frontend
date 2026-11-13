import type { NotificationGroupSeed } from '$modules/notifications/types';

/**
 * 🔴 D-W45-22 (wave 4.5, screen 60): the three groups of «Ειδοποιήσεις» and the kinds each lists, in the page's order
 * (record §5.5). The grouping is the site's own, a fixed table; WHICH kinds and channels an account has is the
 * server's answer. Only the patient's kinds are here: the doctor's own belong to the doctor's dashboard (U-164.1).
 */
export const notificationGroups: readonly NotificationGroupSeed[] = [
	{ id: 'appointments', categories: ['APPOINTMENT_UPDATES', 'REMINDERS', 'RATINGS'] },
	{ id: 'messages', categories: ['MESSAGES', 'QUESTIONS'] },
	{ id: 'account', categories: ['ACCOUNT'] }
];
