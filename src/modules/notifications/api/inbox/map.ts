import { isUuid } from '$shared/lib/ids';
import type {
	NotificationInboxIcon,
	NotificationInboxItemFacts,
	NotificationInboxPageFacts,
	NotificationInboxTargetFacts,
	NotificationInboxTargetKind
} from './types';

// The contract's words, total over their types: a word the contract gains or loses does not compile here.
const ICONS = { CALENDAR: true, CLOCK: true, STAR: true, QUESTION: true } as const satisfies Record<
	NotificationInboxIcon,
	true
>;
const TARGETS = {
	APPOINTMENT: true,
	RATING_INVITATION: true,
	QUESTION: true
} as const satisfies Record<NotificationInboxTargetKind, true>;

/** The most lines one page may bring (the server's own cap, D-W45-46) and the longest cursor it accepts back. */
const PAGE_CAP = 50;
const CURSOR_CAP = 512;

/** The word when it is one of the contract's, else none (a number, a list, another word, `toString`). */
function wordOf<Word extends string>(table: Record<Word, true>, value: unknown): Word | null {
	return typeof value === 'string' && Object.hasOwn(table, value) ? (value as Word) : null;
}

const recordOf = (value: unknown): Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

function mapTarget(view: unknown): NotificationInboxTargetFacts | null {
	const entry = recordOf(view);
	const kind = wordOf(TARGETS, entry.kind);
	return kind && typeof entry.id === 'string' && isUuid(entry.id) ? { kind, id: entry.id } : null;
}

function mapInstant(value: unknown): number | null {
	if (typeof value !== 'string') return null;
	const instant = Date.parse(value);
	return Number.isFinite(instant) ? instant : null;
}

function mapItem(view: unknown): NotificationInboxItemFacts | null {
	const entry = recordOf(view);
	// 🔴 U-65.6: the id goes into a request's path, so only the server's own shape of one is ever kept.
	if (typeof entry.id !== 'string' || !isUuid(entry.id)) return null;
	const title = typeof entry.title === 'string' ? entry.title.trim() : '';
	if (!title) return null;
	return {
		id: entry.id,
		icon: wordOf(ICONS, entry.icon),
		title,
		body: typeof entry.body === 'string' ? entry.body.trim() : '',
		occurredAt: mapInstant(entry.occurredAt),
		// Only the server's `true` is «read»: a line it does not vouch for stays new.
		read: entry.read === true,
		target: mapTarget(entry.target)
	};
}

/** How many are still new: a whole number of zero or more, else none. */
export function mapUnreadCount(value: unknown): number {
	return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}

/**
 * W-4 / 🔴 U-65.6: one page of the list as facts — a line without the server's id or without a title is left out, a
 * glyph or a target the contract does not name reads as none, a line told twice is kept once, and an answer that is no
 * page at all reads as an empty last one; never a throw, never a word of the answer used as it came.
 */
export function mapNotificationInboxPage(view: unknown): NotificationInboxPageFacts {
	const page = recordOf(view);
	const seen = new Set<string>();
	const items = (Array.isArray(page.items) ? page.items : []).slice(0, PAGE_CAP).flatMap((item) => {
		const facts = mapItem(item);
		if (!facts || seen.has(facts.id)) return [];
		seen.add(facts.id);
		return [facts];
	});
	const cursor = page.nextCursor;
	return {
		items,
		nextCursor:
			typeof cursor === 'string' && cursor.length > 0 && cursor.length <= CURSOR_CAP
				? cursor
				: null,
		unreadCount: mapUnreadCount(page.unreadCount)
	};
}
