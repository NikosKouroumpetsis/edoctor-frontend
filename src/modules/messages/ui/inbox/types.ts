import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { MessagesLinks } from '$modules/messages/types';

/** U-84: `/messages`, `/messages/<id>`, `/messages/archive`: one page, what shows is the address's. */
export type InboxPageProps = {
	locale: SupportedLocale;
	links: MessagesLinks;
	/** The open conversation; `null` on the list. */
	conversationId?: string | null;
	/** «Προηγούμενες συνομιλίες». */
	archive?: boolean;
};
