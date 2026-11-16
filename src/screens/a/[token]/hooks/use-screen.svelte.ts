import { page } from '$app/state';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';

/**
 * Wave 5.1 · the cancel link's page (D-W51-72, U-198.1; `/a/<token>`, the SMS's and the email's short address): the
 * page's language and the secret the route checked. It leads nowhere (no account, no menu: the frame draws the mark).
 */
export function useAppointmentCancelLinkScreen(token: () => string | null) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	return {
		get locale() {
			return locale;
		},
		get token() {
			return token();
		}
	};
}
