import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { NotificationInboxFilter } from '$modules/notifications/api/inbox';
import type { NotificationTarget } from '$modules/notifications/types';

/**
 * Every address the list leads to, resolved by the screen in the page's language (a module knows no route, and never
 * another module's): the «Προφίλ», the settings of the notifications (screen 60), each choice, and what a line opens.
 */
export type NotificationInboxLinks = {
	/** «←» below 744: the «Προφίλ» tab. */
	profile: string;
	/** The gear: «Ειδοποιήσεις» of the account's settings. */
	settings: string;
	filter: (filter: NotificationInboxFilter) => string;
	/** 🔴 D-W45-45: the screen of what a line is about — the appointment (51) or the visit's review (54). */
	target: (target: NotificationTarget) => string;
};

/** Screen 63's page: the choice the address names (`null`: the page's own), and where its links lead. */
export type NotificationInboxPageProps = {
	locale: SupportedLocale;
	filter: NotificationInboxFilter | null;
	links: NotificationInboxLinks;
	/** The browser has no network (`online`): with nothing read yet, the list says it failed. */
	offline: boolean;
};

/** The bell of the «Προφίλ» (record §5.1): where it leads, in the page's language. */
export type NotificationBellProps = { locale: SupportedLocale; href: string };
