import { createInfiniteQuery, keepPreviousData } from '@tanstack/svelte-query';
import { useDebouncedValue } from '$shared/lib/debounce';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { conversationsInfiniteQuery } from '$modules/messages/api/conversations';
import { INBOX_POLL_MS, MESSAGES_SEARCH_DEBOUNCE_MS } from '$modules/messages/config/limits';
import { readInboxSearchQuery } from '$modules/messages/lib/search';
import type { MessagesSide } from '$modules/messages/types';
import type { InboxMemory } from '$modules/messages/ui/inbox-memory';

/**
 * U-84 Π1: the conversations, in pages, 30 s poll while the page shows, and only for a member. 🔴 U-182.3 (D-W51-85):
 * only the side of the page's mode — no chips. 🔴 D-W51-80: the doctor's 🔍 asks with the words typed, quiet a moment
 * and cut at 40 (U-65.6); closed or empty, every conversation at once.
 */
export function useInboxList(options: {
	locale: () => SupportedLocale;
	side: () => MessagesSide;
	archive: () => boolean;
	enabled: () => boolean;
	/** The list shows: it asks again only then, and a conversation that covers it (below 950) leaves the budget of `messaging-read` to itself. */
	shown: () => boolean;
	/** R-11: where the doctor's search stays between the pages. */
	memory: InboxMemory;
}) {
	const { memory } = options;
	const searching = $derived(
		options.side() === 'doctor' && !options.archive() && memory.searchOpen
	);
	const typed = $derived(searching ? readInboxSearchQuery(memory.searchText) : '');
	const quiet = useDebouncedValue(() => typed, MESSAGES_SEARCH_DEBOUNCE_MS);
	// Closed or emptied: the whole list at once, never after the wait.
	const q = $derived(typed ? quiet.current : '');

	const query = createInfiniteQuery(() => ({
		...conversationsInfiniteQuery(
			{
				side: options.side(),
				archived: options.archive(),
				lang: options.locale(),
				q
			},
			options.enabled(),
			options.shown() ? INBOX_POLL_MS : false
		),
		placeholderData: keepPreviousData
	}));

	const data = $derived(options.enabled() ? query.data : undefined);
	const rows = $derived(data?.pages.flatMap((page) => page.items) ?? []);
	// An account that may hold no conversations (`403`): the empty page, never the error's (as the favourites).
	const notAllowed = $derived(query.error instanceof ApiError && query.error.status === 403);
	const failed = $derived(!notAllowed && query.isError && data === undefined);

	return {
		get rows() {
			return rows;
		},
		/** 🔴 D-W51-80: the words the rows answer (the quiet ones), `''` for every conversation. */
		get searched() {
			return q;
		},
		get loading() {
			return options.enabled() && data === undefined && !failed && !notAllowed;
		},
		get failed() {
			return failed;
		},
		get hasMore() {
			return query.hasNextPage;
		},
		loadMore() {
			if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
		},
		retry: () => void query.refetch()
	};
}

export type InboxList = ReturnType<typeof useInboxList>;
