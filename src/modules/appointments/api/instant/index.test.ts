import { describe, expect, it } from 'vitest';
import { readInstant } from '.';

describe('modules/appointments/api/instant · an instant of the server, or none (D-118)', () => {
	it('a whole ISO instant with its zone is kept as written: `Z` or an offset, with or without seconds and fractions', () => {
		for (const value of [
			'2026-11-11T10:30:00.000Z',
			'2026-11-11T10:30:00Z',
			'2026-11-11T10:30Z',
			'2026-11-11T12:30:00+02:00',
			'2026-11-11T12:30:00.123456-05:30',
			'  2026-11-11T10:30:00.000Z  '
		]) {
			expect(readInstant(value), value).toBe(value.trim());
		}
	});

	it('🔴 review w4-w6 R1 MINOR-1 (negative): a day alone, a local hour, a day the engine reads its own way, an RFC date — none, never a moment made up', () => {
		for (const value of [
			'2026-11-11',
			'2026-11-11T10:30:00',
			'2026-11-11 10:30:00Z',
			'11/11/2026',
			'Wed, 11 Nov 2026 10:30:00 GMT',
			'November 11, 2026 10:30',
			'1731320000000',
			'soon',
			''
		]) {
			expect(readInstant(value), value).toBeNull();
		}
	});

	it('(negative) the right shape of a moment that does not exist, and anything that is not text: none, never a throw', () => {
		for (const value of [
			'2026-13-45T10:30:00.000Z',
			'2026-11-11T25:61:00Z',
			'2026-11-11T10:30:00+99:99',
			1731320000000,
			new Date('2026-11-11T10:30:00.000Z'),
			null,
			undefined,
			{},
			[]
		]) {
			expect(readInstant(value), String(value)).toBeNull();
		}
	});
});
