import { describe, expect, it } from 'vitest';
import { bookingReadinessSample } from '../booking.sample';
import { asksFirstVisit, firstVisitPayload } from '.';

describe('«Είναι το πρώτο σας ραντεβού…;» (Ε2 = Α, U-104.3)', () => {
	it('U-104.3 Ε2: asked only when the server does not know; never while unknown or known', () => {
		expect(asksFirstVisit({ ...bookingReadinessSample, firstVisitKnown: false })).toBe(true);
		expect(asksFirstVisit({ ...bookingReadinessSample, firstVisitKnown: true })).toBe(false);
		expect(asksFirstVisit({ ...bookingReadinessSample, firstVisitKnown: null })).toBe(false);
		expect(asksFirstVisit(undefined)).toBe(false);
	});

	it('the answer travels only when asked', () => {
		expect(firstVisitPayload(true, 'yes')).toEqual({ firstVisit: true });
		expect(firstVisitPayload(true, 'no')).toEqual({ firstVisit: false });
		expect(firstVisitPayload(false, 'no')).toEqual({});
	});
});
