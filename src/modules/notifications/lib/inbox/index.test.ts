import { describe, expect, it } from 'vitest';
import {
	mapNotificationInboxPage,
	type NotificationInboxItemFacts
} from '$modules/notifications/api/inbox';
import {
	SAMPLE_IDS,
	SAMPLE_NOW,
	sampleInboxItem,
	sampleInboxPage
} from '$modules/notifications/api/inbox/inbox.sample';
import {
	buildNotificationFilters,
	buildNotificationRows,
	notificationInboxViewOf,
	notificationsViewerOf,
	notificationTargetOf,
	notificationWhen,
	readNotificationItems,
	resolveNotificationFilter
} from '.';

/*
 * Wave 4.5 · screen 63 (record §5.8, U-174, D-W45-45, D-W45-49): the list's view models — which choice opens, the three
 * choices, what the page shows, when a line came, its glyph, what a press opens. Pure; made-up people.
 */

const MINUTE = 60_000;
const HOUR = 3_600_000;
const el = { locale: 'el' } as const;
const en = { locale: 'en' } as const;
const facts = (): NotificationInboxItemFacts[] => mapNotificationInboxPage(sampleInboxPage()).items;
const rows = (items = facts(), locale: 'el' | 'en' = 'el') =>
	buildNotificationRows(items, { now: SAMPLE_NOW, locale });

describe('modules/notifications/lib/inbox · the choice on screen (U-174, D-W45-49)', () => {
	it('🔴 D-W45-49: the page opens on «Νέες» while something is new, on «Όλες» when nothing is — and waits (`null`) until the count is known', () => {
		expect(resolveNotificationFilter(null, 3)).toBe('new');
		expect(resolveNotificationFilter(null, 1)).toBe('new');
		expect(resolveNotificationFilter(null, 0)).toBe('all');
		expect(resolveNotificationFilter(null, null)).toBeNull();
	});

	it('D-W45-49: a choice the address names wins, whatever the count — before it is known too', () => {
		for (const unread of [null, 0, 5]) {
			expect(resolveNotificationFilter('previous', unread)).toBe('previous');
			expect(resolveNotificationFilter('all', unread)).toBe('all');
			expect(resolveNotificationFilter('new', unread)).toBe('new');
		}
	});

	it('🔴 U-174: τρεις επιλογές — «Νέες» · «Προηγούμενες» · «Όλες», in that order, the one on screen marked', () => {
		const choices = buildNotificationFilters('previous', 0, el);
		expect(choices.map((choice) => choice.id)).toEqual(['new', 'previous', 'all']);
		expect(choices.map((choice) => choice.label)).toEqual(['Νέες', 'Προηγούμενες', 'Όλες']);
		expect(choices.map((choice) => choice.selected)).toEqual([false, true, false]);
		expect(buildNotificationFilters(null, 0, el).some((choice) => choice.selected)).toBe(false);
		expect(buildNotificationFilters('all', 0, en).map((choice) => choice.label)).toEqual([
			'New',
			'Earlier',
			'All'
		]);
	});

	it('record §5.8: «Νέες (n)» — the count stands beside «Νέες» while any is new, on no other choice; the title over the list stays the bare name', () => {
		const choices = buildNotificationFilters('new', 2, el);
		expect(choices.map((choice) => choice.label)).toEqual(['Νέες (2)', 'Προηγούμενες', 'Όλες']);
		expect(choices.map((choice) => choice.title)).toEqual(['Νέες', 'Προηγούμενες', 'Όλες']);
		expect(buildNotificationFilters('new', 0, el)[0]?.label).toBe('Νέες');
		expect(buildNotificationFilters('all', 12, en)[0]).toMatchObject({
			label: 'New (12)',
			title: 'New'
		});
	});
});

