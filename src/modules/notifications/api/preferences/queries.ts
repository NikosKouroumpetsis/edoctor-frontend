import { queryOptions } from '@tanstack/svelte-query';
import {
	getNotificationPreferences,
	notificationPreferencesKey
} from '$shared/lib/notification-preferences';
import { personalQueryMeta } from '$shared/query';
import { mapNotificationPreferences } from './map';

/**
 * Screen 60: the account's centre, read in the browser for a member; 🔴 U-65.6: personal, gone at a sign-out. ONE read
 * and one place in the cache for the whole site (`$shared/lib/notification-preferences`): the inbox's «Ρυθμίσεις
 * μηνυμάτων» reads the same answer, so neither page shows the other's switch as it was. The cache keeps the server's
 * answer; the page reads its facts out of it (`select`).
 */
export function notificationPreferencesQuery() {
	return queryOptions({
		queryKey: notificationPreferencesKey,
		queryFn: ({ signal }) => getNotificationPreferences(signal),
		select: mapNotificationPreferences,
		meta: personalQueryMeta
	});
}
