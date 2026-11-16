import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorAppointmentStep,
	DoctorPatientAddressKey
} from '$modules/doctor-dashboard/lib/paths';

/**
 * Every address screen 68 leads to, in the page's language and resolved by the screen (a module knows no route): «‹»
 * back to the list (its pill and office kept), «Μήνυμα»'s conversation (`/doctor/messages/<id>`, or one the doctor
 * starts, `/doctor/messages/new?kind=&id=`, U-193.1 — the screen builds them, the module imports no other), its step
 * screens (screen 69, D-W51-49: «Απόρριψη», «Ακύρωση ραντεβού») and the patient's card (screen 73, D-W51-73).
 */
export type DoctorAppointmentLinks = {
	back: string;
	conversation: (conversationId: string) => string;
	/** 🔴 U-193.1 (D-W51-87): a conversation the doctor starts with the account or the relative of the appointment. */
	newConversation: (patient: { kind: 'account' | 'relative'; id: string }) => string;
	step: (step: DoctorAppointmentStep) => string;
	/** 🔴 D-W51-73 (step 9): the patient's card of screen 73, which the name opens. */
	patient: (key: DoctorPatientAddressKey) => string;
};

/** Screen 68 «Το ραντεβού» (D-W51-36 … 39): the page's language, the appointment the address names, where it leads. */
export type DoctorAppointmentProps = {
	locale: SupportedLocale;
	appointmentId: string;
	links: DoctorAppointmentLinks;
};

/** What the page draws: its wait, the appointment, one not found (another doctor's too, D-W51-06), a read that failed. */
export type DoctorAppointmentState = 'loading' | 'ready' | 'missing' | 'failed';
