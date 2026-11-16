import { describe, expect, it } from 'vitest';
import {
	appointmentDateLabel,
	appointmentDayMonthLabel,
	appointmentNearDayLabel,
	appointmentNearWhenLabel,
	appointmentDayTime,
	appointmentDayTimeLabel,
	appointmentDaysAway,
	appointmentDeadlineLabel,
	appointmentDurationLabel,
	appointmentMonthKey,
	appointmentMonthLabel,
	appointmentRelativeDayLabel,
	appointmentShortWhenLabel
} from '.';

const ATHENS = 'Europe/Athens';
/** The prototypes' «today»: Tuesday 10 November 2026, 12:00 Athens (10:00 UTC, winter time UTC+2). */
const NOW = Date.parse('2026-11-10T10:00:00.000Z');

describe('wave 4.0 · the appointment’s hours, on its office’s clock', () => {
	it('the day and the time as two parts, and in one line (record §6.1)', () => {
		expect(appointmentDayTime('2026-11-12T10:30:00.000Z', 'el', ATHENS)).toEqual({
			day: 'Πέμπτη 12 Νοεμβρίου',
			time: '12:30'
		});
		expect(appointmentDayTimeLabel('2026-11-12T10:30:00.000Z', 'el', ATHENS)).toBe(
			'Πέμπτη 12 Νοεμβρίου · 12:30'
		);
		expect(appointmentDayTimeLabel('2026-11-12T10:30:00.000Z', 'en', ATHENS)).toBe(
			'Thursday, November 12 · 12:30'
		);
	});

	it('🔴 a visit at 23:30 in Athens is that day in Athens, the next in UTC’s eyes — never the device’s', () => {
		// 2026-11-12 21:30 UTC = Thursday 12 November 23:30 Athens.
		expect(appointmentDayTimeLabel('2026-11-12T21:30:00.000Z', 'el', ATHENS)).toBe(
			'Πέμπτη 12 Νοεμβρίου · 23:30'
		);
		// The same instant on a London office's clock.
		expect(appointmentDayTimeLabel('2026-11-12T21:30:00.000Z', 'el', 'Europe/London')).toBe(
			'Πέμπτη 12 Νοεμβρίου · 21:30'
		);
		// 22:30 UTC = Friday 00:30 in Athens.
		expect(appointmentDayTimeLabel('2026-11-12T22:30:00.000Z', 'el', ATHENS)).toBe(
			'Παρασκευή 13 Νοεμβρίου · 00:30'
		);
	});

	it('the short form in passing, the deadline’s form, a date, a month (the prototypes’ words)', () => {
		expect(appointmentShortWhenLabel('2026-11-12T09:00:00.000Z', 'el', ATHENS)).toBe(
			'Πέμ 12 Νοε · 11:00'
		);
		expect(appointmentShortWhenLabel('2026-11-13T17:00:00.000Z', 'el', ATHENS)).toBe(
			'Παρ 13 Νοε · 19:00'
		);
		expect(appointmentDeadlineLabel('2026-11-11T10:30:00.000Z', 'el', ATHENS)).toBe(
			'Τετάρτη 11 Νοεμβρίου, 12:30'
		);
		expect(appointmentDateLabel('2026-12-21T08:00:00.000Z', 'el', ATHENS)).toBe(
			'21 Δεκεμβρίου 2026'
		);
		expect(appointmentMonthLabel('2026-10-22T07:00:00.000Z', 'el', ATHENS)).toBe('Οκτώβριος 2026');
		expect(appointmentMonthLabel('2026-10-22T07:00:00.000Z', 'en', ATHENS)).toBe('October 2026');
		// 31 October 23:30 UTC is already 1 November in Athens: the month is the office's.
		expect(appointmentMonthKey('2026-10-31T23:30:00.000Z', ATHENS)).toBe('2026-11');
	});

	it('«Σήμερα» / «Αύριο» / «Σε Ν ημέρες» by the office’s calendar against the server’s now (D-118), around midnight', () => {
		expect(appointmentRelativeDayLabel('2026-11-10T16:00:00.000Z', NOW, 'el', ATHENS)).toBe(
			'Σήμερα'
		);
		expect(appointmentRelativeDayLabel('2026-11-11T07:00:00.000Z', NOW, 'el', ATHENS)).toBe(
			'Αύριο'
		);
		expect(appointmentRelativeDayLabel('2026-11-12T10:30:00.000Z', NOW, 'el', ATHENS)).toBe(
			'Σε 2 ημέρες'
		);
		expect(appointmentRelativeDayLabel('2026-11-24T15:30:00.000Z', NOW, 'en', ATHENS)).toBe(
			'In 14 days'
		);
		// 21:59 UTC on the 10th is 23:59 in Athens (today); 22:00 UTC is 00:00 of the 11th (tomorrow).
		expect(appointmentDaysAway('2026-11-10T21:59:00.000Z', NOW, ATHENS)).toBe(0);
		expect(appointmentDaysAway('2026-11-10T22:00:00.000Z', NOW, ATHENS)).toBe(1);
		// Late on the 10th in Athens the server's «now» is already the 11th's: a visit on the 11th is today.
		expect(
			appointmentRelativeDayLabel(
				'2026-11-11T08:00:00.000Z',
				Date.parse('2026-11-10T22:30:00.000Z'),
				'el',
				ATHENS
			)
		).toBe('Σήμερα');
	});

	it('(negative) what is no instant reads as nothing; a day already past has no «σε Ν»; no length, no «Διάρκεια»', () => {
		expect(appointmentDayTime('soon', 'el', ATHENS)).toBeNull();
		expect(appointmentDayTimeLabel('', 'el', ATHENS)).toBe('');
		expect(appointmentShortWhenLabel('x', 'el', ATHENS)).toBe('');
		expect(appointmentDeadlineLabel('x', 'el', ATHENS)).toBe('');
		expect(appointmentMonthLabel('x', 'el', ATHENS)).toBe('');
		expect(appointmentMonthKey('x', ATHENS)).toBeNull();
		expect(appointmentRelativeDayLabel('2026-11-09T10:00:00.000Z', NOW, 'el', ATHENS)).toBeNull();
		expect(appointmentDaysAway('2026-11-12T10:30:00.000Z', Number.NaN, ATHENS)).toBeNull();
		expect(appointmentDurationLabel(30, 'el')).toBe('Διάρκεια 30 λεπτά');
		expect(appointmentDurationLabel(30, 'en')).toBe('30 minutes');
		for (const minutes of [null, 0, -5, Number.NaN]) {
			expect(appointmentDurationLabel(minutes, 'el')).toBeNull();
		}
	});
});

