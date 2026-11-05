import { createInfiniteQuery, keepPreviousData } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { conversationsInfiniteQuery } from '$modules/messages/api/conversations';
import { INBOX_POLL_MS } from '$modules/messages/config/limits';
import type { InboxFilter, InboxMemory } from '$modules/messages/ui/inbox-memory';

export type { InboxFilter };

/** The reader's side a chip asks for: «Ασθενείς» are the conversations where the reader is the doctor. */
const SIDE_OF = { all: 'all', patients: 'doctor', doctors: 'patient' } as const;

/** U-84 Π1: the conversations, in pages, 30 s poll while the page shows, and only for a member. */
export function useInboxList(options: {
	locale: () => SupportedLocale;
	archive: () => boolean;
	enabled: () => boolean;
	/** The list shows: it asks again only then, and a conversation that covers it (below 950) leaves the budget of `messaging-read` to itself. */
	shown: () => boolean;
	/** R-11: where the chip stays chosen between the pages. */
	memory: InboxMemory;
}) {
	const { memory } = options;

	const query = createInfiniteQuery(() => ({
		...conversationsInfiniteQuery(
			{
				// The archive has no chips: a chip chosen on the list says nothing of it.
				side: options.archive() ? 'all' : SIDE_OF[memory.filter],
				archived: options.archive(),
				lang: options.locale()
			},
			options.enabled(),
			options.shown() ? INBOX_POLL_MS : false
		),
		placeholderData: keepPreviousData
	}));

	const data = $derived(options.enabled() ? query.data : undefined);
	const rows = $derived(data?.pages.flatMap((page) => page.items) ?? []);
	const sideCounts = $derived(data?.pages[0]?.sideCounts ?? null);
	// An account that may hold no conversations (`403`): the empty page, never the error's (as the favourites).
	const notAllowed = $derived(query.error instanceof ApiError && query.error.status === 403);
	const failed = $derived(!notAllowed && query.isError && data === undefined);
	const showsChips = $derived((sideCounts?.asPatient ?? 0) > 0 && (sideCounts?.asDoctor ?? 0) > 0);

	// A chip chosen earlier cannot hide conversations once there is no chip left to lift it with.
	$effect(() => {
		if (sideCounts && !showsChips && !options.archive() && memory.filter !== 'all') {
			memory.filter = 'all';
		}
	});

	return {
		get filter() {
			return memory.filter;
		},
		set filter(next: InboxFilter) {
			memory.filter = next;
		},
		get rows() {
			return rows;
		},
		get sideCounts() {
			return sideCounts;
		},
		/** Only an account with both sides has a choice to make. */
		get showsChips() {
			return showsChips;
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
