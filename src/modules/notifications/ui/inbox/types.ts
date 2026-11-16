import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	NotificationInboxFilter,
	NotificationInboxSide
} from '$modules/notifications/api/inbox';
import type { NotificationTarget } from '$modules/notifications/types';

/**
 * Every address the list leads to, resolved by the screen in the page's language (a module knows no route, and never
 * another module's): the way back, the settings of the notifications (screen 60), each choice, what a line opens, and
 * how it opens it.
 */
export type NotificationInboxLinks = {
	/** «←» below 744: the «Προφίλ» tab (screen 63), the doctor's «Μενού» (screen 75, `nt-back`). */
	back: string;
	/**
	 * The gear: «Ειδοποιήσεις» of the account's settings; `null` for none — the doctor's list (D-W51-02: his «Ειδοποιήσεις
	 * και SMS» is no screen of the web in 5.1, and the patient's centre is not his, D-W45-22).
	 */
	settings: string | null;
	filter: (filter: NotificationInboxFilter) => string;
	/**
	 * 🔴 D-W45-45 · D-W51-90: the screen of what a line is about — the appointment (51, or the doctor's 68) or the visit's
	 * review (54); `null` where the list's side has no such screen (the press only reads the line).
	 */
	target: (target: NotificationTarget) => string | null;
	/**
	 * How a line opens its screen: `null`, the link's own way; else a plain press is taken over by it (screen 75: the 68 one
	 * step on in the history, so its «‹» comes back to the list, `sw.js:989` `ap-back`). A new tab keeps the link's way.
	 */
	open: ((href: string) => void) | null;
};

/**
 * Screens 63 and 75's page: the side of the account it lists (🔴 D-W51-89: the patient's mode its own lines, the doctor's
 * his), the choice the address names (`null`: the page's own), and where its links lead.
 */
export type NotificationInboxPageProps = {
	side: NotificationInboxSide;
	locale: SupportedLocale;
	filter: NotificationInboxFilter | null;
	links: NotificationInboxLinks;
	/** The browser has no network (`online`): with nothing read yet, the list says it failed. */
	offline: boolean;
};

/** The bell of the «Προφίλ» (record §5.1): where it leads, in the page's language. */
export type NotificationBellProps = { locale: SupportedLocale; href: string };
