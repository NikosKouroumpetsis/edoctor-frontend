import type { IoniconName } from '$shared/ui/icons/ionicon';
import type {
	NotificationInboxFilter,
	NotificationInboxIcon
} from '$modules/notifications/api/inbox';

/**
 * 🔴 U-174 (wave 4.5, screen 63; the owner's own proposal): the list's THREE choices, in the page's order — «Νέες» ·
 * «Προηγούμενες» · «Όλες». Each is the request's own word and the address's (`?filter=`).
 */
export const notificationInboxFilters: readonly NotificationInboxFilter[] = [
	'new',
	'previous',
	'all'
];

/** The glyph of each kind of line (record §5.8: a calendar, a clock, a star, a question mark). */
export const notificationInboxGlyphs: Record<NotificationInboxIcon, IoniconName> = {
	CALENDAR: 'calendar-outline',
	CLOCK: 'time-outline',
	STAR: 'star-outline',
	QUESTION: 'help-circle-outline'
};

/** A line whose kind the server names with a word the page does not know: the calendar. */
export const notificationInboxFallbackGlyph: IoniconName = 'calendar-outline';

/**
 * 🔴 U-65.6: the most of the server's words a line draws — its title and its second line, in characters. Longer ones
 * end with «…»: a line stays a line whatever the server sends.
 */
export const notificationInboxTextLimits = { title: 160, body: 240 } as const;
