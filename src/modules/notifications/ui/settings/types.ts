import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { NotificationPreferenceChange } from '$modules/notifications/api/preferences';

/** What «Ειδοποιήσεις» shows for its read: the wait, a read with no answer to show, or the groups. */
export type NotificationSettingsView = 'loading' | 'failed' | 'ready';

/** A switch held in its new place while its writes are out (D-W45-24): the change, and how many are still out. */
export type NotificationPendingSwitch = NotificationPreferenceChange & { writes: number };

export type NotificationSettingsPageProps = {
	locale: SupportedLocale;
	/** The browser says it has no network: with nothing read yet the page says so instead of waiting on. */
	offline: boolean;
};
