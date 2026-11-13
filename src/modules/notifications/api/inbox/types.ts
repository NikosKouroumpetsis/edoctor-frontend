import type { NotificationInboxItemView } from '$shared/lib/api-client';

/** The list's three choices as the request names them (`?filter=`, D-W45-46): «Νέες», «Προηγούμενες», «Όλες». */
export type NotificationInboxFilter = 'new' | 'previous' | 'all';

/** The glyph of a line and what a line is about: the contract's own words. */
export type NotificationInboxIcon = NotificationInboxItemView['icon'];
export type NotificationInboxTargetKind = NotificationInboxItemView['target']['kind'];

/** What a line is about (D-W45-45): a kind and an id, never an address — the page opens its own screen. */
export type NotificationInboxTargetFacts = { kind: NotificationInboxTargetKind; id: string };

/**
 * One line of the list as the pages read it. Its words (`title`, `body`) are the SERVER's, already in the language of
 * the request — plain text, whatever their shape; `body` may be empty. `icon` and `target` are `null` when the server
 * says a word this contract does not have; `occurredAt` (ms) is `null` when it is no instant.
 */
export type NotificationInboxItemFacts = {
	id: string;
	icon: NotificationInboxIcon | null;
	title: string;
	body: string;
	occurredAt: number | null;
	read: boolean;
	target: NotificationInboxTargetFacts | null;
};

/** One page of the list: its lines, the way to the next one (`null`: the last), and how many are still new. */
export type NotificationInboxPageFacts = {
	items: NotificationInboxItemFacts[];
	nextCursor: string | null;
	unreadCount: number;
};

/**
 * Why a write was refused: the session ended (`401`), the line is not this account's to read any more (`404`: unknown,
 * another's, not shown yet or older than 90 days — the server tells them the same way), or anything else.
 */
export type NotificationInboxFailure = 'session' | 'gone' | 'unknown';
