/** What a list shows: which side of the reader (`all` an account with one side), and the archive or the rest. */
export type ConversationSideFilter = 'all' | 'patient' | 'doctor';

/**
 * 🔴 U-182.3 (D-W51-85): the side of the mode the page is in — the doctor's mode reads only the conversations with its
 * patients, the patient's mode only its own as a patient; never both, never chips.
 */
export type MessagesSide = 'patient' | 'doctor';

/**
 * 🔴 D-W51-79 / D-W51-86: the appointment a conversation of the doctor's side is about (the server's, one per account):
 * the nearest ahead (`upcoming`) or request, else the last visit; for a relative's, who it is for.
 */
export type ConversationAppointmentLine = {
	kind: 'upcoming' | 'request' | 'lastVisit';
	startTime: string;
	forRelative: {
		firstName: string | null;
		lastName: string | null;
		relation: string | null;
	} | null;
};

/**
 * 🔴 U-193.1 (D-W51-87): who the doctor writes to first, by the key of screen 73 — an account, or a relative (the
 * conversation is then with the account that books for it). A record (no account) has no conversation (D-W51-71).
 */
export type DoctorConversationTarget = { kind: 'account' | 'relative'; id: string };

/** The reasons of a report (U-78.1 Ε1: chips, no free text). */
export type MessageReportReason = 'SPAM' | 'ABUSE' | 'INAPPROPRIATE' | 'OTHER';

/** The addresses the pages of the messages need from the rest of the site, composed by their screens. */
export type MessagesLinks = {
	/** `/messages`. */
	list: string;
	/** `/messages/archive`. */
	archive: string;
	/** A conversation. */
	conversation: (conversationId: string) => string;
	/** A doctor's profile, by its slug. */
	doctorProfile: (slug: string) => string;
	/** «Αναζήτηση γιατρών»: the home. */
	search: string;
	/**
	 * 🔴 D-W51-86 (the doctor's side only): the patient's card of screen 73 (`account/<patientId>`), which the name of a
	 * conversation and the first row of its ⋯ open.
	 */
	patientCard?: (patientId: string) => string;
};

/**
 * What the #18 says of the doctor, all of it from the profile on the screen (U-36.5, D-103: no request of its own): the
 * doctor module's facts, composed by the screen.
 */
export type ContactDoctorFacts = {
	id: string;
	name: string;
	/** 🔴 U-99.1: the name inside a sentence, «Dr. …». The card's own line keeps `name`. */
	sentenceName: string;
	specialty: string;
	imageUrl: string | null;
	initial: string;
	/** «Χρόνος απόκρισης: Εντός μίας ώρας»; absent without a metric. */
	responseLabel?: string;
	/** «εντός μίας ώρας», for the line under the first message. */
	responseWhen?: string;
	phone?: { label: string; dialNumber: string };
};
