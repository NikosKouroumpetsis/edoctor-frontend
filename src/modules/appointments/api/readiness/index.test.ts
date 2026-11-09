import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BookingReadinessView } from '$shared/lib/api-client';
import { bookingReadinessQuery, getBookingReadiness, mapBookingReadiness } from '.';

afterEach(() => vi.unstubAllGlobals());

const answer = {
	phoneVerified: true,
	nameComplete: true,
	dateOfBirthPresent: false,
	blockers: ['BOOKING_NOTICE_TOO_SHORT'] as const,
	insideCancellationCutoff: false
};

describe('the readiness of a booking (D-05, wave 3 A-1 / A-3)', () => {
	it('maps the flags and the blockers, and the two wave-3 facts when the server names them', () => {
		expect(
			mapBookingReadiness({
				...answer,
				blockers: [...answer.blockers],
				firstVisitKnown: false,
				patientSmsExpected: true
			})
		).toEqual({
			phoneVerified: true,
			nameComplete: true,
			dateOfBirthPresent: false,
			blockers: ['BOOKING_NOTICE_TOO_SHORT'],
			insideCancellationCutoff: false,
			firstVisitKnown: false,
			patientSmsExpected: true
		});
	});

	it('(negative) an older server leaves the wave-3 facts out: they read `null`, never a guess', () => {
		const facts = mapBookingReadiness({
			...answer,
			blockers: []
		} as unknown as BookingReadinessView);
		expect(facts.firstVisitKnown).toBeNull();
		expect(facts.patientSmsExpected).toBeNull();
	});

	it('W-4 (negative): a broken answer reads as «not done» — no answer, blockers that are no list, flags that are no booleans', () => {
		const nothing = {
			phoneVerified: false,
			nameComplete: false,
			dateOfBirthPresent: false,
			blockers: [],
			insideCancellationCutoff: false,
			firstVisitKnown: null,
			patientSmsExpected: null
		};
		expect(mapBookingReadiness(null)).toEqual(nothing);
		expect(
			mapBookingReadiness({
				phoneVerified: 'yes',
				blockers: 'DOCTOR_NOT_VERIFIED',
				firstVisitKnown: 0,
				patientSmsExpected: 'true'
			} as unknown as BookingReadinessView)
		).toEqual(nothing);
		expect(
			mapBookingReadiness({
				...answer,
				blockers: ['DOCTOR_NOT_VERIFIED', 7, null]
			} as unknown as BookingReadinessView).blockers
		).toEqual(['DOCTOR_NOT_VERIFIED']);
	});

	it('asks with the doctor, the office and the instant together, and the relative only when chosen', async () => {
		const spy = vi.fn(
			async () =>
				new Response(JSON.stringify({ status: 'ok', data: { ...answer, blockers: [] } }), {
					status: 200
				})
		);
		vi.stubGlobal('fetch', spy);
		await getBookingReadiness({
			doctorId: 'd-1',
			slot: { officeId: 'o-1', startTime: '2026-11-09T07:30:00.000Z' },
			relativeId: null
		});
		const url = new URL(String((spy.mock.calls[0] as unknown as [string])[0]), 'http://localhost');
		expect(url.pathname).toMatch(/\/appointment\/booking-readiness$/u);
		expect(Object.fromEntries(url.searchParams)).toEqual({
			doctorId: 'd-1',
			officeId: 'o-1',
			startTime: '2026-11-09T07:30:00.000Z'
		});
	});

	it('🔴 U-65.6: keyed by every input, and personal', () => {
		const query = bookingReadinessQuery({ doctorId: 'd', slot: null, relativeId: 'r' });
		expect(query.queryKey).toEqual(['appointments', 'readiness', 'd', null, null, 'r']);
		expect(query.meta).toEqual({ personal: true });
	});
});
