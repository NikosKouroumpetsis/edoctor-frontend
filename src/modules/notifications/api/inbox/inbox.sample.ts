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
