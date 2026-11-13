import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { appointmentPath, ratingPath } from '$modules/appointments/lib/paths';
import { notificationsPath, notificationsSearch } from '$modules/notifications/lib/paths';
import type { NotificationInboxLinks } from '$modules/notifications/ui/inbox';
import { profilePath, settingsSectionPath } from '$modules/profile/lib/paths';
import type { NotificationsScreenData } from '../types';

/**
 * Wave 4.5 · screen 63 (D-W45-49): the choice the route names, the page's language, and every address the list leads
 * to — resolved here, in the page's language (a module knows no route, and never another module's). 🔴 D-W45-45: what
 * a line opens is THIS screen's to say — an appointment its own page (screen 51), a review's invitation the visit's
 * review (screen 54); a choice is the address's `?filter=`, a fixed word and nothing of a person (U-65.6).
 */
export function useNotificationsScreen(data: () => NotificationsScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const links = $derived<NotificationInboxLinks>({
		profile: href(profilePath),
		settings: href(settingsSectionPath('notifications')),
		filter: (filter) => `${href(notificationsPath)}${notificationsSearch(filter)}`,
		target: (target) =>
			href(target.kind === 'appointment' ? appointmentPath(target.id) : ratingPath(target.id))
	});

	return {
		get locale() {
			return locale;
		},
		get address() {
			return data().address;
		},
		get links() {
			return links;
		}
	};
}