describe('modules/notifications/lib/inbox · who reads, and what the page shows (record §5.8)', () => {
	it('the reader: a member, a guest, the wait until the session is asked, a session that could not be read', () => {
		expect(notificationsViewerOf({ isMember: true, status: 'member', readFailed: false })).toBe(
			'member'
		);
		expect(notificationsViewerOf({ isMember: false, status: 'guest', readFailed: false })).toBe(
			'guest'
		);
		expect(notificationsViewerOf({ isMember: false, status: 'unknown', readFailed: false })).toBe(
			'waiting'
		);
		expect(notificationsViewerOf({ isMember: false, status: 'unknown', readFailed: true })).toBe(
			'failed'
		);
		expect(notificationsViewerOf(undefined)).toBe('guest');
	});

	const state = {
		viewer: 'member',
		filter: 'all',
		failed: false,
		loaded: true,
		offline: false,
		rows: 0
	} as const;

	it('every view: a guest’s words · the wait · a failure · no notification at all · «Νέες» / «Προηγούμενες» empty · the lines', () => {
		expect(notificationInboxViewOf({ ...state, viewer: 'guest' })).toBe('guest');
		expect(notificationInboxViewOf({ ...state, viewer: 'waiting', loaded: false })).toBe('loading');
		expect(notificationInboxViewOf({ ...state, filter: null, loaded: false })).toBe('loading');
		expect(notificationInboxViewOf({ ...state, loaded: false })).toBe('loading');
		expect(notificationInboxViewOf({ ...state, failed: true, loaded: false })).toBe('failed');
		expect(notificationInboxViewOf({ ...state, viewer: 'failed', loaded: false })).toBe('failed');
		expect(notificationInboxViewOf({ ...state, offline: true, loaded: false })).toBe('failed');
		expect(notificationInboxViewOf(state)).toBe('none');
		expect(notificationInboxViewOf({ ...state, filter: 'new' })).toBe('empty');
		expect(notificationInboxViewOf({ ...state, filter: 'previous' })).toBe('empty');
		expect(notificationInboxViewOf({ ...state, rows: 2 })).toBe('rows');
		expect(notificationInboxViewOf({ ...state, filter: 'new', rows: 1 })).toBe('rows');
	});

	it('(negative) a guest is a guest whatever else is said; lines already read stay on screen when the network goes', () => {
		expect(
			notificationInboxViewOf({ ...state, viewer: 'guest', failed: true, offline: true, rows: 4 })
		).toBe('guest');
		expect(notificationInboxViewOf({ ...state, offline: true, rows: 3 })).toBe('rows');
	});
});

describe('modules/notifications/lib/inbox · when a line came (record §5.8; the application’s ONE rule, `w45-a7` §3; the Greek clock, D-118)', () => {
	const when = (ago: number, locale: 'el' | 'en' = 'el', now = SAMPLE_NOW) =>
		notificationWhen(now - ago, now, locale);

	it('«τώρα» under a minute; «πριν από n λεπτά» under an hour, one of them «λεπτό»', () => {
		expect(when(0)).toBe('τώρα');
		expect(when(59_000)).toBe('τώρα');
		expect(when(MINUTE)).toBe('πριν από 1 λεπτό');
		expect(when(2 * MINUTE)).toBe('πριν από 2 λεπτά');
		expect(when(59 * MINUTE + 59_000)).toBe('πριν από 59 λεπτά');
		expect(when(30_000, 'en')).toBe('now');
		expect(when(MINUTE, 'en')).toBe('1 min ago');
		expect(when(45 * MINUTE, 'en')).toBe('45 min ago');
	});

	it('«πριν από n ώρες» under 24 hours (one of them «ώρα») — past midnight too; from 24 hours on «Χθες» while its Greek day is yesterday', () => {
		// The sample's «now» is 12:00 in Athens.
		expect(when(HOUR)).toBe('πριν από 1 ώρα');
		expect(when(2 * HOUR)).toBe('πριν από 2 ώρες');
		expect(when(5 * HOUR)).toBe('πριν από 5 ώρες');
		// 23:59 of the day before is still «hours ago».
		expect(when(12 * HOUR + MINUTE)).toBe('πριν από 12 ώρες');
		expect(when(23 * HOUR + 59 * MINUTE)).toBe('πριν από 23 ώρες');
		expect(when(24 * HOUR)).toBe('Χθες');
		expect(when(26 * HOUR)).toBe('Χθες');
		expect(when(35 * HOUR + 59 * MINUTE)).toBe('Χθες');
		// 23:59 two days before: no longer yesterday.
		expect(when(36 * HOUR + MINUTE)).toBe('10 Νοεμβρίου');
		expect(when(2 * HOUR, 'en')).toBe('2 h ago');
		expect(when(HOUR, 'en')).toBe('1 h ago');
		expect(when(26 * HOUR, 'en')).toBe('Yesterday');
	});

	it('across midnight: minutes, then hours — never «Χθες» under 24 hours; and a day that is not the Greek yesterday is a date, however near', () => {
		// 00:30 in Athens on 12 November (22:30 UTC the day before).
		const now = Date.parse('2026-11-11T22:30:00.000Z');
		expect(when(40 * MINUTE, 'el', now)).toBe('πριν από 40 λεπτά');
		expect(when(90 * MINUTE, 'el', now)).toBe('πριν από 1 ώρα');
		expect(when(20 * MINUTE, 'el', now)).toBe('πριν από 20 λεπτά');
		// 24 h 10′ back is 00:20 of the 11th: yesterday. 25 h back is 23:30 of the 10th: the day before it.
		expect(when(24 * HOUR + 10 * MINUTE, 'el', now)).toBe('Χθες');
		expect(when(25 * HOUR, 'el', now)).toBe('10 Νοεμβρίου');
	});

	it('then the day in words — «8 Νοεμβρίου», «November 8» — with no year (the list keeps 90 days)', () => {
		expect(notificationWhen(Date.parse('2026-11-08T09:00:00.000Z'), SAMPLE_NOW, 'el')).toBe(
			'8 Νοεμβρίου'
		);
		expect(notificationWhen(Date.parse('2026-11-08T09:00:00.000Z'), SAMPLE_NOW, 'en')).toBe(
			'November 8'
		);
		expect(notificationWhen(Date.parse('2026-10-25T09:00:00.000Z'), SAMPLE_NOW, 'el')).toBe(
			'25 Οκτωβρίου'
		);
		const january = Date.parse('2027-01-05T10:00:00.000Z');
		expect(notificationWhen(Date.parse('2026-12-20T09:00:00.000Z'), january, 'el')).toBe(
			'20 Δεκεμβρίου'
		);
		expect(notificationWhen(Date.parse('2026-12-20T09:00:00.000Z'), january, 'en')).toBe(
			'December 20'
		);
	});

	it('(negative) an instant a wrong clock puts ahead is «τώρα», never a negative time; no instant is no word', () => {
		expect(notificationWhen(SAMPLE_NOW + 5 * MINUTE, SAMPLE_NOW, 'el')).toBe('τώρα');
		expect(notificationWhen(SAMPLE_NOW + 3 * 24 * HOUR, SAMPLE_NOW, 'el')).toBe('τώρα');
		expect(notificationWhen(null, SAMPLE_NOW, 'el')).toBe('');
		expect(notificationWhen(Number.NaN, SAMPLE_NOW, 'el')).toBe('');
	});
});

