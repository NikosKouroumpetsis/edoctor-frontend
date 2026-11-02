import { afterEach, describe, expect, it } from 'vitest';
import { readServerNow, recordServerNow, resetServerClock } from '.';

afterEach(() => resetServerClock());

describe('server clock', () => {
	// MINOR-3 (r1, D-118): the category rows read «Σήμερα / Αύριο» on the device's clock; the application reads the
	// server's «now» (`useServerNow`).
	it('D-118: keeps how far the server’s clock stands from the device’s, past a 5 s tolerance', () => {
		const now = Date.now();
		recordServerNow(now + 2_000, now);
		expect(Math.abs(readServerNow() - Date.now())).toBeLessThan(1_000);
		recordServerNow(now - 86_400_000, now);
		expect(Math.round((Date.now() - readServerNow()) / 1_000)).toBe(86_400);
		recordServerNow(Number.NaN, now);
		expect(Math.round((Date.now() - readServerNow()) / 1_000)).toBe(86_400);
		recordServerNow(now, now);
		expect(Math.abs(readServerNow() - Date.now())).toBeLessThan(1_000);
	});

	it('D-118: `resetServerClock` forgets the difference (the application’s test seam)', () => {
		const now = Date.now();
		recordServerNow(now + 3_600_000, now);
		expect(readServerNow() - Date.now()).toBeGreaterThan(3_500_000);
		resetServerClock();
		expect(Math.abs(readServerNow() - Date.now())).toBeLessThan(1_000);
	});
});
