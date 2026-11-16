import type {
	NotificationInboxPageView,
	NotificationInboxReadAllView,
	NotificationInboxReadView,
	NotificationInboxUnreadCountView
} from '$shared/lib/api-client';
import { ApiError, httpSessionGet, httpSessionPost } from '$shared/lib/http';
import { isUuid } from '$shared/lib/ids';
import { mapNotificationInboxPage, mapUnreadCount } from './map';
import type {
	NotificationInboxFilter,
	NotificationInboxPageFacts,
	NotificationInboxSide
} from './types';

const BASE = '/notification/inbox/me';

/** The lines a page asks for (the server's default; its cap is 50). */
export const NOTIFICATIONS_PAGE_LIMIT = 20;

/**
 * Wave 4.5 · screen 63 (D-W45-46): one page of the account's list, with the cookies. The words of each line come in
 * `lang` — the PAGE's language, said in the address of the request (the server reads no `Accept-Language` here).
 * 🔴 D-W51-89: always of ONE side, said aloud (`side`): the patient's mode asks `patient`, the doctor's `doctor`.
 */
export function listNotifications(
	request: {
		side: NotificationInboxSide;
		filter: NotificationInboxFilter;
		lang: string;
		cursor?: string;
	},
	signal?: AbortSignal
): Promise<NotificationInboxPageFacts> {
	return httpSessionGet<NotificationInboxPageView>(BASE, {
		params: {
			side: request.side,
			filter: request.filter,
			lang: request.lang,
			limit: NOTIFICATIONS_PAGE_LIMIT,
			cursor: request.cursor
		},
		signal
	}).then(mapNotificationInboxPage);
}

/** How many of one side's notifications are still new (`GET …/unread-count?side=`): the dots' one read. */
export function countUnreadNotifications(
	side: NotificationInboxSide,
	signal?: AbortSignal
): Promise<number> {
	return httpSessionGet<NotificationInboxUnreadCountView>(`${BASE}/unread-count`, {
		params: { side },
		signal
	}).then((view) => mapUnreadCount(view?.unreadCount));
}

/**
 * 🔴 U-174 (Ε2 Β): «read» for ONE line — the press's one request (`POST …/:id/read`, an empty body). 🔴 U-65.6: the id
 * goes into the path, so anything that is not the server's own shape of one never leaves the page (told as the
 * server's own «not found»). Answers how many of the line's side are still new, so no second request is needed (the
 * server knows the line's side: none is sent, D-W51-81).
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

/**
 * «Σήμανση όλων ως διαβασμένων» (`POST …/read-all?side=`, an empty body): ONE side's lines (D-W51-81), and how many of
 * it are still new after it.
 */
export function markAllNotificationsRead(side: NotificationInboxSide): Promise<number> {
	return httpSessionPost<NotificationInboxReadAllView>(`${BASE}/read-all`, {
		params: { side }
	}).then((view) => mapUnreadCount(view?.unreadCount));
}
