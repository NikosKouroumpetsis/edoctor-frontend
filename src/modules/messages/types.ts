/** What a list shows: which side of the reader (`all` an account with one side), and the archive or the rest. */
export type ConversationSideFilter = 'all' | 'patient' | 'doctor';

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