describe('modules/notifications/lib/inbox · what a press opens (D-W45-45, D-W45-59)', () => {
	it('🔴 D-W45-45: `APPOINTMENT` ⇒ the appointment’s screen (51); `RATING_INVITATION` ⇒ the visit’s review (54) — the id, never an address', () => {
		expect(notificationTargetOf({ kind: 'APPOINTMENT', id: SAMPLE_IDS.appointment })).toEqual({
			kind: 'appointment',
			id: SAMPLE_IDS.appointment
		});
		expect(
			notificationTargetOf({ kind: 'RATING_INVITATION', id: SAMPLE_IDS.invitationTarget })
		).toEqual({ kind: 'rating', id: SAMPLE_IDS.invitationTarget });
	});

	it('🔴 D-W45-59: `QUESTION` opens NOTHING (no «οι ερωτήσεις μου» on the site): the press only reads the line; a kind the page does not know, the same', () => {
		expect(notificationTargetOf({ kind: 'QUESTION', id: SAMPLE_IDS.questionTarget })).toBeNull();
		expect(notificationTargetOf(null)).toBeNull();
		expect(
			notificationTargetOf({ kind: 'CONVERSATION', id: SAMPLE_IDS.appointment } as never)
		).toBeNull();
	});
});

describe('modules/notifications/lib/inbox · the rows (record §5.8, U-65.6)', () => {
	it('each line as its row: the glyph of its kind, the server’s words as they came, when it came, new or read, what it opens', () => {
		expect(rows()).toEqual([
			{
				id: SAMPLE_IDS.confirmed,
				glyph: 'calendar-outline',
				title: 'Το ραντεβού σας επιβεβαιώθηκε',
				body: '20/11/2026, 12:30 · Dr. Μαρία Τριανταφύλλου',
				when: 'πριν από 2 ώρες',
				at: '2026-11-12T08:00:00.000Z',
				fresh: true,
				target: { kind: 'appointment', id: SAMPLE_IDS.appointment }
			},
			{
				id: SAMPLE_IDS.reminder,
				glyph: 'time-outline',
				title: 'Υπενθύμιση ραντεβού',
				body: '20/11/2026, 12:30 · Dr. Μαρία Τριανταφύλλου',
				when: 'πριν από 5 ώρες',
				at: '2026-11-12T05:00:00.000Z',
				fresh: true,
				target: { kind: 'appointment', id: SAMPLE_IDS.appointment }
			},
			{
				id: SAMPLE_IDS.invitation,
				glyph: 'star-outline',
				title: 'Πώς ήταν η επίσκεψή σας;',
				body: 'Γράψτε κριτική για την επίσκεψη της 03/11/2026',
				when: 'Χθες',
				at: '2026-11-11T09:00:00.000Z',
				fresh: true,
				target: { kind: 'rating', id: SAMPLE_IDS.invitationTarget }
			},
			{
				id: SAMPLE_IDS.published,
				glyph: 'star-outline',
				title: 'Η κριτική σας δημοσιεύτηκε',
				body: 'Για την επίσκεψη της 20/10/2026',
				when: '8 Νοεμβρίου',
				at: '2026-11-08T09:00:00.000Z',
				fresh: false,
				target: { kind: 'appointment', id: SAMPLE_IDS.appointment }
			},
			{
				id: SAMPLE_IDS.question,
				glyph: 'help-circle-outline',
				title: 'Η ερώτησή σας απαντήθηκε',
				body: null,
				when: '25 Οκτωβρίου',
				at: '2026-10-25T09:00:00.000Z',
				fresh: false,
				target: null
			}
		]);
	});

	it('the four glyphs — a calendar, a clock, a star, a question mark; (negative) a kind the page does not know is the calendar', () => {
		const glyphOf = (icon: NotificationInboxItemFacts['icon']) =>
			rows([{ ...facts()[0], icon }])[0]?.glyph;
		expect(glyphOf('CALENDAR')).toBe('calendar-outline');
		expect(glyphOf('CLOCK')).toBe('time-outline');
		expect(glyphOf('STAR')).toBe('star-outline');
		expect(glyphOf('QUESTION')).toBe('help-circle-outline');
		expect(glyphOf(null)).toBe('calendar-outline');
	});

	it('🔴 `w45-b4`: an empty second line is NO line (`null`), so the row draws its title and its time alone', () => {
		expect(rows([{ ...facts()[0], body: '' }])[0]?.body).toBeNull();
	});

	it('🔴 the server may change the SHAPE of its words (a date in words, a second line on a question): a row shows whatever came, as it came', () => {
		const reshaped = rows([
			{ ...facts()[0], body: 'Πέμπτη 20 Νοεμβρίου, 12:30 · Dr. Μαρία Τριανταφύλλου' },
			{ ...facts()[4], body: 'Dr. Αθηνά Παπαδοπούλου, Παθολόγος' },
			{ ...facts()[1], title: 'Reminder — tomorrow at 12:30', body: '   x   ' }
		]);
		expect(reshaped.map((row) => row.body)).toEqual([
			'Πέμπτη 20 Νοεμβρίου, 12:30 · Dr. Μαρία Τριανταφύλλου',
			'Dr. Αθηνά Παπαδοπούλου, Παθολόγος',
			'   x   '
		]);
		expect(reshaped[2]?.title).toBe('Reminder — tomorrow at 12:30');
	});

	it('🔴 U-65.6: the server’s words have a most — a title of 160 and a second line of 240 characters, cut with «…»; markup stays the text it is', () => {
		const long = rows([{ ...facts()[0], title: 'Τ'.repeat(5000), body: 'σ'.repeat(5000) }])[0];
		expect(Array.from(long?.title ?? '')).toHaveLength(160);
		expect(long?.title.endsWith('…')).toBe(true);
		expect(Array.from(long?.body ?? '')).toHaveLength(240);
		expect(long?.body?.endsWith('…')).toBe(true);
		// Exactly at the most: as it came.
		expect(rows([{ ...facts()[0], title: 'Τ'.repeat(160) }])[0]?.title).toBe('Τ'.repeat(160));
		const markup = rows([
			{ ...facts()[0], title: '<img src=x onerror=alert(1)>', body: '<b>bold</b> & [link](x)' }
		])[0];
		expect(markup).toMatchObject({
			title: '<img src=x onerror=alert(1)>',
			body: '<b>bold</b> & [link](x)'
		});
	});

	it('a line with no instant has no time (and no `<time>` to stamp); in English the same rule', () => {
		expect(rows([{ ...facts()[0], occurredAt: null }])[0]).toMatchObject({ when: '', at: null });
		expect(rows(facts(), 'en').map((row) => row.when)).toEqual([
			'2 h ago',
			'5 h ago',
			'Yesterday',
			'November 8',
			'October 25'
		]);
	});

	it('σελίδες που προστίθενται: the lines of every loaded page, in order, each once — a line a later page repeats keeps its first place', () => {
		const first = mapNotificationInboxPage(
			sampleInboxPage([
				sampleInboxItem({ id: SAMPLE_IDS.confirmed }),
				sampleInboxItem({ id: SAMPLE_IDS.reminder })
			])
		);
		const second = mapNotificationInboxPage(
			sampleInboxPage([
				sampleInboxItem({ id: SAMPLE_IDS.reminder, title: 'Ξανά' }),
				sampleInboxItem({ id: SAMPLE_IDS.older })
			])
		);
		const items = readNotificationItems([first, second]);
		expect(items.map((entry) => entry.id)).toEqual([
			SAMPLE_IDS.confirmed,
			SAMPLE_IDS.reminder,
			SAMPLE_IDS.older
		]);
		expect(items[1]?.title).toBe('Το ραντεβού σας επιβεβαιώθηκε');
		expect(readNotificationItems(undefined)).toEqual([]);
		expect(readNotificationItems([])).toEqual([]);
	});
});
