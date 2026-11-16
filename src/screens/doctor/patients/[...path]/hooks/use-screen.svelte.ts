import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import {
	doctorAppointmentPath,
	doctorAppointmentsSearch,
	doctorMenuPath,
	doctorNewAppointmentPath,
	doctorNewAppointmentSearch,
	doctorPatientPath,
	doctorPatientsPath,
	doctorPatientStepPath,
	type DoctorPatientAddressKey
} from '$modules/doctor-dashboard/lib/paths';
import type { DoctorMergeLinks } from '$modules/doctor-dashboard/ui/merge';
import type { DoctorPatientLinks } from '$modules/doctor-dashboard/ui/patient';
import type { DoctorPatientsLinks } from '$modules/doctor-dashboard/ui/patients';
import type { DoctorRecordLinks } from '$modules/doctor-dashboard/ui/record';
import {
	doctorConversationPath,
	doctorNewConversationPath,
	doctorNewConversationSearch
} from '$modules/messages/lib/paths';
import type { DoctorPatientsScreenData } from '../types';

/**
 * Wave 5.1 · screen 73 «Οι ασθενείς μου» (D-W51-73; `/doctor/patients[/<kind>/<id>[/edit|merge]]`): the page the route
 * names, its language, and every address it leads to — in the page's language and resolved here (a module knows no
 * route): «‹» to «Μενού», one card, a record's two screens, an appointment's 68 (with the pill of 67 it lives in),
 * «Νέο ραντεβού» (screen 72 with the patient chosen, `?from=patient`), «Μήνυμα»'s conversation (U-193.1).
 */
export function useDoctorPatientsScreen(data: () => DoctorPatientsScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const address = $derived(data().address);
	const openKey = $derived<DoctorPatientAddressKey | null>(
		address.view === 'card' ? address.key : null
	);
	const card = (key: DoctorPatientAddressKey) => href(doctorPatientPath(key));
	const listLinks = $derived<DoctorPatientsLinks>({
		menu: href(doctorMenuPath),
		card,
		newAppointment: href(doctorNewAppointmentPath)
	});
	const cardLinks = $derived<DoctorPatientLinks>({
		back: href(doctorPatientsPath),
		appointment: (appointmentId, section) =>
			`${href(doctorAppointmentPath(appointmentId))}${doctorAppointmentsSearch(
				section === 'upcoming' ? 'upcoming' : 'history',
				null
			)}`,
		newAppointment: openKey
			? `${href(doctorNewAppointmentPath)}${doctorNewAppointmentSearch({ from: 'patient', patient: openKey })}`
			: href(doctorNewAppointmentPath),
		conversation: (conversationId) => href(doctorConversationPath(conversationId)),
		// 🔴 U-193.1 (D-W51-87): the doctor writes first to an account or a relative (a record has no conversation).
		newConversation:
			openKey && openKey.kind !== 'record'
				? `${href(doctorNewConversationPath)}${doctorNewConversationSearch({ kind: openKey.kind, id: openKey.id })}`
				: null,
		step: (step) =>
			openKey ? href(doctorPatientStepPath(openKey, step)) : href(doctorPatientsPath)
	});
	// 🔴 D-W51-76 · U-198.2: «Στοιχεία ασθενή» and the join lead back to the card they were opened from.
	const stepLinks = $derived<DoctorRecordLinks & DoctorMergeLinks>({
		card: openKey ? card(openKey) : href(doctorPatientsPath)
	});
	return {
		get locale() {
			return locale;
		},
		get address() {
			return address;
		},
		/** The list's own addresses (D-W51-74): «‹» to «Μενού», a card, «Νέο ραντεβού». */
		get listLinks() {
			return listLinks;
		},
		/** The card's own addresses (D-W51-75). */
		get cardLinks() {
			return cardLinks;
		},
		/** «Στοιχεία ασθενή»'s and the join's one address (D-W51-76): the card. */
		get stepLinks() {
			return stepLinks;
		}
	};
}
