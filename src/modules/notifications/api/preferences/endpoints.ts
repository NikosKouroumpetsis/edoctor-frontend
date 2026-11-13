import type { QueryClient } from '@tanstack/svelte-query';
import { saveNotificationPreferences } from '$shared/lib/notification-preferences';
import type { NotificationPreferenceChange } from './types';

/**
 * 🔴 D-W45-24: one press of a switch is ONE write of that ONE cell (`PUT /notification/preferences/me`,
 * `cells: [{ category, channel, enabled }]` — a patch: every other cell keeps its value). The server's answer goes to
 * the cache every reader of the centre shares; nothing of it is returned.
 */
export function saveNotificationPreference(
	client: QueryClient,
	change: NotificationPreferenceChange
): Promise<void> {
	const { category, channel, enabled } = change;
	return saveNotificationPreferences(client, [{ category, channel, enabled }]);
}
