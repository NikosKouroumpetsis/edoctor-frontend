import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { doctorProfilePath } from '$modules/doctor/lib/detail';
import { conversationPath, messagesArchivePath, messagesPath } from '$modules/messages/lib/paths';
import type { MessagesLinks } from '$modules/messages/types';

/** «Προηγούμενες συνομιλίες»: the language and the addresses it links, composed here as a module never imports another. */
export function useMessagesArchiveScreen() {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const links: MessagesLinks = {
		get list() {
			return href(messagesPath);
		},
		get archive() {
			return href(messagesArchivePath);
		},
		conversation: (conversationId) => href(conversationPath(conversationId)),
		doctorProfile: (slug) => href(doctorProfilePath(slug)),
		get search() {
			return href('/');
		}
	};

	return {
		get locale() {
			return locale;
		},
		links
	};
}
