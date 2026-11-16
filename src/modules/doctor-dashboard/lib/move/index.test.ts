import { describe, expect, it } from 'vitest';
import {
	doctorAppointmentDetailFacts,
	doctorRequestForRelativeRow,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import { mapDoctorAppointmentDetail } from '$modules/doctor-dashboard/api/appointments';
import {
	buildDoctorMoveContext,
	buildDoctorMoveDays,
	buildDoctorMoveDiff,
	doctorMoveEntry,
	doctorMoveHelp,
	doctorMoveRule,
	doctorMoveSaveLabel,
	doctorMoveSelectedDay
} from '.';

/*
 * Wave 5.1 · screen 70 «Αλλαγή ώρας» in words (D-W51-51): «now» the prototype's Saturday 14 November 2026, 12:40 Athens
 * (10:40 UTC). Made-up people.
 */

const request = () => {
	const facts = mapDoctorAppointmentDetail(doctorRequestForRelativeRow());
	if (!facts) throw new Error('sample unreadable');
	return facts;
};
const kept = () => doctorAppointmentDetailFacts();

const page = (days: { date: string; slots: string[] }[]) => ({
	timeZone: 'Europe/Athens',
	durationMinutes: 30,
	days: days.map((day) => ({
		date: day.date,
		slots: day.slots.map((startTime) => ({
			startTime,
			endTime: new Date(Date.parse(startTime) + 30 * 60_000).toISOString()
		}))
	}))
});

describe('screen 70 · «Αλλαγή ώρας» (D-W51-51)', () => {
	it('🔴 U-190.2: αίτημα ⇒ «Αλλαγή και επιβεβαίωση» — a kept visit «Αποθήκευση»; the box says «Το αίτημα» / «Το ραντεβού»', () => {
		expect(doctorMoveSaveLabel(request(), 'el')).toBe('Αλλαγή και επιβεβαίωση');
		expect(doctorMoveSaveLabel(kept(), 'el')).toBe('Αποθήκευση');
		expect(doctorMoveSaveLabel(request(), 'en')).toBe('Change and confirm');
		expect(buildDoctorMoveContext(request(), 'el')).toMatchObject({
			label: 'Το αίτημα',
			title: 'Σάββατο 14 Νοεμβρίου · 17:30',
			lines: ['Νίκος Μαυρίδης · Επίσκεψη · 30 λεπτά', 'Πατησίων 45']
		});
		expect(buildDoctorMoveContext(kept(), 'el').label).toBe('Το ραντεβού');
	});

	it('the form only while the server lets the hour move — a request or a kept visit with `canReschedule`; (negative) never one over', () => {
		expect(doctorMoveEntry(request())).toBe('form');
		expect(doctorMoveEntry(kept())).toBe('form');
		const actions = { ...kept().actions };
		expect(
			doctorMoveEntry({ status: 'booked', actions: { ...actions, canReschedule: false } })
		).toBe('closed');
		for (const status of ['completed', 'checked_in', 'canceled', 'no_show'] as const) {
			expect(
				doctorMoveEntry({ status, actions: { ...actions, canReschedule: true } }),
				status
			).toBe('closed');
		}
	});

	it('🔴 D-W51-51: the web knows no linked calendar, so «Μόνο οι ώρες…» ends at «…που έχετε.», then the 52’s line', () => {
		expect(doctorMoveHelp('el')).toBe(
			'Μόνο οι ώρες που είστε πραγματικά ελεύθερος/η: το πρόγραμμά σας, χωρίς τα ραντεβού που έχετε. Η ώρα αλλάζει στο ίδιο ιατρείο και για την ίδια υπηρεσία.'
		);
		expect(doctorMoveHelp('el')).not.toMatch(/Google|Outlook|\{/u);
		expect(doctorMoveHelp('en')).toMatch(/^Only the hours you are really free/u);
	});

	it('🔴 U-189.1: μόνο οι πραγματικά ελεύθερες ώρες — the server’s hours alone, on the office’s clock; less those taken or passed; a day with none dimmed, each day once', () => {
		const days = buildDoctorMoveDays({
			pages: [
				page([
					{ date: '2026-11-14', slots: ['2026-11-14T10:30:00.000Z', '2026-11-14T13:00:00.000Z'] },
					{ date: '2026-11-15', slots: [] },
					{ date: '2026-11-16', slots: ['2026-11-16T07:00:00.000Z', '2026-11-16T07:30:00.000Z'] }
				]),
				page([{ date: '2026-11-16', slots: ['2026-11-16T15:00:00.000Z'] }])
			],
			gone: ['2026-11-16T07:30:00.000Z'],
			now: TODAY_NOW,
			locale: 'el'
		});
		expect(
			days.map((day) => [day.date, day.label, day.disabled, day.slots.map((s) => s.label)])
		).toEqual([
			['2026-11-14', 'Σάβ 14', false, ['15:00']],
			['2026-11-15', 'Κυρ 15', true, []],
			['2026-11-16', 'Δευ 16', false, ['09:00']]
		]);
		expect(days[2].slots[0].startTime).toBe('2026-11-16T07:00:00.000Z');
		expect(days[2].accessibleLabel).toBe(`Δευ 16 ${days[2].sublabel}`);
	});

	it('the strip opens on the day chosen while it has an hour, else the first with one, else the first', () => {
		const days = buildDoctorMoveDays({
			pages: [
				page([
					{ date: '2026-11-15', slots: [] },
					{ date: '2026-11-16', slots: ['2026-11-16T07:00:00.000Z'] },
					{ date: '2026-11-17', slots: ['2026-11-17T07:00:00.000Z'] }
				])
			],
			gone: [],
			now: TODAY_NOW,
			locale: 'el'
		});
		expect(doctorMoveSelectedDay(days, null)?.date).toBe('2026-11-16');
		expect(doctorMoveSelectedDay(days, '2026-11-17')?.date).toBe('2026-11-17');
		expect(doctorMoveSelectedDay(days, '2026-11-15')?.date).toBe('2026-11-16');
		expect(doctorMoveSelectedDay(days.slice(0, 1), null)?.date).toBe('2026-11-15');
		expect(doctorMoveSelectedDay([], null)).toBeNull();
	});

	it('🔴 U-90.1 Α2: κανόνας ακύρωσης μέσα / έξω — «έως 8 ώρες πριν», or within those 8 hours «ως την ώρα του ραντεβού, χωρίς «εκπρόθεσμη»»; one hour in the singular; none without terms', () => {
		const appointment = request();
		expect(doctorMoveRule(appointment, '2026-11-16T07:00:00.000Z', TODAY_NOW, 'el')).toBe(
			'Ο ασθενής ακυρώνει μόνο με τους κανόνες σας: έως 8 ώρες πριν.'
		);
		expect(doctorMoveRule(appointment, '2026-11-14T15:00:00.000Z', TODAY_NOW, 'el')).toBe(
			'Η νέα ώρα είναι ήδη μέσα στην προθεσμία ακύρωσης (8 ώρες): ο ασθενής μπορεί να ακυρώσει ως την ώρα του ραντεβού, χωρίς «εκπρόθεσμη».'
		);
		// Exactly 8 hours ahead is outside; a minute less is inside.
		expect(doctorMoveRule(appointment, '2026-11-14T18:40:00.000Z', TODAY_NOW, 'el')).toMatch(
			/^Ο ασθενής/u
		);
		expect(doctorMoveRule(appointment, '2026-11-14T18:39:00.000Z', TODAY_NOW, 'el')).toMatch(
			/^Η νέα ώρα/u
		);
		const one = { patientCancellation: { cutoffHours: 1, deadline: null } };
		expect(doctorMoveRule(one, '2026-11-16T07:00:00.000Z', TODAY_NOW, 'el')).toBe(
			'Ο ασθενής ακυρώνει μόνο με τους κανόνες σας: έως 1 ώρα πριν.'
		);
		expect(doctorMoveRule(one, '2026-11-14T11:00:00.000Z', TODAY_NOW, 'el')).toMatch(/\(1 ώρα\)/u);
		expect(
			doctorMoveRule({ patientCancellation: null }, '2026-11-16T07:00:00.000Z', TODAY_NOW, 'el')
		).toBeNull();
	});

	it('«Ήταν / Νέα ώρα» on the office’s clock, then what follows: a request is confirmed, a kept one stays, and the rule', () => {
		const forRequest = buildDoctorMoveDiff({
			appointment: request(),
			startTime: '2026-11-16T07:00:00.000Z',
			timeZone: 'Europe/Athens',
			now: TODAY_NOW,
			locale: 'el'
		});
		expect(forRequest).toEqual({
			was: 'Σάββατο 14 Νοεμβρίου · 17:30',
			next: 'Δευτέρα 16 Νοεμβρίου · 09:00',
			note: 'Το αίτημα επιβεβαιώνεται στη νέα ώρα και ο ασθενής ενημερώνεται αυτόματα. Ο ασθενής ακυρώνει μόνο με τους κανόνες σας: έως 8 ώρες πριν.'
		});
		const forKept = buildDoctorMoveDiff({
			appointment: kept(),
			startTime: '2026-11-17T08:00:00.000Z',
			timeZone: 'Europe/Athens',
			now: TODAY_NOW,
			locale: 'el'
		});
		expect(forKept.note).toMatch(
			/^Το ραντεβού μένει επιβεβαιωμένο\. Ο ασθενής ενημερώνεται αυτόματα\. /u
		);
	});
});
