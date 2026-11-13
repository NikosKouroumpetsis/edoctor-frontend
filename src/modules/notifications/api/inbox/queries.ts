import { infiniteQueryOptions, queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { keepUnreadNotificationCount, notificationInboxKeys } from './cache';
import { countUnreadNotifications, listNotifications } from './endpoints';
import type { NotificationInboxFilter } from './types';

/** A refusal that asking again does not change: the session ended, or the account may not. */
const retryUnlessRefused = (failures: number, error: unknown) =>
	!(error instanceof ApiError && [401, 403].includes(error.status)) && failures < 1;

/**
 * 🔴 D-W45-17 · D-W45-49: «how many are new», the ONE read behind every dot — one key, so the bell, the menu's row and
 * the list never ask twice. No timer: it is asked again whenever the page comes back to the front (`always`, however
 * fresh the last answer) and every write answers its new value. 🔴 U-65.6: personal; the caller enables it for a
 * member in the browser only — a guest, or a session not known yet, asks nothing.
 */
export function notificationUnreadCountQuery() {
	return queryOptions({
		queryKey: notificationInboxKeys.unread(),
		queryFn: ({ signal }) => countUnreadNotifications(signal),
		refetchOnWindowFocus: 'always',
		retry: retryUnlessRefused,
		meta: personalQueryMeta
	});
}

/**
 * Screen 63: one choice of the list as an INFINITE (cursor) read — «Εμφάνιση παλαιότερων» asks the next page by the
 * last one's `nextCursor`, and the pages add up. The words come in `lang`, so each language keeps its own pages. Every
 * page also says how many are new: it goes to the dots' one place. 🔴 U-65.6: personal, gone at a sign-out.
 */
export function notificationInboxQuery(filter: NotificationInboxFilter, lang: string) {
	return infiniteQueryOptions({
		queryKey: notificationInboxKeys.list(filter, lang),
		queryFn: async ({ client, pageParam, signal }) => {
			const page = await listNotifications({ filter, lang, cursor: pageParam }, signal);
			keepUnreadNotificationCount(client, page.unreadCount);
			return page;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (page) => page.nextCursor ?? undefined,
		retry: retryUnlessRefused,
		meta: personalQueryMeta
	});
}
