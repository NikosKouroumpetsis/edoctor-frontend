import type { InfiniteData, QueryClient } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import type { NotificationInboxFilter, NotificationInboxPageFacts } from './types';

/** 🔴 U-65.6: every read below is one account's: `personalQueryMeta`, so a sign-out leaves none of it in the tab. */
export const notificationInboxKeys = {
	all: ['notifications', 'inbox'] as const,
	/** 🔴 D-W45-17, D-W45-49: the ONE place of «how many are new» — the bell, the menu's row and the list share it. */
	unread: () => ['notifications', 'inbox', 'unread'] as const,
	lists: () => ['notifications', 'inbox', 'list'] as const,
	list: (filter: NotificationInboxFilter, lang: string) =>
		['notifications', 'inbox', 'list', filter, lang] as const
};

type ListData = InfiniteData<NotificationInboxPageFacts, string | undefined>;

/** The choice a cached list is of — the fourth word of its key. */
const filterOf = (key: readonly unknown[]) => key[3] as NotificationInboxFilter | undefined;

/**
 * How many are new, as the server last said it (a page of the list, a write's answer), put where every reader finds
 * it — no second request. The key is marked first, so an answer that lands after a sign-out is still the sign-out's to
 * take (the centre's way, `$shared/lib/notification-preferences`).
 */
export function keepUnreadNotificationCount(client: QueryClient, count: number): void {
	client.setQueryDefaults(notificationInboxKeys.unread(), { meta: personalQueryMeta });
	client.setQueryData<number>(notificationInboxKeys.unread(), count);
}

/** What the lists and the count held before a press, and the way back to it for a write the server refuses. */
async function snapshot(client: QueryClient): Promise<() => void> {
	// A read still on its way would land over the press with what the server knew before it.
	await client.cancelQueries({ queryKey: notificationInboxKeys.all });
	const lists = client.getQueriesData<ListData>({ queryKey: notificationInboxKeys.lists() });
	const count = client.getQueryData<number>(notificationInboxKeys.unread());
	return () => {
		for (const [key, data] of lists) client.setQueryData<ListData>(key, data);
		if (count !== undefined) client.setQueryData<number>(notificationInboxKeys.unread(), count);
	};
}

/** Every cached list written again, each by the choice it is of. */
function rewriteLists(
	client: QueryClient,
	write: (data: ListData, filter: NotificationInboxFilter | undefined) => ListData
): void {
	for (const [key, data] of client.getQueriesData<ListData>({
		queryKey: notificationInboxKeys.lists()
	})) {
		if (data) client.setQueryData<ListData>(key, write(data, filterOf(key)));
	}
}

/**
 * 🔴 U-174 (Ε2 Β): a line is read AT the press, before the server answers — it leaves «Νέες», it is no longer new in
 * «Όλες», and one fewer is new everywhere. Answers the way back. «Προηγούμενες» is not guessed: it is asked again once
 * the write is kept (`settleNotificationLists`).
 */
export async function previewNotificationRead(
	client: QueryClient,
	notificationId: string
): Promise<() => void> {
	const back = await snapshot(client);
	rewriteLists(client, (data, filter) => ({
		...data,
		pages: data.pages.map((page) => ({
			...page,
			items:
				filter === 'new'
					? page.items.filter((item) => item.id !== notificationId)
					: page.items.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
		}))
	}));
	const count = client.getQueryData<number>(notificationInboxKeys.unread());
	if (count !== undefined) keepUnreadNotificationCount(client, Math.max(0, count - 1));
	return back;
}

/** «Σήμανση όλων ως διαβασμένων» at the press: «Νέες» is empty, nothing is new in «Όλες», the count is none. */
export async function previewAllNotificationsRead(client: QueryClient): Promise<() => void> {
	const back = await snapshot(client);
	rewriteLists(client, (data, filter) =>
		filter === 'new'
			? {
					pages: [{ items: [], nextCursor: null, unreadCount: 0 }],
					pageParams: [undefined]
				}
			: {
					...data,
					pages: data.pages.map((page) => ({
						...page,
						items: page.items.map((item) => (item.read ? item : { ...item, read: true }))
					}))
				}
	);
	keepUnreadNotificationCount(client, 0);
	return back;
}

/**
 * A write was kept: «Προηγούμενες» now has lines no page guessed, so its lists are asked again (those on screen at
 * once, the rest when they are next shown).
 */
export function settleNotificationLists(client: QueryClient): void {
	void client.invalidateQueries({
		queryKey: notificationInboxKeys.lists(),
		predicate: (query) => filterOf(query.queryKey) === 'previous'
	});
}

/** The lists and the count no longer say what the server holds (a line that is gone, a refusal): all are asked again. */
export function refreshNotifications(client: QueryClient): void {
	void client.invalidateQueries({ queryKey: notificationInboxKeys.all });
}
