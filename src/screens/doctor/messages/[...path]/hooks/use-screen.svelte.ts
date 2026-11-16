import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { doctorPatientPath } from '$modules/doctor-dashboard/lib/paths';
import { doctorProfilePath } from '$modules/doctor/lib/detail';
import {
	doctorConversationPath,
	doctorMessagesArchivePath,
	doctorMessagesPath
} from '$modules/messages/lib/paths';
import type { MessagesLinks } from '$modules/messages/types';
import type { DoctorMessagesScreenData } from '../types';

/**
 * Wave 5.1 · screen 74, the doctor's messages (D-W51-85; `/doctor/messages[/<id>|/archive|/new]`): the page the route
 * names, its language, and every address it leads to — in the page's language and resolved here (a module knows no
 * route): the doctor's own list, archive and conversations, and 🔴 D-W51-86 a patient's card of screen 73.
 */
export function useDoctorMessagesScreen(data: () => DoctorMessagesScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const address = $derived(data().address);
	const links: MessagesLinks = {
		get list() {
			return href(doctorMessagesPath);
		},
		get archive() {
			return href(doctorMessagesArchivePath);
		},
		conversation: (conversationId) => href(doctorConversationPath(conversationId)),
		doctorProfile: (slug) => href(doctorProfilePath(slug)),
		get search() {
			return href('/');
		},
		patientCard: (patientId) => href(doctorPatientPath({ kind: 'account', id: patientId }))
	};

	return {
		get locale() {
			return locale;
		},
		get address() {
			return address;
		},
		links,
		/** 🔴 U-193.1: the card of screen 73 a conversation the doctor starts is about. */
		card: (target: { kind: 'account' | 'relative'; id: string }) => href(doctorPatientPath(target))
	};
}
