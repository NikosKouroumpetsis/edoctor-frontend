import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	ConversationAppointmentLine,
	DoctorConversationTarget,
	MessagesLinks,
	MessagesSide
} from '$modules/messages/types';

/**
 * 🔴 U-193.1 (D-W51-87): the patient of a conversation the doctor starts, as the screen read it from screen 73's card
 * (a module never imports another): the key the server takes, the name of the account that will hold the conversation
 * (the one who books, for a relative), the appointment's line, the conversation the card already names (it opens in
 * this page's place), the card itself, and the read's state.
 */
export type InboxFreshPatient = {
	target: DoctorConversationTarget;
	state: 'loading' | 'ready' | 'missing' | 'failed';
	name: string;
	line: ConversationAppointmentLine | null;
	conversationId: string | null;
	cardHref: string | null;
	retry: () => void;
};

/**
 * U-84: `/messages`, `/messages/<id>`, `/messages/archive` — and 🔴 D-W51-85 the doctor's `/doctor/messages/…`: one
 * page, what shows is the address's, the side the mode's.
 */
export type InboxPageProps = {
	locale: SupportedLocale;
	links: MessagesLinks;
	/** 🔴 U-182.3: the side of the page's mode — the doctor's mode its patients, the patient's mode its own. */
	side: MessagesSide;
	/** The open conversation; `null` on the list. */
	conversationId?: string | null;
	/** «Προηγούμενες συνομιλίες». */
	archive?: boolean;
	/** 🔴 U-193.1: a conversation the doctor starts, beside the list from 950 (`/doctor/messages/new`). */
	fresh?: InboxFreshPatient | null;
};
