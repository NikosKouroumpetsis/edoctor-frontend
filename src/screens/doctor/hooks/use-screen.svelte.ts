import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import {
	doctorAppointmentPath,
	doctorAppointmentsPath,
	doctorAppointmentsSearch,
	doctorAppointmentStepPath,
	doctorNewAppointmentPath,
	doctorNewAppointmentSearch,
	type DoctorAppointmentStep,
	type DoctorAppointmentsTab
} from '$modules/doctor-dashboard/lib/paths';

/**
 * Wave 5.1 · «Σήμερα» of the doctor (D-W51-16, `/doctor`): the page's language, where «Όλα τα ραντεβού» leads (screen
 * 67, D-W51-31: `/doctor/appointments` in the page's language) and where a card leads (screen 68, D-W51-36:
 * `/doctor/appointments/<id>` with the pill of 67 it lives in; screen 69, D-W51-49: a request's «Απόρριψη» at
 * `/doctor/appointments/<id>/reject`; screen 72, D-W51-69: «+» at `/doctor/appointments/new?from=today`).
 */
export function useDoctorTodayScreen() {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	return {
		get locale() {
			return locale;
		},
		get appointmentsHref() {
			return href(doctorAppointmentsPath);
		},
		/** 🔴 D-W51-69: «+» opens screen 72 alone in the middle (`?from=today`). */
		get newAppointmentHref() {
			return `${href(doctorNewAppointmentPath)}${doctorNewAppointmentSearch({ from: 'today' })}`;
		},
		appointmentHref: (appointmentId: string, tab: DoctorAppointmentsTab) =>
			`${href(doctorAppointmentPath(appointmentId))}${doctorAppointmentsSearch(tab, null)}`,
		appointmentStepHref: (
			appointmentId: string,
			step: DoctorAppointmentStep,
			tab: DoctorAppointmentsTab
		) =>
			`${href(doctorAppointmentStepPath(appointmentId, step))}${doctorAppointmentsSearch(tab, null)}`
	};
}
