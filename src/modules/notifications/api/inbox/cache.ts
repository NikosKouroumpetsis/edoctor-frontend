import type { InfiniteData, QueryClient } from '@tanstack/svelte-query';
import { notificationInboxKey, notificationInboxSideKey } from '$shared/lib/notification-inbox';
import { personalQueryMeta } from '$shared/query';
import type {
	NotificationInboxFilter,
	NotificationInboxPageFacts,
	NotificationInboxSide
} from './types';

/**
 * 🔴 U-65.6: every read below is one account's: `personalQueryMeta`, so a sign-out leaves none of it in the tab.
 * 🔴 D-W51-81 · D-W51-89: each side keeps its own count and its own lists (`$shared/lib/notification-inbox` says the
 * prefix, so another module asks a side again without knowing these keys): the patient's dots never show the doctor's.
 */
export const notificationInboxKeys = {
	all: notificationInboxKey,
	side: (side: NotificationInboxSide) => notificationInboxSideKey(side),
	/** 🔴 D-W45-17, D-W45-49: the ONE place of «how many are new» of a side — its bell, its menu's row and its list. */
	unread: (side: NotificationInboxSide) => [...notificationInboxSideKey(side), 'unread'] as const,
	lists: (side: NotificationInboxSide) => [...notificationInboxSideKey(side), 'list'] as const,
	list: (side: NotificationInboxSide, filter: NotificationInboxFilter, lang: string) =>
		[...notificationInboxSideKey(side), 'list', filter, lang] as const
};

type ListData = InfiniteData<NotificationInboxPageFacts, string | undefined>;

/** The choice a cached list is of — the fifth word of its key. */
const filterOf = (key: readonly unknown[]) => key[4] as NotificationInboxFilter | undefined;

/**
 * How many are new, as the server last said it (a page of the list, a write's answer), put where every reader finds
 * it — no second request. The key is marked first, so an answer that lands after a sign-out is still the sign-out's to
 * take (the centre's way, `$shared/lib/notification-preferences`).
 */
export function keepUnreadNotificationCount(
	client: QueryClient,
	side: NotificationInboxSide,
	count: number
): void {
	client.setQueryDefaults(notificationInboxKeys.unread(side), { meta: personalQueryMeta });
	client.setQueryData<number>(notificationInboxKeys.unread(side), count);
}

/**
 * What one side's lists and count held before a press, and the way back to it for a write the server refuses (the
 * other side is not this press's: it is left as it is).
 */
async function snapshot(client: QueryClient, side: NotificationInboxSide): Promise<() => void> {
	// A read still on its way would land over the press with what the server knew before it.
	await client.cancelQueries({ queryKey: notificationInboxKeys.side(side) });
	const lists = client.getQueriesData<ListData>({ queryKey: notificationInboxKeys.lists(side) });
	const count = client.getQueryData<number>(notificationInboxKeys.unread(side));
	return () => {
		for (const [key, data] of lists) client.setQueryData<ListData>(key, data);
		if (count !== undefined) client.setQueryData<number>(notificationInboxKeys.unread(side), count);
	};
}

/** Every cached list of one side written again, each by the choice it is of. */
function rewriteLists(
	client: QueryClient,
	side: NotificationInboxSide,
	write: (data: ListData, filter: NotificationInboxFilter | undefined) => ListData
): void {
	for (const [key, data] of client.getQueriesData<ListData>({
		queryKey: notificationInboxKeys.lists(side)
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
	side: NotificationInboxSide,
	notificationId: string
): Promise<() => void> {
	const back = await snapshot(client, side);
	rewriteLists(client, side, (data, filter) => ({
		...data,
		pages: data.pages.map((page) => ({
			...page,
			items:
				filter === 'new'
					? page.items.filter((item) => item.id !== notificationId)
					: page.items.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
		}))
	}));
	const count = client.getQueryData<number>(notificationInboxKeys.unread(side));
	if (count !== undefined) keepUnreadNotificationCount(client, side, Math.max(0, count - 1));
	return back;
}

/** «Σήμανση όλων ως διαβασμένων» at the press: «Νέες» is empty, nothing is new in «Όλες», the count is none. */
export async function previewAllNotificationsRead(
	client: QueryClient,
	side: NotificationInboxSide
): Promise<() => void> {
	const back = await snapshot(client, side);
	rewriteLists(client, side, (data, filter) =>
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
	keepUnreadNotificationCount(client, side, 0);
	return back;
}

/**
 * A write was kept: «Προηγούμενες» now has lines no page guessed, so its lists are asked again (those on screen at
 * once, the rest when they are next shown).
 */
export function settleNotificationLists(client: QueryClient, side: NotificationInboxSide): void {
	void client.invalidateQueries({
		queryKey: notificationInboxKeys.lists(side),
		predicate: (query) => filterOf(query.queryKey) === 'previous'
	});
}

/** The lists and the count no longer say what the server holds (a line that is gone, a refusal): all are asked again. */
export function refreshNotifications(client: QueryClient): void {
	void client.invalidateQueries({ queryKey: notificationInboxKeys.all });
}
