import { describe, expect, it } from 'vitest';
import { buildDoctorWeeklyHours } from './index';

const ranges = (startMinute: number, endMinute: number) => [{ startMinute, endMinute }];
// Tuesday 3 November 2026, 10:00 in Athens.
const TUESDAY = Date.parse('2026-11-03T08:00:00Z');

describe('buildDoctorWeeklyHours (U-68.1 Π5)', () => {
	it('neighbours in one line, the closed days last, today marked on the office’s clock', () => {
		const rows = buildDoctorWeeklyHours(
			{
				timezone: 'Europe/Athens',
				days: [
					{ day: 'monday', ranges: [...ranges(540, 840), ...ranges(1020, 1200)] },
					{ day: 'tuesday', ranges: [...ranges(540, 840), ...ranges(1020, 1200)] },
					{ day: 'wednesday', ranges: [...ranges(540, 840), ...ranges(1020, 1200)] },
					{ day: 'saturday', ranges: ranges(540, 780) }
				]
			},
			'el',
			TUESDAY
		);
		expect(rows.map((row) => row.days)).toEqual(['Δευ–Τετ', 'Σάβ', 'Πέμ–Παρ, Κυρ']);
		expect(rows[0]).toMatchObject({ ranges: ['09:00–14:00', '17:00–20:00'], today: true });
		expect(rows[2]).toMatchObject({ ranges: [], today: false });
	});

	it('days apart with the same hours share a line, comma-separated', () => {
		const rows = buildDoctorWeeklyHours(
			{
				timezone: 'Europe/Athens',
				days: [
					{ day: 'monday', ranges: ranges(900, 1140) },
					{ day: 'wednesday', ranges: ranges(900, 1140) }
				]
			},
			'en',
			TUESDAY
		);
		expect(rows[0].days).toBe('Mon, Wed');
		expect(rows[1]).toMatchObject({ days: 'Tue, Thu–Sun', today: true });
	});

	it('D-118 (negative): an unknown time zone never throws, the platform’s clock stands in', () => {
		const rows = buildDoctorWeeklyHours(
			{ timezone: 'Mars/Olympus', days: [{ day: 'tuesday', ranges: ranges(540, 600) }] },
			'el',
			TUESDAY
		);
		expect(rows[0].today).toBe(true);
	});
});
