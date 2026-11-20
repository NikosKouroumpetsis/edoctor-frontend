/**
 * Tests only: lines of an account's notification list as the server answers them (`GET /notification/inbox/me`,
 * `w45-b4` «Σύμβαση για τους clients»), in the server's words of today. Made-up people; fixed ids.
 */
export type SampleInboxItem = {
	id: string;
	kind: string;
	icon: string;
	title: string;
	body: string;
	occurredAt: string;
	read: boolean;
	target: { kind: string; id: string };
};

export const SAMPLE_IDS = {
	confirmed: '018f3c1e-0000-7000-8000-000000000001',
	reminder: '018f3c1e-0000-7000-8000-000000000002',
	invitation: '018f3c1e-0000-7000-8000-000000000003',
	published: '018f3c1e-0000-7000-8000-000000000004',
	question: '018f3c1e-0000-7000-8000-000000000005',
	older: '018f3c1e-0000-7000-8000-000000000006',
	appointment: '018f3c1e-0000-7000-8000-0000000000a1',
	invitationTarget: '018f3c1e-0000-7000-8000-0000000000b1',
	questionTarget: '018f3c1e-0000-7000-8000-0000000000c1'
} as const;

/** The instant the samples are read at: Thursday 12 November 2026, 12:00 in Athens. */
export const SAMPLE_NOW = Date.parse('2026-11-12T10:00:00.000Z');

const item = (given: Partial<SampleInboxItem> & { id: string }): SampleInboxItem => ({
	kind: 'APPOINTMENT_CONFIRMED',
	icon: 'CALENDAR',
	title: 'Το ραντεβού σας επιβεβαιώθηκε',
	body: '20/11/2026, 12:30 · Dr. Μαρία Τριανταφύλλου',
	occurredAt: '2026-11-12T08:00:00.000Z',
	read: false,
	target: { kind: 'APPOINTMENT', id: SAMPLE_IDS.appointment },
	...given
});

/** One line, with what a test changes of it. */
export const sampleInboxItem = item;

/**
 * Five lines, newest first: three new (a confirmation two hours ago, a reminder five hours ago, an invitation to
 * review yesterday) and two read (a published review of 8 November, an answered question with NO second line).
 */
export function sampleInboxItems(): SampleInboxItem[] {
	return [
		item({ id: SAMPLE_IDS.confirmed }),
		item({
			id: SAMPLE_IDS.reminder,
			kind: 'APPOINTMENT_REMINDER',
			icon: 'CLOCK',
			title: 'Υπενθύμιση ραντεβού',
			occurredAt: '2026-11-12T05:00:00.000Z'
		}),
		item({
			id: SAMPLE_IDS.invitation,
			kind: 'RATING_INVITATION',
			icon: 'STAR',
			title: 'Πώς ήταν η επίσκεψή σας;',
			body: 'Γράψτε κριτική για την επίσκεψη της 03/11/2026',
			occurredAt: '2026-11-11T09:00:00.000Z',
			target: { kind: 'RATING_INVITATION', id: SAMPLE_IDS.invitationTarget }
		}),
		item({
			id: SAMPLE_IDS.published,
			kind: 'RATING_PUBLISHED',
			icon: 'STAR',
			title: 'Η κριτική σας δημοσιεύτηκε',
			body: 'Για την επίσκεψη της 20/10/2026',
			occurredAt: '2026-11-08T09:00:00.000Z',
			read: true
		}),
		item({
			id: SAMPLE_IDS.question,
			kind: 'QUESTION_ANSWERED',
			icon: 'QUESTION',
			title: 'Η ερώτησή σας απαντήθηκε',
			body: '',
			occurredAt: '2026-10-25T09:00:00.000Z',
			read: true,
			target: { kind: 'QUESTION', id: SAMPLE_IDS.questionTarget }
		})
	];
}

/** A page of the list as the server answers it. */
export function sampleInboxPage(
	items: SampleInboxItem[] = sampleInboxItems(),
	options: { nextCursor?: string | null; unreadCount?: number } = {}
) {
	return {
		items,
		nextCursor: options.nextCursor ?? null,
		unreadCount: options.unreadCount ?? items.filter((entry) => !entry.read).length
	};
}

