import type {
	NotificationInboxPageView,
	NotificationInboxReadAllView,
	NotificationInboxReadView,
	NotificationInboxUnreadCountView
} from '$shared/lib/api-client';
import { ApiError, httpSessionGet, httpSessionPost } from '$shared/lib/http';
import { isUuid } from '$shared/lib/ids';
import { mapNotificationInboxPage, mapUnreadCount } from './map';
import type { NotificationInboxFilter, NotificationInboxPageFacts } from './types';

const BASE = '/notification/inbox/me';

/** The lines a page asks for (the server's default; its cap is 50). */
export const NOTIFICATIONS_PAGE_LIMIT = 20;

/**
 * Wave 4.5 · screen 63 (D-W45-46): one page of the account's list, with the cookies. The words of each line come in
 * `lang` — the PAGE's language, said in the address of the request (the server reads no `Accept-Language` here).
 */
export function listNotifications(
	request: { filter: NotificationInboxFilter; lang: string; cursor?: string },
	signal?: AbortSignal
): Promise<NotificationInboxPageFacts> {
	return httpSessionGet<NotificationInboxPageView>(BASE, {
		params: {
			filter: request.filter,
			lang: request.lang,
			limit: NOTIFICATIONS_PAGE_LIMIT,
			cursor: request.cursor
		},
		signal
	}).then(mapNotificationInboxPage);
}

/** How many of the account's notifications are still new (`GET …/unread-count`): the dots' one read. */
export function countUnreadNotifications(signal?: AbortSignal): Promise<number> {
	return httpSessionGet<NotificationInboxUnreadCountView>(`${BASE}/unread-count`, { signal }).then(
		(view) => mapUnreadCount(view?.unreadCount)
	);
}

/**
 * 🔴 U-174 (Ε2 Β): «read» for ONE line — the press's one request (`POST …/:id/read`, an empty body). 🔴 U-65.6: the id
 * goes into the path, so anything that is not the server's own shape of one never leaves the page (told as the
 * server's own «not found»). Answers how many are still new, so no second request is needed.
 */
export function markNotificationRead(notificationId: string): Promise<number> {
	const path = `${BASE}/${encodeURIComponent(notificationId)}/read`;
	if (!isUuid(notificationId)) {
		return Promise.reject(new ApiError('Resource not found', 404, path));
	}
	return httpSessionPost<NotificationInboxReadView>(path).then((view) =>
		mapUnreadCount(view?.unreadCount)
	);
}

/** «Σήμανση όλων ως διαβασμένων» (`POST …/read-all`, an empty body): how many are still new after it. */
export function markAllNotificationsRead(): Promise<number> {
	return httpSessionPost<NotificationInboxReadAllView>(`${BASE}/read-all`).then((view) =>
		mapUnreadCount(view?.unreadCount)
	);
}
