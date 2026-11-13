import { createInfiniteQuery, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { untrack } from 'svelte';
import { browser } from '$app/environment';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	keepUnreadNotificationCount,
	markAllNotificationsRead,
	markNotificationRead,
	notificationInboxQuery,
	notificationUnreadCountQuery,
	previewAllNotificationsRead,
	previewNotificationRead,
	readNotificationInboxFailure,
	refreshNotifications,
	settleNotificationLists,
	type NotificationInboxFilter
} from '$modules/notifications/api/inbox';
import {
	buildNotificationFilters,
	buildNotificationRows,
	notificationInboxViewOf,
	readNotificationItems,
	resolveNotificationFilter
} from '$modules/notifications/lib/inbox';
import type { NotificationsViewer } from '$modules/notifications/types';

/**
 * Screen 63 (record §5.8, D-W45-49): the account's list of notifications — read in the browser for a member only
 * (U-80.1 Ε6: the page's server knows nobody; a guest and a session not known yet ask NOTHING), gone at a sign-out.
 * The choice on screen is the address's, else the page's own: «Νέες» while something is new, «Όλες» when nothing is —
 * decided ONCE, when the count is first known, and kept for the visit (reading the last new line does not move the
 * reader to another choice). 🔴 U-174 (Ε2 Β): a line is read only by a press — at the press, one request, undone if the
 * server refuses it. How many are new is the dots' one read (`notificationUnreadCountQuery`), never a second one.
 */