/** The doctor's side (screen 75): fixed ids of its lines and of what they are about. */
export const DOCTOR_SAMPLE_IDS = {
	request: '018f3c1e-0000-7000-8000-000000000d01',
	outcome: '018f3c1e-0000-7000-8000-000000000d02',
	canceled: '018f3c1e-0000-7000-8000-000000000d03',
	review: '018f3c1e-0000-7000-8000-000000000d04',
	sync: '018f3c1e-0000-7000-8000-000000000d05',
	licence: '018f3c1e-0000-7000-8000-000000000d06',
	requestAppointment: '018f3c1e-0000-7000-8000-000000000da1',
	outcomeAppointment: '018f3c1e-0000-7000-8000-000000000da2',
	canceledAppointment: '018f3c1e-0000-7000-8000-000000000da3',
	reviewAppointment: '018f3c1e-0000-7000-8000-000000000da4',
	reviewRating: '018f3c1e-0000-7000-8000-000000000db4',
	connection: '018f3c1e-0000-7000-8000-000000000dc1',
	doctor: '018f3c1e-0000-7000-8000-000000000dd1'
} as const;

/**
 * Six lines of the doctor's side, newest first, in the server's words (`w51-b11` §6: kind, icon, target of each):
 * three new (a request, «Τι έγινε με την επίσκεψη;», a late cancellation) and three read (a new review, the calendar's
 * sync that stopped, the licence that ends). Made-up people.
 */
export function sampleDoctorInboxItems(): SampleInboxItem[] {
	return [
		item({
			id: DOCTOR_SAMPLE_IDS.request,
			kind: 'APPOINTMENT_REQUESTED',
			icon: 'CALENDAR',
			title: 'Νέο αίτημα ραντεβού',
			body: 'Νίκος Μαυρίδης · σήμερα, 17:30',
			occurredAt: '2026-11-12T07:00:00.000Z',
			target: { kind: 'APPOINTMENT', id: DOCTOR_SAMPLE_IDS.requestAppointment }
		}),
		item({
			id: DOCTOR_SAMPLE_IDS.outcome,
			kind: 'APPOINTMENT_OUTCOME_PROMPT',
			icon: 'CHECK',
			title: 'Τι έγινε με την επίσκεψη;',
			body: 'Δημήτρης Ζαφειρίου · σήμερα, 10:30',
			occurredAt: '2026-11-12T06:00:00.000Z',
			target: { kind: 'APPOINTMENT', id: DOCTOR_SAMPLE_IDS.outcomeAppointment }
		}),
		item({
			id: DOCTOR_SAMPLE_IDS.canceled,
			kind: 'APPOINTMENT_CANCELED_BY_PATIENT',
			icon: 'CALENDAR_CANCELED',
			title: 'Ο ασθενής ακύρωσε',
			body: 'Μάρκος Ηλιόπουλος · σήμερα, 11:30 · εκπρόθεσμα, μέσα στις 8 ώρες',
			occurredAt: '2026-11-12T05:00:00.000Z',
			target: { kind: 'APPOINTMENT', id: DOCTOR_SAMPLE_IDS.canceledAppointment }
		}),
		item({
			id: DOCTOR_SAMPLE_IDS.review,
			kind: 'RATING_RECEIVED',
			icon: 'STAR',
			title: 'Νέα κριτική',
			body: 'Κατερίνα Λαμπράκη · για την επίσκεψη της 9 Νοεμβρίου',
			occurredAt: '2026-11-11T09:00:00.000Z',
			read: true,
			// 🔴 D-W52-88: the line of a published review names the review itself (`w52-b8` §5).
			target: { kind: 'RATING', id: DOCTOR_SAMPLE_IDS.reviewRating }
		}),
		item({
			id: DOCTOR_SAMPLE_IDS.sync,
			kind: 'CALENDAR_SYNC_FAILING',
			icon: 'SYNC',
			title: 'Ο συγχρονισμός με το Google Calendar σταμάτησε',
			body: 'Συνδέστε ξανά το ημερολόγιό σας.',
			occurredAt: '2026-11-08T09:00:00.000Z',
			read: true,
			target: { kind: 'CALENDAR_CONNECTION', id: DOCTOR_SAMPLE_IDS.connection }
		}),
		item({
			id: DOCTOR_SAMPLE_IDS.licence,
			kind: 'LICENSE_EXPIRING',
			icon: 'BADGE',
			title: 'Η άδειά σας λήγει σε 20 ημέρες',
			body: 'Στις 2 Δεκεμβρίου 2026. Για ανανέωση, γράψτε μας.',
			occurredAt: '2026-11-05T09:00:00.000Z',
			read: true,
			target: { kind: 'DOCTOR', id: DOCTOR_SAMPLE_IDS.doctor }
		})
	];
}
