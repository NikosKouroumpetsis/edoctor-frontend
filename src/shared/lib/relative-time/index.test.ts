import { describe, expect, it } from 'vitest';
import { inMinutesLabel, minutesUntil, withinDayLabel } from '.';

/** The prototype's «now»: Saturday 14 November 2026, 12:40 Athens (10:40 UTC). */
const NOW = Date.parse('2026-11-14T10:40:00.000Z');

describe('D-W51-27 · «σε {n} λεπτά», the shared relative time', () => {
	it('whole minutes rounded up: 13:00 at 12:40 is 20, half a minute short is still 20, never 0', () => {
		expect(minutesUntil('2026-11-14T11:00:00.000Z', NOW)).toBe(20);
		expect(minutesUntil('2026-11-14T11:00:00.000Z', NOW + 30_000)).toBe(20);
		expect(minutesUntil(NOW + 1, NOW)).toBe(1);
	});

	it('the prototype’s words: «σε 20 λεπτά», «σε 1 λεπτό», in English too', () => {
		expect(inMinutesLabel('2026-11-14T11:00:00.000Z', NOW, 'el')).toBe('σε 20 λεπτά');
		expect(inMinutesLabel(NOW + 60_000, NOW, 'el')).toBe('σε 1 λεπτό');
		expect(inMinutesLabel('2026-11-14T11:00:00.000Z', NOW, 'en')).toBe('in 20 minutes');
		expect(inMinutesLabel(NOW + 60_000, NOW, 'en')).toBe('in 1 minute');
	});

	it('only within the hour by default: 60 minutes is said, 61 is not; a caller may name another bound', () => {
		expect(inMinutesLabel(NOW + 60 * 60_000, NOW, 'el')).toBe('σε 60 λεπτά');
		expect(inMinutesLabel(NOW + 61 * 60_000, NOW, 'el')).toBeNull();
		expect(inMinutesLabel(NOW + 61 * 60_000, NOW, 'el', 90)).toBe('σε 61 λεπτά');
	});

	it('(negative) a moment reached or passed, or no instant, says nothing', () => {
		expect(minutesUntil(NOW, NOW)).toBeNull();
		expect(minutesUntil(NOW - 1, NOW)).toBeNull();
		expect(minutesUntil('not a date', NOW)).toBeNull();
		expect(minutesUntil(Number.NaN, NOW)).toBeNull();
		expect(inMinutesLabel('', NOW, 'el')).toBeNull();
	});
});

describe('D-W51-38 · «Σε 5 ώρες» / «Πριν από 2 ώρες», screen 68’s head', () => {
	const HOUR = 60 * 60_000;
	it('ahead: the prototype’s «Σε 20 λεπτά», «Σε 1 ώρα», «Σε 5 ώρες» (17:30 at 12:40, the nearest hour)', () => {
		expect(withinDayLabel('2026-11-14T11:00:00.000Z', NOW, 'el')).toBe('Σε 20 λεπτά');
		expect(withinDayLabel('2026-11-14T12:00:00.000Z', NOW, 'el')).toBe('Σε 1 ώρα');
		expect(withinDayLabel('2026-11-14T15:30:00.000Z', NOW, 'el')).toBe('Σε 5 ώρες');
		expect(withinDayLabel(NOW + 30_000, NOW, 'el')).toBe('Σε 1 λεπτό');
		expect(withinDayLabel('2026-11-14T15:30:00.000Z', NOW, 'en')).toBe('In 5 hours');
	});

	it('behind: «Πριν από 10 λεπτά», «Πριν από 2 ώρες» (10:30 at 12:40, whole hours)', () => {
		expect(withinDayLabel(NOW - 10 * 60_000, NOW, 'el')).toBe('Πριν από 10 λεπτά');
		expect(withinDayLabel('2026-11-14T08:30:00.000Z', NOW, 'el')).toBe('Πριν από 2 ώρες');
		expect(withinDayLabel(NOW - HOUR, NOW, 'el')).toBe('Πριν από 1 ώρα');
		expect(withinDayLabel(NOW - 20_000, NOW, 'en')).toBe('1 minute ago');
	});

	it('(negative) a day or more away, the very instant, or no instant says nothing (the caller says the day)', () => {
		expect(withinDayLabel(NOW + 24 * HOUR, NOW, 'el')).toBeNull();
		expect(withinDayLabel(NOW - 30 * HOUR, NOW, 'el')).toBeNull();
		expect(withinDayLabel(NOW, NOW, 'el')).toBeNull();
		expect(withinDayLabel('not a date', NOW, 'el')).toBeNull();
	});
});