export function useNotificationInbox(options: {
	viewer: () => NotificationsViewer;
	/** The choice the address names, `null` for none. */
	asked: () => NotificationInboxFilter | null;
	locale: () => SupportedLocale;
	offline: () => boolean;
	/** A write the server refused with `401`: the session ended. */
	onSessionEnded: () => void;
	/** A read the server refused with `401`: the page asks who it is. */
	onReadRefused: () => void;
	/** «Σήμανση όλων ως διαβασμένων» was not kept (and the session did not end): the page says so in passing. */
	onReadAllFailed: () => void;
}) {
	const client = useQueryClient();
	const member = $derived(options.viewer() === 'member');

	const count = createQuery(() => ({
		...notificationUnreadCountQuery(),
		enabled: browser && member
	}));
	const unread = $derived(member ? (count.data ?? null) : null);

	// The page's own choice, taken once per visit; a sign-out forgets it.
	let opened = $state<'new' | 'all' | null>(null);
	$effect(() => {
		if (!member) {
			opened = null;
			return;
		}
		if (untrack(() => opened) !== null) return;
		const own = resolveNotificationFilter(null, unread);
		// A count that could not be read opens «Όλες»: the list itself is still asked.
		if (own === 'new' || own === 'all') opened = own;
		else if (count.isError) opened = 'all';
	});
	const filter = $derived(member ? (options.asked() ?? opened) : null);

	const list = createInfiniteQuery(() => ({
		...notificationInboxQuery(filter ?? 'all', options.locale()),
		enabled: browser && member && filter !== null
	}));
	const data = $derived(member && filter !== null ? list.data : undefined);
	const failed = $derived(member && filter !== null && list.isError && data === undefined);
	const rows = $derived(
		buildNotificationRows(readNotificationItems(data?.pages), {
			now: readServerNow(),
			locale: options.locale()
		})
	);
	const view = $derived(
		notificationInboxViewOf({
			viewer: options.viewer(),
			filter,
			failed,
			loaded: data !== undefined,
			offline: options.offline(),
			rows: rows.length
		})
	);
	const filters = $derived(
		buildNotificationFilters(filter, unread ?? 0, { locale: options.locale() })
	);

	// Record §5.8: the wait draws no choices — the FIRST wait. Once a choice has been on screen, another one that is
	// still being read keeps the three choices over its wait (the application's way, `w45-a7` Κ2): they never blink
	// away at each press, nor does the menu from 950.
	let shown = $state(false);
	$effect(() => {
		if (!member) shown = false;
		else if (view === 'rows' || view === 'empty') shown = true;
	});
	const plain = $derived(
		view === 'guest' || view === 'failed' || view === 'none' || (view === 'loading' && !shown)
	);

	// A session that ended shows in a read first: the page asks who it is, once per refusal (the count's own refusal
	// is the host's to tell, `ui/unread-host`).
	$effect(() => {
		if (member && readNotificationInboxFailure(list.error) === 'session') {
			untrack(() => options.onReadRefused());
		}
	});

	// The lines whose «read» is on its way: a second press of one sends nothing. (Nothing is drawn from it: no rune.)
	let sending: string[] = [];
	const settled = (notificationId: string) => {
		sending = sending.filter((id) => id !== notificationId);
	};
	// Two writes crossed: the last answer may not be the latest count, so the count is asked instead of trusted.
	let crossed = false;
	let readingAll = false;

	/**
	 * A write came back refused. A line that is no longer this account's (`404`) does NOT come back as new: the lists
	 * and the count are asked again. Anything else undoes what the press showed and asks the server what it holds; a
	 * `401` is a session that ended.
	 */
	function refused(error: unknown, back: () => void): 'session' | 'gone' | 'unknown' {
		const failure = readNotificationInboxFailure(error);
		if (failure !== 'gone') back();
		if (failure === 'session') options.onSessionEnded();
		else refreshNotifications(client);
		return failure;
	}

	/** A write was kept: how many are new is the server's answer, unless another write is still out. */
	function kept(left: number) {
		if (sending.length > 0 || readingAll) {
			crossed = true;
			return;
		}
		if (crossed) {
			crossed = false;
			refreshNotifications(client);
			return;
		}
		keepUnreadNotificationCount(client, left);
		settleNotificationLists(client);
	}

	return {
		get view() {
			return view;
		},
		/** No choices are drawn: a guest's words, a failure, no notification at all, and the page's first wait. */
		get plain() {
			return plain;
		},
		/** The choice on screen; `null` until the page knows which. */
		get filter() {
			return filter;
		},
		/** The three choices, «Νέες» with its count. */
		get filters() {
			return filters;
		},
		get rows() {
			return rows;
		},
		/** How many are new, of every choice (the account's). */
		get unread() {
			return unread ?? 0;
		},
		/** «Εμφάνιση παλαιότερων»: the server has a next page. */
		get hasOlder() {
			return data !== undefined && list.hasNextPage;
		},
		get loadingOlder() {
			return list.isFetchingNextPage;
		},
		/** One press, one page: it is added under the ones already shown. */
		loadOlder() {
			if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
		},
		/**
		 * 🔴 U-174 (Ε2 Β): the press of a NEW line — «read» leaves at once (ONE request; a line already read, or one
		 * whose request is out, sends nothing) and the line is read on screen before the answer. It never waits for
		 * anything: what the line opens is the link's own business.
		 */
		async read(notificationId: string) {
			const row = rows.find((entry) => entry.id === notificationId);
			if (!member || !row?.fresh || sending.includes(notificationId)) return;
			sending = [...sending, notificationId];
			const answer = markNotificationRead(notificationId);
			// The answer is read below; until then a refusal is not an unhandled one.
			answer.catch(() => undefined);
			const back = await previewNotificationRead(client, notificationId);
			try {
				const left = await answer;
				settled(notificationId);
				kept(left);
			} catch (error) {
				settled(notificationId);
				refused(error, back);
			}
		},
		/** «Σήμανση όλων ως διαβασμένων»: one request, everything read on screen before the answer. */
		async readAll() {
			if (!member || readingAll || (unread ?? 0) === 0) return;
			readingAll = true;
			const answer = markAllNotificationsRead();
			answer.catch(() => undefined);
			const back = await previewAllNotificationsRead(client);
			try {
				const left = await answer;
				readingAll = false;
				// Something new came while the request was out: the lists no longer say what the server holds.
				if (left > 0) crossed = true;
				kept(left);
			} catch (error) {
				readingAll = false;
				if (refused(error, back) !== 'session') options.onReadAllFailed();
			}
		},
		/** «Δοκιμάστε ξανά» of the list. */
		retry() {
			if (!member) return;
			if (count.isError) void count.refetch();
			if (filter !== null) void list.refetch();
		}
	};
}

export type NotificationInbox = ReturnType<typeof useNotificationInbox>;
