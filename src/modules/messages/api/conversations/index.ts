import type { InfiniteData, QueryClient } from '@tanstack/svelte-query';
import type {
	MessagingArchiveView,
	MessagingBlockView,
	MessagingContactView,
	MessagingConversationListView,
	MessagingConversationView,
	MessagingDoctorSettingsView,
	MessagingMessageView,
	MessagingReadView,
	MessagingReportedView,
	MessagingSentMessageView,
	MessagingThreadView,
	MessagingUnreadCountView
} from '$shared/lib/api-client';
import {
	ApiError,
	httpSessionDelete,
	httpSessionFile,
	httpSessionGet,
	httpSessionPost,
	httpSessionPut
} from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { THREAD_POLL_MS } from '$modules/messages/config/limits';
import type { ConversationSideFilter, MessageReportReason } from '$modules/messages/types';

const BASE = '/messaging';

/** 🔴 U-84: every read below is one person's: `personalQueryMeta`, so a sign-out leaves none of it in the tab. */
export const messagesQueryKeys = {
	all: ['messages'] as const,
	unread: () => ['messages', 'unread'] as const,
	lists: () => ['messages', 'list'] as const,
	list: (side: ConversationSideFilter, archived: boolean, lang: string) =>
		['messages', 'list', side, archived, lang] as const,
	threads: () => ['messages', 'thread'] as const,
	thread: (conversationId: string, lang: string) =>
		['messages', 'thread', conversationId, lang] as const,
	doctorSettings: () => ['messages', 'doctor-settings'] as const,
	contact: (doctorId: string) => ['messages', 'contact', doctorId] as const,
	firstNote: (conversationId: string) => ['messages', 'first-note', conversationId] as const
};

/** A refusal that asking again does not change: the session ended, the account may not, the conversation is gone. */
export function isFinalRefusal(error: unknown): boolean {
	return error instanceof ApiError && [401, 403, 404].includes(error.status);
}

const retryUnlessFinal = (failures: number, error: unknown) =>
	!isFinalRefusal(error) && failures < 1;

/** Polling stops at a refusal that asking again does not change; a passing failure keeps asking. */
const everyUnlessFinal = (ms: number | false) => (query: { state: { error: unknown } }) =>
	isFinalRefusal(query.state.error) ? false : ms;

/**
 * 🔴 U-84: the badge. `enabled` is only a member's: a guest asks the server nothing, and no timer runs. TanStack's
 * interval asks only while the page shows (`refetchIntervalInBackground` stays off, its focus manager reads
 * `visibilityState`), and at once when it shows again.
 */
export function unreadCountQuery(enabled: boolean, everyMs: number) {
	return {
		queryKey: messagesQueryKeys.unread(),
		queryFn: ({ signal }: { signal?: AbortSignal }) =>
			httpSessionGet<MessagingUnreadCountView>(`${BASE}/unread-count`, { signal }).then(
				(data) => data.conversations
			),
		enabled,
		refetchInterval: everyUnlessFinal(everyMs),
		refetchIntervalInBackground: false,
		staleTime: 0,
		retry: retryUnlessFinal,
		meta: personalQueryMeta
	};
}

/** The list: newest first, in pages. 🔴 Only a member's, and it polls while it shows. */
export function conversationsInfiniteQuery(
	options: { side: ConversationSideFilter; archived: boolean; lang: string },
	enabled: boolean,
	everyMs: number | false
) {
	const { side, archived, lang } = options;
	return {
		queryKey: messagesQueryKeys.list(side, archived, lang),
		queryFn: ({ pageParam, signal }: { pageParam: string | null; signal?: AbortSignal }) =>
			httpSessionGet<MessagingConversationListView>(`${BASE}/conversations`, {
				params: { side, archived: archived ? '1' : '0', lang, cursor: pageParam ?? undefined },
				signal
			}),
		initialPageParam: null as string | null,
		getNextPageParam: (page: MessagingConversationListView) => page.nextCursor,
		enabled,
		refetchInterval: everyUnlessFinal(everyMs),
		refetchIntervalInBackground: false,
		staleTime: 0,
		retry: retryUnlessFinal,
		meta: personalQueryMeta
	};
}

