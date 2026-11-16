import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import { useHistorySteps } from '$shared/lib/navigation';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { doctorAppointmentPath, doctorMenuPath } from '$modules/doctor-dashboard/lib/paths';
import { doctorNotificationsPath, notificationsSearch } from '$modules/notifications/lib/paths';
import type { NotificationInboxLinks } from '$modules/notifications/ui/inbox';
import type { DoctorNotificationsScreenData } from '../types';

/**
 * Wave 5.1 · screen 75 (D-W51-89, D-W51-90): the doctor's notifications — the choice the route names, the page's
 * language, and every address the list leads to, resolved here (a module knows no route, and never another module's).
 * «←» goes to the doctor's «Μενού» (`sw.js` `nt-back`); no gear (D-W51-02: his settings are no screen of the web in
 * 5.1); a line about an appointment — a new review's too — opens his 68 ONE step on in the history (`sw.js:989`
 * `ap-back`: its «‹» comes back to the list); the calendar's connection and the licence open nothing on the web.
 */
export function useDoctorNotificationsScreen(data: () => DoctorNotificationsScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const steps = useHistorySteps('doctorNotification');
	const links = $derived<NotificationInboxLinks>({
		back: href(doctorMenuPath),
		settings: null,
		filter: (filter) => `${href(doctorNotificationsPath)}${notificationsSearch(filter)}`,
		target: (target) =>
			target.kind === 'appointment' ? href(doctorAppointmentPath(target.id)) : null,
		open: (to) => steps.open(to, 1)
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
