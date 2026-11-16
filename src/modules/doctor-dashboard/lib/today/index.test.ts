import { describe, expect, it } from 'vitest';
import {
	doctorAppointmentFacts,
	TODAY_DAY,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import { mapDoctorAppointment } from '$modules/doctor-dashboard/api/appointments';
import type { DoctorAppointmentFacts } from '$modules/doctor-dashboard/api/appointments';
import {
	buildDoctorTodayCard,
	doctorDayWindow,
	doctorTodayDateLabel,
	doctorTodayNextLabel,
	doctorUpcomingDayLabel,
	groupDoctorUpcoming,
	isDoctorNotTaking,
	isDoctorTodayEmpty,
	nextDoctorRequestExpiry,
	officeDayOffset,
	splitDoctorToday,
	zonedDayStart
} from '.';

const facts = (row: Parameters<typeof mapDoctorAppointment>[0]) =>
	mapDoctorAppointment(row) as DoctorAppointmentFacts;
const D = Object.fromEntries(
	Object.entries(TODAY_DAY).map(([key, row]) => [key, facts(row)])
) as Record<keyof typeof TODAY_DAY, DoctorAppointmentFacts>;
const ids = (list: { id: string }[]) => list.map((item) => item.id);
const NONE = { requests: [], outcome: [], next: [], done: [] };

describe('🔴 D-W51-22 · the window of «Σήμερα» on the server’s clock', () => {
	it('yesterday 00:00 Athens to the last millisecond before tomorrow — never tomorrow’s midnight (the server keeps both ends)', () => {
		expect(doctorDayWindow(TODAY_NOW)).toEqual({
			from: '2026-11-12T22:00:00.000Z',
			to: '2026-11-14T21:59:59.999Z'
		});
	});

	it('the day the clocks go back (25 October 2026): yesterday began at UTC+3, tomorrow begins at UTC+2', () => {
		expect(doctorDayWindow(Date.parse('2026-10-25T10:00:00.000Z'))).toEqual({
			from: '2026-10-23T21:00:00.000Z',
			to: '2026-10-25T21:59:59.999Z'
		});
		expect(zonedDayStart('2026-03-29', 'Europe/Athens')).toBe(
			Date.parse('2026-03-28T22:00:00.000Z')
		);
		expect(zonedDayStart('2026-11-14', 'America/New_York')).toBe(
			Date.parse('2026-11-14T05:00:00.000Z')
		);
	});

	it('a day on the office’s calendar: 0 today, -1 yesterday, 1 tomorrow; 23:30 Athens is still today there', () => {
		expect(officeDayOffset('2026-11-14T21:30:00.000Z', TODAY_NOW, 'Europe/Athens')).toBe(0);
		expect(officeDayOffset('2026-11-14T22:30:00.000Z', TODAY_NOW, 'Europe/Athens')).toBe(1);
		expect(officeDayOffset('2026-11-13T16:00:00.000Z', TODAY_NOW, 'Europe/Athens')).toBe(-1);
		expect(officeDayOffset('nope', TODAY_NOW, 'Europe/Athens')).toBeNull();
	});
});

describe('🔴 D-W51-22 · the groups of «Σήμερα»', () => {
	const day = [D.o1, D.o2, D.n1, D.n2, D.d1, D.d2, D.r1];
	const groups = splitDoctorToday({ requests: [D.r2, D.r1], day, now: TODAY_NOW });

	it('the prototype’s day: the requests by their deadline, the visits to answer latest first, the next by the hour, the closed of today', () => {
		expect(ids(groups.requests)).toEqual(['r1', 'r2']);
		expect(ids(groups.outcome)).toEqual(['o1', 'o2']);
		expect(ids(groups.next)).toEqual(['n1', 'n2']);
		expect(ids(groups.done)).toEqual(['d1', 'd2']);
	});

	it('🔴 D-W51-22: κάθε ραντεβού μία φορά — a request in the day’s read is only a request, a row read twice is one', () => {
		const all = Object.values(groups).flatMap(ids);
		expect(new Set(all).size).toBe(all.length);
		const twice = splitDoctorToday({
			requests: [D.r1],
			day: [D.r1, D.n1, D.n1, D.d1, D.d1],
			now: TODAY_NOW
		});
		expect(Object.values(twice).flatMap(ids)).toEqual(['r1', 'n1', 'd1']);
		// A request the requests' read no longer has (answered meanwhile) is never drawn as a visit of the day.
		const gone = splitDoctorToday({ requests: [], day: [D.r1], now: TODAY_NOW });
		expect(gone).toEqual(NONE);
	});

	it('🔴 D-W51-23: αίτημα που έληξε φεύγει — a deadline reached leaves the group, one a millisecond ahead stays', () => {
		const due = Date.parse(D.r1.expiresAt ?? '');
		expect(ids(splitDoctorToday({ requests: [D.r1], day: [], now: due }).requests)).toEqual([]);
		expect(ids(splitDoctorToday({ requests: [D.r1], day: [], now: due - 1 }).requests)).toEqual([
			'r1'
		]);
		expect(nextDoctorRequestExpiry([D.r1, D.r2], TODAY_NOW)).toBe(due);
		expect(nextDoctorRequestExpiry([D.r2], Date.parse(D.r2.expiresAt ?? ''))).toBeNull();
		// A request without a deadline stays, last.
		const open = { ...D.r2, id: 'r3', expiresAt: null };
		expect(
			ids(splitDoctorToday({ requests: [open, D.r1], day: [], now: TODAY_NOW }).requests)
		).toEqual(['r1', 'r3']);
	});

	it('the boundary of «Τι έγινε»: begun at «now» asks for its outcome, a millisecond later it is still next', () => {
		const begun = { ...D.n1, actions: { ...D.o1.actions } };
		const at = Date.parse(begun.startTime);
		expect(ids(splitDoctorToday({ requests: [], day: [begun], now: at }).outcome)).toEqual(['n1']);
		expect(ids(splitDoctorToday({ requests: [], day: [begun], now: at - 1 }).next)).toEqual(['n1']);
	});

	it('(negative) «Τι έγινε» only with the server’s outcomes: a begun visit it lets nobody answer, or only «ARRIVED», is in no group', () => {
		const silent = { ...D.o1, actions: { ...D.o1.actions, outcomes: [] } };
		const arrivedOnly = { ...D.o2, actions: { ...D.o2.actions, outcomes: ['ARRIVED' as const] } };
		expect(splitDoctorToday({ requests: [], day: [silent, arrivedOnly], now: TODAY_NOW })).toEqual(
			NONE
		);
	});

	it('(negative) «Ολοκληρώθηκαν σήμερα» never holds what was no visit (rejected, expired, unavailable) nor yesterday’s', () => {
		const closed = (['rejected', 'expired', 'unavailable'] as const).map((status, index) => ({
			...D.d1,
			id: `x${index}`,
			status
		}));
		const yesterday = { ...D.d1, id: 'y1', startTime: '2026-11-13T09:00:00.000Z' };
		const split = splitDoctorToday({ requests: [], day: [...closed, yesterday], now: TODAY_NOW });
		expect(split).toEqual(NONE);
		expect(isDoctorTodayEmpty(split)).toBe(true);
		expect(isDoctorTodayEmpty(groups)).toBe(false);
	});
});

describe('«Επερχόμενα» and the empty states', () => {
	it('from tomorrow, by the office’s day, each day by the hour; today’s rows are left out', () => {
		const days = groupDoctorUpcoming([D.u4, D.u3, D.r2, D.u2, D.n1], TODAY_NOW);
		expect(days.map((entry) => [entry.day, ids(entry.items)])).toEqual([
			['2026-11-16', ['r2', 'u2', 'u3']],
			['2026-11-17', ['u4']]
		]);
		expect(doctorUpcomingDayLabel('2026-11-16', 'el')).toBe('Δευτέρα 16 Νοεμβρίου');
		expect(doctorTodayDateLabel(TODAY_NOW, 'el')).toBe('Σάββατο 14 Νοεμβρίου');
	});

	it('🔴 D-W51-22 (4): «Δεν δέχεστε ακόμη ραντεβού» only with no appointment at all and one of its three blockers', () => {
		for (const code of [
			'NO_ENABLED_AVAILABILITY',
			'APPOINTMENTS_DISABLED',
			'APPOINTMENT_INTENT_MISSING'
		]) {
			expect(isDoctorNotTaking({ groups: NONE, upcoming: [], blockers: [code] })).toBe(true);
		}
		expect(
			isDoctorNotTaking({ groups: NONE, upcoming: [], blockers: ['DOCTOR_PHONE_UNVERIFIED'] })
		).toBe(false);
		expect(
			isDoctorNotTaking({ groups: NONE, upcoming: [D.u2], blockers: ['APPOINTMENTS_DISABLED'] })
		).toBe(false);
		expect(
			isDoctorNotTaking({
				groups: { ...NONE, done: [D.d1] },
				upcoming: [],
				blockers: ['APPOINTMENTS_DISABLED']
			})
		).toBe(false);
	});

	it('«Το επόμενο είναι τη Δευτέρα 16 Νοεμβρίου, στις 10:00.» — each weekday its article, tomorrow «αύριο», nothing ahead none', () => {
		expect(doctorTodayNextLabel([D.u4, D.r2], TODAY_NOW, 'el')).toBe(
			'Το επόμενο είναι τη Δευτέρα 16 Νοεμβρίου, στις 10:00.'
		);
		expect(doctorTodayNextLabel([D.r2], TODAY_NOW, 'en')).toBe(
			'The next one is on Monday, November 16, at 10:00.'
		);
		const sunday = { ...D.u2, startTime: '2026-11-15T08:00:00.000Z' };
		expect(doctorTodayNextLabel([sunday], TODAY_NOW, 'el')).toBe(
			'Το επόμενο είναι αύριο, στις 10:00.'
		);
		const saturday = { ...D.u2, startTime: '2026-11-21T08:00:00.000Z' };
		expect(doctorTodayNextLabel([saturday], TODAY_NOW, 'el')).toBe(
			'Το επόμενο είναι το Σάββατο 21 Νοεμβρίου, στις 10:00.'
		);
		const tuesday = { ...D.u2, startTime: '2026-11-17T08:00:00.000Z' };
		expect(doctorTodayNextLabel([tuesday], TODAY_NOW, 'el')).toBe(
			'Το επόμενο είναι την Τρίτη 17 Νοεμβρίου, στις 10:00.'
		);
		expect(doctorTodayNextLabel([], TODAY_NOW, 'el')).toBeNull();
	});
});

describe('the cards’ words (`sw.js:224-268`, U-140: the prototype’s, verbatim)', () => {
	const card = (
		appointment: DoctorAppointmentFacts,
		group: Parameters<typeof buildDoctorTodayCard>[0]['group'],
		soon = false
	) => buildDoctorTodayCard({ appointment, group, now: TODAY_NOW, locale: 'el', soon });

	it('a request for a relative: the relative, «Το έκλεισε: … (γονέας)», the note in quotes, «Απαντήστε έως τις 16:30», «Επιβεβαίωση»', () => {
		expect(card(D.r1, 'requests')).toEqual({
			id: 'r1',
			when: 'Σήμερα, 17:30',
			soon: null,
			name: 'Νίκος Μαυρίδης',
			meta: 'Επίσκεψη · 30 λεπτά · Κηφισίας 120',
			byline: 'Το έκλεισε: Ελένη Μαυρίδη (γονέας)',
			quote: '«Βήχας εδώ και μία εβδομάδα, χωρίς πυρετό.»',
			deadline: 'Απαντήστε έως τις 16:30',
			footnote: null,
			tag: null,
			dim: false,
			actions: { reject: true, move: true, confirm: true, outcomes: [] }
		});
	});

	it('a request of another day due today: «Δευτέρα 16 Νοεμβρίου, 10:00» · «Απαντήστε έως σήμερα, 21:15»; tomorrow and later', () => {
		const r2 = card(D.r2, 'requests');
		expect(r2.when).toBe('Δευτέρα 16 Νοεμβρίου, 10:00');
		expect(r2.deadline).toBe('Απαντήστε έως σήμερα, 21:15');
		expect(r2.byline).toBeNull();
		const dueTomorrow = { ...D.r2, expiresAt: '2026-11-15T07:00:00.000Z' };
		expect(card(dueTomorrow, 'requests').deadline).toBe('Απαντήστε έως αύριο, 09:00');
		const later = {
			...D.r2,
			startTime: '2026-11-20T08:00:00.000Z',
			expiresAt: '2026-11-16T07:00:00.000Z'
		};
		expect(card(later, 'requests').deadline).toBe('Απαντήστε έως Δευτέρα 16 Νοεμβρίου, 09:00');
		expect(card({ ...D.r2, expiresAt: null }, 'requests').deadline).toBeNull();
	});

	// D-W51-49 (card w51-w5) adds a request's «Απόρριψη» to the card's answers — the server's `canReject`, as the rest;
	// D-W51-51 (card w51-w6) its «Αλλαγή» — the server's `canReschedule` (a shape of the same decision, not a new one).
	it('🔴 D-W51-21: the buttons are the server’s — no «Επιβεβαίωση» without `canConfirm`, no «Απόρριψη» without `canReject`, no «Αλλαγή» without `canReschedule`; «Δεν ήρθε · Ολοκληρώθηκε» only as it allows', () => {
		const refused = { ...D.r1, actions: { ...D.r1.actions, canConfirm: false } };
		expect(card(refused, 'requests').actions).toEqual({
			reject: true,
			move: true,
			confirm: false,
			outcomes: []
		});
		const unrefusable = { ...D.r1, actions: { ...D.r1.actions, canReject: false } };
		expect(card(unrefusable, 'requests').actions).toEqual({
			reject: false,
			move: true,
			confirm: true,
			outcomes: []
		});
		const unmovable = { ...D.r1, actions: { ...D.r1.actions, canReschedule: false } };
		expect(card(unmovable, 'requests').actions.move).toBe(false);
		expect(card(D.o1, 'outcome').actions).toEqual({
			reject: false,
			move: false,
			confirm: false,
			outcomes: ['NO_SHOW', 'COMPLETED']
		});
		const onlyDone = { ...D.o1, actions: { ...D.o1.actions, outcomes: ['COMPLETED' as const] } };
		expect(card(onlyDone, 'outcome').actions.outcomes).toEqual(['COMPLETED']);
		// The other groups answer nothing here — a request in «Επερχόμενα» neither; a kept visit never moves from its card.
		const none = { reject: false, move: false, confirm: false, outcomes: [] };
		expect(card(D.n1, 'next').actions).toEqual(none);
		expect(card(D.r1, 'upcoming').actions).toEqual(none);
	});

	it('«Τι έγινε»: «Χθες, 18:00» and «Αν δεν απαντήσετε, σήμερα στις 18:30 …»; today’s visit «… αύριο στις 11:00 …»', () => {
		const o2 = card(D.o2, 'outcome');
		expect(o2.when).toBe('Χθες, 18:00');
		expect(o2.footnote).toBe('Αν δεν απαντήσετε, σήμερα στις 18:30 γράφεται «Ολοκληρώθηκε».');
		const o1 = card(D.o1, 'outcome');
		expect(o1.when).toBe('Σήμερα, 10:30');
		expect(o1.footnote).toBe('Αν δεν απαντήσετε, αύριο στις 11:00 γράφεται «Ολοκληρώθηκε».');
		expect(card({ ...D.o1, unattendedOutcomeAt: null }, 'outcome').footnote).toBeNull();
		expect(o1.quote).toBeNull();
		expect(o1.deadline).toBeNull();
	});

	it('«Επόμενα σήμερα»: the time alone, «σε 20 λεπτά» on the first only and only within the hour', () => {
		expect(card(D.n1, 'next', true)).toMatchObject({ when: '13:00', soon: 'σε 20 λεπτά' });
		expect(card(D.n1, 'next', false).soon).toBeNull();
		expect(card(D.n2, 'next', true).soon).toBeNull();
	});

	it('«Ολοκληρώθηκαν σήμερα»: fainter, the service alone, the doctor’s words of the state — who canceled', () => {
		expect(card(D.d1, 'done')).toMatchObject({
			when: '09:00',
			meta: 'Επίσκεψη',
			tag: { label: 'Ολοκληρώθηκε', tone: 'muted' },
			dim: true
		});
		expect(card(D.d2, 'done').tag).toEqual({ label: 'Ακυρώθηκε από τον ασθενή', tone: 'muted' });
		const noShow = { ...D.d1, status: 'no_show' as const };
		expect(card(noShow, 'done').tag?.label).toBe('Δεν ήρθε');
	});

	it('«Επερχόμενα»: the time, «Αίτημα» warm and «Επιβεβαιωμένο» green; the office in the page’s language', () => {
		expect(card(D.r2, 'upcoming')).toMatchObject({
			when: '10:00',
			tag: { label: 'Αίτημα', tone: 'warning' },
			deadline: null,
			quote: null
		});
		expect(card(D.u2, 'upcoming').tag).toEqual({ label: 'Επιβεβαιωμένο', tone: 'success' });
		expect(
			buildDoctorTodayCard({ appointment: D.u2, group: 'upcoming', now: TODAY_NOW, locale: 'en' })
				.meta
		).toBe('Επίσκεψη · 30 minutes · Kifisias 120');
	});

	it('🔴 D-W51-29: screen 67’s «Ιστορικό» — the whole date and the hour, the service, its length and the office, fainter, no answer', () => {
		expect(card(D.d1, 'history')).toMatchObject({
			when: 'Σάββατο 14 Νοεμβρίου, 09:00',
			meta: 'Επίσκεψη · 30 λεπτά · Κηφισίας 120',
			tag: { label: 'Ολοκληρώθηκε', tone: 'muted' },
			dim: true,
			deadline: null,
			quote: null,
			soon: null,
			actions: { reject: false, move: false, confirm: false, outcomes: [] }
		});
		// A row the server still offers an answer for shows none in the history.
		const offered = { ...D.r1, status: 'expired' as const };
		expect(card(offered, 'history').actions).toEqual({
			reject: false,
			move: false,
			confirm: false,
			outcomes: []
		});
	});

	it('🔴 D-W51-29: ποιος ακύρωσε / απέρριψε — «Ακυρώθηκε από τον ασθενή / από εσάς», «Απορρίφθηκε από εσάς», «Έληξε χωρίς απάντηση», «Δεν ήρθε»', () => {
		const as = (patch: Partial<DoctorAppointmentFacts>) =>
			card({ ...D.d1, ...patch }, 'history').tag;
		expect(as({ status: 'canceled', canceledBy: 'PATIENT' })?.label).toBe(
			'Ακυρώθηκε από τον ασθενή'
		);
		expect(as({ status: 'canceled', canceledBy: 'DOCTOR' })?.label).toBe('Ακυρώθηκε από εσάς');
		expect(as({ status: 'canceled', canceledBy: 'SYSTEM' })?.label).toBe('Ακυρώθηκε');
		expect(as({ status: 'canceled', canceledBy: 'BACKOFFICE' })?.label).toBe('Ακυρώθηκε');
		expect(as({ status: 'rejected', rejectedBy: 'DOCTOR' })?.label).toBe('Απορρίφθηκε από εσάς');
		expect(as({ status: 'rejected', rejectedBy: 'SYSTEM' })?.label).toBe('Απορρίφθηκε');
		// Who refused is read from `rejectedBy`, never from `canceledBy`.
		expect(as({ status: 'rejected', rejectedBy: null, canceledBy: 'DOCTOR' })?.label).toBe(
			'Απορρίφθηκε'
		);
		expect(as({ status: 'expired' })?.label).toBe('Έληξε χωρίς απάντηση');
		expect(as({ status: 'no_show' })?.label).toBe('Δεν ήρθε');
		expect(as({ status: 'unavailable' })?.label).toBe('Μη διαθέσιμο');
	});

	it('(negative) a relative with no word this build knows: «Το έκλεισε: {όνομα}»; no names at all: nothing made up', () => {
		const odd = { ...D.r1, relative: { name: 'Νίκος Μαυρίδης', relationship: 'GUARDIAN' } };
		expect(card(odd, 'requests').byline).toBe('Το έκλεισε: Ελένη Μαυρίδη');
		const nameless = doctorAppointmentFacts({
			patientSnapshot: {
				id: 'p',
				tenantUserId: null,
				firstName: null,
				lastName: null,
				phoneE164: null
			}
		});
		expect(card(nameless, 'next')).toMatchObject({ name: '', byline: null });
	});
});

describe('🔴 D-W51-71 · a patient without an account on the cards of 66 and 67 (card w51-w8)', () => {
	it('«Χωρίς λογαριασμό eDoctor» in the byline’s place, in every group; an account’s card says nothing of it', () => {
		const record = { ...doctorAppointmentFacts(), patientKind: 'RECORD' as const, relative: null };
		for (const group of ['requests', 'outcome', 'next', 'done', 'upcoming', 'history'] as const) {
			expect(
				buildDoctorTodayCard({ appointment: record, group, now: TODAY_NOW, locale: 'el' }).byline,
				group
			).toBe('Χωρίς λογαριασμό eDoctor');
		}
		expect(
			buildDoctorTodayCard({
				appointment: { ...doctorAppointmentFacts(), relative: null },
				group: 'next',
				now: TODAY_NOW,
				locale: 'el'
			}).byline
		).toBeNull();
	});
});
