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
	doctorPatientPath,
	doctorTodayPath
} from '$modules/doctor-dashboard/lib/paths';
import type { DoctorAppointmentLinks } from '$modules/doctor-dashboard/ui/appointment';
import type { DoctorAppointmentsLinks } from '$modules/doctor-dashboard/ui/appointments';
import type { DoctorMoveLinks } from '$modules/doctor-dashboard/ui/move';
import type { DoctorNewLinks } from '$modules/doctor-dashboard/ui/new';
import type { DoctorReasonLinks } from '$modules/doctor-dashboard/ui/reason';
import {
	doctorConversationPath,
	doctorNewConversationPath,
	doctorNewConversationSearch
} from '$modules/messages/lib/paths';
import type { DoctorAppointmentsScreenData } from '../types';

/**
 * Wave 5.1 · screens 67 «Ραντεβού», 68 «Το ραντεβού», 69, 70, 71 and 72 (D-W51-31, D-W51-36, D-W51-46, D-W51-51,
 * D-W51-62, D-W51-69; `/doctor/appointments[/new|/<id>[/reject|cancel|time|services|correction]]`): the page the route
 * names, its language, and
 * every address it leads to
 * — in the page's language and resolved here (a module knows no route): «‹» to «Σήμερα», the list with a pill and an
 * office (the path resolved, the search after it: the patient's `?tab=history` way), one appointment and its step
 * screens with the same pill and office, and «Μήνυμα»'s conversation (U-193.1: built here from the messages' own path,
 * a module never imports another).
 */
export function useDoctorAppointmentsScreen(data: () => DoctorAppointmentsScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const links = $derived<DoctorAppointmentsLinks>({
		today: href(doctorTodayPath),
		newAppointment: (tab, officeId) =>
			`${href(doctorNewAppointmentPath)}${doctorNewAppointmentSearch({ from: 'list', tab, officeId })}`,
		list: (tab, officeId) =>
			`${href(doctorAppointmentsPath)}${doctorAppointmentsSearch(tab, officeId)}`,
		appointment: (appointmentId, tab, officeId) =>
			`${href(doctorAppointmentPath(appointmentId))}${doctorAppointmentsSearch(tab, officeId)}`,
		step: (appointmentId, step, tab, officeId) =>
			`${href(doctorAppointmentStepPath(appointmentId, step))}${doctorAppointmentsSearch(tab, officeId)}`
	});
	const address = $derived(data().address);
	const openId = $derived(address.view === 'appointment' ? address.appointmentId : '');
	const appointmentLinks = $derived<DoctorAppointmentLinks>({
		back: links.list(address.tab, address.officeId),
		conversation: (conversationId) => href(doctorConversationPath(conversationId)),
		// 🔴 U-193.1 (D-W51-87): the doctor writes first, in the doctor's own messages.
		newConversation: (patient) =>
			`${href(doctorNewConversationPath)}${doctorNewConversationSearch(patient)}`,
		step: (step) => links.step(openId, step, address.tab, address.officeId),
		// 🔴 D-W51-73: the patient's name opens their card of screen 73.
		patient: (key) => href(doctorPatientPath(key))
	});
	// 🔴 D-W51-46 · D-W51-51 / 52 · D-W51-62: «‹», «Να μείνει» / «Άκυρο» and the done action of 69, 70 and 71 lead to the
	// 68 of the same appointment, pill and office; 69's «Αλλαγή ώρας» to the 70 of it.
	const stepLinks = $derived<DoctorMoveLinks>({
		appointment: links.appointment(openId, address.tab, address.officeId)
	});
	const reasonLinks = $derived<DoctorReasonLinks>({
		appointment: stepLinks.appointment,
		time: links.step(openId, 'time', address.tab, address.officeId)
	});
	// 🔴 D-W51-69 / 70 · D-W51-73: screen 72's way back — «Σήμερα» or the patient's card when opened from them, else the
	// list with its pill and office — and
	// the new appointment's 68 under «Επερχόμενα» of every office (the booked one is there, its card chosen).
	const newLinks = $derived<DoctorNewLinks>({
		back:
			address.view === 'new' && address.from === 'today'
				? links.today
				: address.view === 'new' && address.from === 'patient' && address.patient
					? href(doctorPatientPath(address.patient))
					: links.list(address.tab, address.officeId),
		appointment: (appointmentId) => links.appointment(appointmentId, 'upcoming', null)
	});
	return {
		get locale() {
			return locale;
		},
		get address() {
			return address;
		},
		get links() {
			return links;
		},
		/** Screen 68's own addresses (D-W51-36): «‹» to the list, the conversation, its step screens (69). */
		get appointmentLinks() {
			return appointmentLinks;
		},
		/** Screen 69's own addresses (D-W51-46): the 68 it came from, and its «Αλλαγή ώρας» (screen 70). */
		get reasonLinks() {
			return reasonLinks;
		},
		/** Screens 70's and 71's own address (D-W51-51 / 52, D-W51-62): the 68 they came from. */
		get stepLinks() {
			return stepLinks;
		},
		/** Screen 72's own addresses (D-W51-69 / 70): where it goes back to, and the 68 of what it booked. */
		get newLinks() {
			return newLinks;
		}
	};
}
