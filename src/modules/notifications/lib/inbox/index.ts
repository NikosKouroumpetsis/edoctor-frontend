import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { formatCalendarDay } from '$shared/lib/calendar-day';
import { zonedDay } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { Session } from '$shared/state/session';
import type {
	NotificationInboxFilter,
	NotificationInboxItemFacts,
	NotificationInboxPageFacts,
	NotificationInboxTargetFacts
} from '$modules/notifications/api/inbox';
import {
	notificationInboxFallbackGlyph,
	notificationInboxFilters,
	notificationInboxGlyphs,
	notificationInboxTextLimits
} from '$modules/notifications/config/inbox';
import type {
	NotificationFilterChoice,
	NotificationInboxView,
	NotificationRow,
	NotificationsViewer,
	NotificationTarget
} from '$modules/notifications/types';

type Options = { locale: SupportedLocale };

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Who reads the list, as the session tells it (the appointments' way): a read of the session that got no answer is
 * told as a failure with «Δοκιμάστε ξανά» — the list is the account's alone, a guest's page would be a lie.
 */
export function notificationsViewerOf(
	session: Pick<Session, 'isMember' | 'status' | 'readFailed'> | undefined
): NotificationsViewer {
	if (session?.isMember) return 'member';
	if (!session || session.status === 'guest') return 'guest';
	return session.readFailed ? 'failed' : 'waiting';
}

/**
 * 🔴 D-W45-49 (U-174.5): the choice the page shows — the address's when it names one, else «Νέες» while something is
 * new and «Όλες» when nothing is. `null` until the count is known (`unread`: `null`): the page waits, it never guesses.
 */
export function resolveNotificationFilter(
	asked: NotificationInboxFilter | null,
	unread: number | null
): NotificationInboxFilter | null {
	if (asked) return asked;
	if (unread === null) return null;
	return unread > 0 ? 'new' : 'all';
}

const filterNames: Record<NotificationInboxFilter, (options: Options) => string> = {
	new: (options) => m.notifications_inbox_filter_new({}, options),
	previous: (options) => m.notifications_inbox_filter_previous({}, options),
	all: (options) => m.notifications_inbox_filter_all({}, options)
};

/**
 * 🔴 U-174: the THREE choices, in the page's order, with the one on screen marked. «Νέες» says how many are new beside
 * its name («Νέες (2)») while any is; its title over the list stays the bare name.
 */
export function buildNotificationFilters(
	current: NotificationInboxFilter | null,
	unread: number,
	options: Options
): NotificationFilterChoice[] {
	return notificationInboxFilters.map((id) => {
		const title = filterNames[id](options);
		return {
			id,
			title,
			label:
				id === 'new' && unread > 0
					? m.notifications_inbox_filter_new_count({ count: unread }, options)
					: title,
			selected: id === current
		};
	});
}

/**
 * What the page shows (record §5.8). A guest reads its own words; a session or a list that could not be read, a
 * failure; until the session, the choice and the list are known, the wait. With nothing to show: «Όλες» empty is an
 * account with no notification at all (`none`, no choices drawn), «Νέες» or «Προηγούμενες» empty its own words.
 */
export function notificationInboxViewOf(state: {
	viewer: NotificationsViewer;
	filter: NotificationInboxFilter | null;
	/** The list's read failed with nothing to show. */
	failed: boolean;
	/** The list has an answer. */
	loaded: boolean;
	/** The browser has no network. */
	offline: boolean;
	rows: number;
}): NotificationInboxView {
	if (state.viewer === 'guest') return 'guest';
	if (state.viewer === 'failed' || state.failed || (state.offline && !state.loaded))
		return 'failed';
	if (state.viewer === 'waiting' || state.filter === null || !state.loaded) return 'loading';
	if (state.rows > 0) return 'rows';
	return state.filter === 'all' ? 'none' : 'empty';
}

/**
 * When a line came — the application's ONE rule (`w45-a7` §3, `lib/inbox/time`): «τώρα» under a minute (and for an
 * instant a wrong clock puts ahead), «πριν από n λεπτά» under an hour, «πριν από n ώρες» under 24 hours — past midnight
 * too; from 24 hours on «Χθες» when its GREEK day (D-118) is the one before the server's today, else the day, «8
 * Νοεμβρίου» — no year: the list keeps 90 days. Empty for no instant.
 */
export function notificationWhen(
	occurredAt: number | null,
	now: number,
	locale: SupportedLocale
): string {
	if (occurredAt === null || !Number.isFinite(occurredAt)) return '';
	const options = { locale };
	const ago = now - occurredAt;
	if (ago < MINUTE_MS) return m.notifications_inbox_time_now({}, options);
	if (ago < HOUR_MS) {
		const count = Math.floor(ago / MINUTE_MS);
		return count === 1
			? m.notifications_inbox_time_minutes_one({ count }, options)
			: m.notifications_inbox_time_minutes_other({ count }, options);
	}
	if (ago < DAY_MS) {
		const count = Math.floor(ago / HOUR_MS);
		return count === 1
			? m.notifications_inbox_time_hours_one({ count }, options)
			: m.notifications_inbox_time_hours_other({ count }, options);
	}
	const day = zonedDay(occurredAt, PLATFORM_TIME_ZONE);
	if (day === zonedDay(now, PLATFORM_TIME_ZONE, -1)) {
		return m.notifications_inbox_time_yesterday({}, options);
	}
	return formatCalendarDay(day, locale, { day: 'numeric', month: 'long' }) ?? '';
}

/**
 * 🔴 D-W45-45 / D-W45-59: what a press opens. `APPOINTMENT` the appointment's screen (51), `RATING_INVITATION` the
 * visit's review (54). `QUESTION` — no «οι ερωτήσεις μου» exists on the site — and a kind the page does not know open
 * NOTHING: the press only reads the line.
 */
export function notificationTargetOf(
	target: NotificationInboxTargetFacts | null
): NotificationTarget | null {
	if (target?.kind === 'APPOINTMENT') return { kind: 'appointment', id: target.id };
	if (target?.kind === 'RATING_INVITATION') return { kind: 'rating', id: target.id };
	return null;
}

/** The server's words cut to a line's most, ending with «…» (🔴 U-65.6: they stay text, whatever they hold). */
function clip(text: string, limit: number): string {
	const letters = Array.from(text);
	return letters.length > limit
		? `${letters
				.slice(0, limit - 1)
				.join('')
				.trimEnd()}…`
		: text;
}

/** The lines of the loaded pages in their order, each once (a line a later page repeats keeps its first place). */
export function readNotificationItems(
	pages: readonly NotificationInboxPageFacts[] | undefined
): NotificationInboxItemFacts[] {
	const seen = new Set<string>();
	return (pages ?? []).flatMap((page) =>
		page.items.filter((item) => {
			if (seen.has(item.id)) return false;
			seen.add(item.id);
			return true;
		})
	);
}

/**
 * The lines as their rows: the glyph of the kind (the calendar for a word the page does not know), the server's
 * title and second line as they came — whatever their shape, only cut to a line's most — when each came, whether it
 * is new, and what a press opens.
 */
export function buildNotificationRows(
	items: readonly NotificationInboxItemFacts[],
	options: Options & { now: number }
): NotificationRow[] {
	return items.map((item) => {
		const when = notificationWhen(item.occurredAt, options.now, options.locale);
		return {
			id: item.id,
			glyph: item.icon ? notificationInboxGlyphs[item.icon] : notificationInboxFallbackGlyph,
			title: clip(item.title, notificationInboxTextLimits.title),
			body: item.body ? clip(item.body, notificationInboxTextLimits.body) : null,
			when,
			at: when && item.occurredAt !== null ? new Date(item.occurredAt).toISOString() : null,
			fresh: !item.read,
			target: notificationTargetOf(item.target)
		};
	});
}