describe('D-W51-38 · «τελευταία 22 Οκτωβρίου», a day without its year', () => {
	it('the office’s calendar day, its month in words (an instant just after midnight in Athens is the next day)', () => {
		expect(appointmentDayMonthLabel('2026-10-22T09:00:00.000Z', 'el', ATHENS)).toBe('22 Οκτωβρίου');
		expect(appointmentDayMonthLabel('2026-10-21T22:30:00.000Z', 'el', ATHENS)).toBe('22 Οκτωβρίου');
		expect(appointmentDayMonthLabel('2026-10-22T09:00:00.000Z', 'en', ATHENS)).toBe('October 22');
	});

	it('(negative) no instant is no words', () => {
		expect(appointmentDayMonthLabel('not a date', 'el', ATHENS)).toBe('');
	});
});

describe('D-W51-74 · D-W51-86 · «σήμερα, 17:30» and «χθες»: the lines of 66 / 67 / 73 / 74', () => {
	/** Sunday 15 November 2026, 12:00 in Athens. */
	const SUNDAY = Date.parse('2026-11-15T10:00:00.000Z');

	it('near «now» a small word, else the whole day; with the hour, or the day alone (the year when asked)', () => {
		expect(appointmentNearWhenLabel('2026-11-15T15:30:00.000Z', SUNDAY, 'el', ATHENS)).toBe(
			'σήμερα, 17:30'
		);
		expect(appointmentNearWhenLabel('2026-11-16T09:00:00.000Z', SUNDAY, 'el', ATHENS)).toBe(
			'αύριο, 11:00'
		);
		expect(appointmentNearWhenLabel('2026-11-18T09:00:00.000Z', SUNDAY, 'el', ATHENS)).toBe(
			'Τετάρτη 18 Νοεμβρίου, 11:00'
		);
		expect(appointmentNearDayLabel('2026-11-14T08:00:00.000Z', SUNDAY, 'el', ATHENS)).toBe('χθες');
		expect(appointmentNearDayLabel('2026-10-13T08:00:00.000Z', SUNDAY, 'el', ATHENS)).toBe(
			'13 Οκτωβρίου'
		);
		expect(appointmentNearDayLabel('2026-11-15T08:00:00.000Z', SUNDAY, 'el', ATHENS, true)).toBe(
			'15 Νοεμβρίου 2026'
		);
		expect(appointmentNearDayLabel('2026-11-15T08:00:00.000Z', SUNDAY, 'en', ATHENS)).toBe('today');
	});

	it('(negative) what is no instant reads as nothing, never a wrong day', () => {
		expect(appointmentNearWhenLabel('not a date', SUNDAY, 'el', ATHENS)).toBe('');
		expect(appointmentNearDayLabel('not a date', SUNDAY, 'el', ATHENS)).toBeNull();
	});
});
