import type { NotificationInboxFilter } from '$modules/notifications/api/inbox';
import { notificationInboxFilters } from '$modules/notifications/config/inbox';

/** 🔴 D-W45-49 (D-W45-01): «Ειδοποιήσεις», the list — a route of its own, the application's address. */
export const notificationsPath = '/notifications';

/**
 * A choice in the address (`?filter=new`): a fixed word of three, never a person's fact (🔴 U-65.6) — the way «Τα
 * ραντεβού μου» keeps «Ιστορικό» (`?tab=history`), so a reload, «back» and a copied link agree.
 */
export function notificationsSearch(filter: NotificationInboxFilter): string {
	return `?filter=${filter}`;
}

/** What `/notifications` shows: the choice the address names, or `null` — the page then opens on its own choice. */
export type NotificationsAddress = { filter: NotificationInboxFilter | null };

/**
 * 🔴 U-65.6: the address's query read against the closed list — any other word, a repeated one's rest, markup, a
 * long value: none of it is kept, the page opens as if nothing were asked.
 */
export function readNotificationsAddress(search: URLSearchParams): NotificationsAddress {
	const asked = search.get('filter');
	return { filter: notificationInboxFilters.find((filter) => filter === asked) ?? null };
}