/** What is new merged into what is known, by id, oldest first (uuid7 sorts in time); an id comes once. */
function mergeMessages(
	known: readonly MessagingMessageView[],
	fresh: readonly MessagingMessageView[]
): MessagingMessageView[] {
	const byId = new Map(known.map((message) => [message.id, message]));
	for (const message of fresh) byId.set(message.id, message);
	return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * The open conversation. Its first read brings the newest page; every later one, the poll (5 s, U-84.7), asks only for
 * what came `after` the newest it has, with the composer's state, and merges. 🔴 The words stay in this cache in memory:
 * no storage, no address (U-84).
 */
export function threadQuery(
	client: QueryClient,
	conversationId: string,
	lang: string,
	enabled: boolean
) {
	const queryKey = messagesQueryKeys.thread(conversationId, lang);
	const path = `${BASE}/conversations/${encodeURIComponent(conversationId)}/messages`;
	return {
		queryKey,
		queryFn: async ({ signal }: { signal?: AbortSignal }): Promise<MessagingThreadView> => {
			const before = client.getQueryData<MessagingThreadView>(queryKey);
			const newest = before?.items.at(-1)?.id;
			if (!before || !newest) {
				return httpSessionGet<MessagingThreadView>(path, { params: { lang }, signal });
			}
			const poll = await httpSessionGet<MessagingThreadView>(path, {
				params: { after: newest, lang },
				signal
			});
			// What a send wrote while this was on its way stays: the merge reads the cache as it is now.
			const known = client.getQueryData<MessagingThreadView>(queryKey) ?? before;
			return { ...known, state: poll.state, items: mergeMessages(known.items, poll.items) };
		},
		enabled,
		refetchInterval: everyUnlessFinal(THREAD_POLL_MS),
		refetchIntervalInBackground: false,
		staleTime: 0,
		retry: retryUnlessFinal,
		meta: personalQueryMeta
	};
}

/** Older messages, before the oldest known; only the conversation's cache changes. */
export async function loadOlderMessages(
	client: QueryClient,
	conversationId: string,
	lang: string
): Promise<void> {
	const queryKey = messagesQueryKeys.thread(conversationId, lang);
	const oldest = client.getQueryData<MessagingThreadView>(queryKey)?.items[0]?.id;
	if (!oldest) return;
	const page = await httpSessionGet<MessagingThreadView>(
		`${BASE}/conversations/${encodeURIComponent(conversationId)}/messages`,
		{ params: { before: oldest, lang } }
	);
	client.setQueryData<MessagingThreadView>(queryKey, (known) =>
		known
			? { ...known, items: mergeMessages(page.items, known.items), hasMore: page.hasMore }
			: known
	);
}

/** U-84: #18: the one conversation of the pair, found or made, with its message. The same id never doubles. */
export function startConversation(input: {
	doctorId: string;
	clientMessageId: string;
	body: string;
}): Promise<MessagingSentMessageView> {
	return httpSessionPost<MessagingSentMessageView>(`${BASE}/conversations`, { body: input });
}

/** U-84 Π2: a message; «Δοκιμάστε ξανά» sends the same id, so it never doubles. */
export function sendThreadMessage(
	conversationId: string,
	input: { clientMessageId: string; body: string }
): Promise<MessagingSentMessageView> {
	return httpSessionPost<MessagingSentMessageView>(
		`${BASE}/conversations/${encodeURIComponent(conversationId)}/messages`,
		{ body: input }
	);
}

/** «Read up to here», for this side; what the other person sees of it: nothing (U-84.2). */
export function markConversationRead(
	conversationId: string,
	upToMessageId: string
): Promise<MessagingReadView> {
	return httpSessionPost<MessagingReadView>(
		`${BASE}/conversations/${encodeURIComponent(conversationId)}/read`,
		{ body: { upToMessageId } }
	);
}

export function setConversationArchived(
	conversationId: string,
	archived: boolean
): Promise<MessagingArchiveView> {
	const path = `${BASE}/conversations/${encodeURIComponent(conversationId)}/archive`;
	return archived
		? httpSessionPost<MessagingArchiveView>(path)
		: httpSessionDelete<MessagingArchiveView>(path);
}

export function setConversationBlocked(
	conversationId: string,
	blocked: boolean
): Promise<MessagingBlockView> {
	const path = `${BASE}/conversations/${encodeURIComponent(conversationId)}/block`;
	return blocked
		? httpSessionPost<MessagingBlockView>(path)
		: httpSessionDelete<MessagingBlockView>(path);
}

/** U-84 Π2: a message received, once, with a reason of the list: no free text. */
export function reportMessage(
	messageId: string,
	reason: MessageReportReason
): Promise<MessagingReportedView> {
	return httpSessionPost<MessagingReportedView>(
		`${BASE}/messages/${encodeURIComponent(messageId)}/report`,
		{ body: { reason } }
	);
}

/** U-84.5: the copy of a conversation, a text file the server writes. */
export function downloadConversationCopy(conversationId: string): Promise<Blob> {
	return httpSessionFile(`${BASE}/conversations/${encodeURIComponent(conversationId)}/export`);
}

/**
 * D-103, U-84: what the profile's button asks, only when it is pressed and only for a member: a profile never carries it.
 * Fresh every time: a doctor may have closed «Δέχομαι» a moment ago.
 */
export function doctorContactQuery(doctorId: string) {
	return {
		queryKey: messagesQueryKeys.contact(doctorId),
		queryFn: ({ signal }: { signal?: AbortSignal }) =>
			httpSessionGet<MessagingContactView>(
				`${BASE}/doctors/${encodeURIComponent(doctorId)}/contact`,
				{ signal }
			),
		staleTime: 0,
		gcTime: 0,
		retry: false,
		// R-12: without a network the press fails at once and says so, as every write here: it never waits unseen.
		networkMode: 'always' as const,
		meta: personalQueryMeta
	};
}

/** «Δέχομαι νέα μηνύματα»: only a doctor has it; anybody else's `403` is an answer, asked once. */
export function doctorSettingsQuery(enabled: boolean) {
	return {
		queryKey: messagesQueryKeys.doctorSettings(),
		queryFn: ({ signal }: { signal?: AbortSignal }) =>
			httpSessionGet<MessagingDoctorSettingsView>(`${BASE}/settings/me`, { signal }),
		enabled,
		staleTime: Infinity,
		retry: retryUnlessFinal,
		meta: personalQueryMeta
	};
}

export function updateDoctorSettings(
	acceptsNewConversations: boolean
): Promise<MessagingDoctorSettingsView> {
	return httpSessionPut<MessagingDoctorSettingsView>(`${BASE}/settings/me`, {
		body: { acceptsNewConversations }
	});
}

/** A row of every cached list changes in place (read, archived), with no new read of the lists. */
export function patchConversation(
	client: QueryClient,
	conversationId: string,
	patch: Partial<Pick<MessagingConversationView, 'unreadCount'>>
) {
	client.setQueriesData<InfiniteData<MessagingConversationListView>>(
		{ queryKey: messagesQueryKeys.lists() },
		(data) =>
			data && {
				...data,
				pages: data.pages.map((page) => ({
					...page,
					items: page.items.map((item) =>
						item.id === conversationId ? { ...item, ...patch } : item
					)
				}))
			}
	);
}

/** What a cached list knows of a conversation's unread messages (`undefined` when no list has it). */
export function readCachedUnread(client: QueryClient, conversationId: string): number | undefined {
	for (const [, data] of client.getQueriesData<InfiniteData<MessagingConversationListView>>({
		queryKey: messagesQueryKeys.lists()
	})) {
		const row = data?.pages
			.flatMap((page) => page.items)
			.find((item) => item.id === conversationId);
		if (row) return row.unreadCount;
	}
	return undefined;
}

/** A message the server has just stored joins the conversation at once. */
export function appendToThread(
	client: QueryClient,
	conversationId: string,
	lang: string,
	message: MessagingMessageView
) {
	client.setQueryData<MessagingThreadView>(
		messagesQueryKeys.thread(conversationId, lang),
		(known) => known && { ...known, items: mergeMessages(known.items, [message]) }
	);
}

/** The composer's state changed (a block, its lifting), before the next poll says so. */
export function patchThreadState(
	client: QueryClient,
	conversationId: string,
	lang: string,
	state: Partial<MessagingThreadView['state']>
) {
	client.setQueryData<MessagingThreadView>(
		messagesQueryKeys.thread(conversationId, lang),
		(known) => known && { ...known, state: { ...known.state, ...state } }
	);
}

/** A write moved what the lists and the badge show: they ask again. */
export function refreshInbox(client: QueryClient) {
	void client.invalidateQueries({ queryKey: messagesQueryKeys.lists() });
	void client.invalidateQueries({ queryKey: messagesQueryKeys.unread() });
}

/** U-84 Π3: the line under the first message, as the #18 knew it («συνήθως απαντά …»): names and words, never the text. */
export type FirstMessageNote = { name: string; when: string | null };

export function writeFirstMessageNote(
	client: QueryClient,
	conversationId: string,
	note: FirstMessageNote
) {
	const queryKey = messagesQueryKeys.firstNote(conversationId);
	client.setQueryDefaults(queryKey, { meta: personalQueryMeta });
	client.setQueryData<FirstMessageNote>(queryKey, note);
}

export function readFirstMessageNote(
	client: QueryClient,
	conversationId: string
): FirstMessageNote | undefined {
	return client.getQueryData<FirstMessageNote>(messagesQueryKeys.firstNote(conversationId));
}
