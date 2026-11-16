import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { doctorNotificationsPath } from '$modules/notifications/lib/paths';

/** Wave 5.1 · «Μενού» of the doctor (D-W51-16, `/doctor/menu`): the page's language and where its bell leads. */
export function useDoctorMenuScreen() {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	return {
		get locale() {
			return locale;
		},
		/** 🔴 D-W51-89: the bell of the title opens the doctor's own list (screen 75), its dot the doctor's side. */
		get notificationsHref() {
			return resolve(localizeHref(doctorNotificationsPath, { locale }) as Pathname);
		}
	};
}
