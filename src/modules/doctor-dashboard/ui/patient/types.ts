import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorPatientAppointmentsSection } from '$modules/doctor-dashboard/api/patients';
import type {
	DoctorPatientAddressKey,
	DoctorPatientStep
} from '$modules/doctor-dashboard/lib/paths';

/**
 * Every address a patient's card leads to, in the page's language and resolved by the screen (a module knows no route):
 * «‹» to the list (when nothing of the history is behind it), an appointment's 68 (with the pill of 67 it lives in:
 * «Επερχόμενα» for one ahead, «Ιστορικό» for one before), «Νέο ραντεβού» (screen 72 with the patient chosen), «Μήνυμα»'s
 * conversation (U-193.1: the one there is, else one the doctor starts), and a record's «Στοιχεία ασθενή» / the join.
 */
export type DoctorPatientLinks = {
	back: string;
	appointment: (appointmentId: string, section: DoctorPatientAppointmentsSection) => string;
	newAppointment: string;
	conversation: (conversationId: string) => string;
	/** 🔴 U-193.1 (D-W51-87): a conversation the doctor starts with this account or relative (none for a record). */
	newConversation: string | null;
	step: (step: DoctorPatientStep) => string;
};

/** Screen 73's card (D-W51-73, D-W51-75): the page's language, the patient the address names, where it leads. */
export type DoctorPatientProps = {
	locale: SupportedLocale;
	patientKey: DoctorPatientAddressKey;
	links: DoctorPatientLinks;
};

/** What the card draws: its wait, the card, a patient not the doctor's (the one 404, D-W51-63), a read that failed. */
export type DoctorPatientState = 'loading' | 'ready' | 'missing' | 'failed';
