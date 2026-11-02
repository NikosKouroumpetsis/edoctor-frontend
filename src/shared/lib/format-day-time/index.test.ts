import { describe, expect, it } from 'vitest';
import { formatDayTime, formatInstantDayTime, msUntilNextPlatformDay } from './index';

// Saturday 31 October 2026, 23:30 in Athens (UTC+2): «today» ends in thirty minutes.
const LATE = Date.parse('2026-10-31T23:30:00+02:00');

describe('format-day-time (the ONE day-and-time phrase, S-32.9)', () => {
	it('S-32.9 (app = web): «Σήμερα · 10:00», «Αύριο · 10:00», else «Δευ 2 Νοε · 10:00» on the Greek calendar', () => {
		expect(formatDayTime({ day: '2026-10-31', minute: 600 }, LATE, 'el')).toBe('Σήμερα · 10:00');
		expect(formatDayTime({ day: '2026-11-01', minute: 600 }, LATE, 'el')).toBe('Αύριο · 10:00');
		expect(formatDayTime({ day: '2026-11-02', minute: 570 }, LATE, 'el')).toMatch(
			/2 Νοε · 09:30$/u
		);
		expect(formatDayTime({ day: '2026-02-31', minute: 600 }, LATE, 'el')).toBe('');
	});

	it('D-118: an instant is read on the platform’s clock, whatever the device’s', () => {
		expect(formatInstantDayTime(Date.parse('2026-11-01T08:00:00Z'), LATE, 'el')).toBe(
			'Αύριο · 10:00'
		);
		expect(formatInstantDayTime(Number.NaN, LATE, 'el')).toBe('');
	});

	it('S-34.1: the wait until the platform’s next day — thirty minutes at 23:30 in Athens, never under a second', () => {
		expect(msUntilNextPlatformDay(LATE)).toBe(30 * 60_000);
		expect(msUntilNextPlatformDay(Date.parse('2026-11-01T00:00:00+02:00'))).toBe(24 * 3_600_000);
		expect(msUntilNextPlatformDay(Date.parse('2026-10-31T23:59:59.900+02:00'))).toBe(1_000);
	});
});
