import { describe, expect, it } from 'vitest';
import { bookingPatientSample, bookingReadinessSample } from '../booking.sample';
import { buildBookingRequest, resolveBookingSubmit } from '.';

const ready = {
	signedIn: true,
	slotState: 'offered' as const,
	patient: bookingPatientSample,
	readiness: bookingReadinessSample,
	serviceId: 'svc-simple' as string | undefined,
	visitor: { kind: 'self' } as { kind: 'self' } | { kind: 'relative'; relativeId: string },
	locale: 'el' as const
};

describe('«Επιβεβαίωση κράτησης» (P-W3 §3.2.3, app = web)', () => {
	it('a guest signs in first; a member with everything books', () => {
		expect(resolveBookingSubmit({ ...ready, signedIn: false })).toEqual({ kind: 'sign-in' });
		expect(resolveBookingSubmit(ready)).toEqual({ kind: 'submit' });
	});

	it('record §3.2: a missing name opens its screen, then a missing mobile', () => {
		expect(
			resolveBookingSubmit({ ...ready, patient: { ...bookingPatientSample, firstName: null } })
		).toEqual({ kind: 'open', step: 'details/name' });
		expect(
			resolveBookingSubmit({
				...ready,
				readiness: {
					...bookingReadinessSample,
					phoneVerified: false,
					blockers: ['PATIENT_PHONE_UNVERIFIED']
				}
			})
		).toEqual({ kind: 'open', step: 'details/phone' });
	});

	it('locked: an hour that is gone; a blocker no row answers (with its words); while the facts are on their way', () => {
		expect(resolveBookingSubmit({ ...ready, slotState: 'gone-duration' })).toEqual({
			kind: 'locked',
			reason: 'slot',
			messages: []
		});
		expect(
			resolveBookingSubmit({
				...ready,
				readiness: {
					...bookingReadinessSample,
					blockers: ['DOCTOR_NOT_VERIFIED', 'BOOKING_NOTICE_TOO_SHORT']
				}
			})
		).toEqual({
			kind: 'locked',
			reason: 'blocked',
			messages: ['Αυτός ο επαγγελματίας δεν δέχεται κρατήσεις αυτή τη στιγμή.']
		});
		expect(resolveBookingSubmit({ ...ready, readiness: undefined })).toMatchObject({
			kind: 'locked',
			reason: 'waiting'
		});
		expect(resolveBookingSubmit({ ...ready, slotState: 'waiting' })).toMatchObject({
			reason: 'waiting'
		});
		expect(resolveBookingSubmit({ ...ready, patient: null })).toEqual({
			kind: 'locked',
			reason: 'blocked',
			messages: ['Δεν μπορέσαμε να επιβεβαιώσουμε τον λογαριασμό σας. Δοκιμάστε ξανά.']
		});
	});
});

describe('review w3-w2 R1 (MAJOR-2, MINOR-4 α): the button never locks in silence', () => {
	it('(negative) a blocker with no words of its own (a newer server’s code) still says the refusal', () => {
		expect(
			resolveBookingSubmit({
				...ready,
				readiness: {
					...bookingReadinessSample,
					blockers: ['SOMETHING_NEW' as never, 'RESCHEDULE_INSIDE_CANCELLATION_CUTOFF']
				}
			})
		).toEqual({
			kind: 'locked',
			reason: 'blocked',
			messages: ['Η κράτηση δεν ολοκληρώθηκε. Δοκιμάστε ξανά.']
		});
		// The chosen hour's own blockers are said in the policy row: no second sentence.
		expect(
			resolveBookingSubmit({
				...ready,
				readiness: { ...bookingReadinessSample, blockers: ['BOOKING_NOTICE_TOO_SHORT'] }
			})
		).toEqual({ kind: 'locked', reason: 'blocked', messages: [] });
	});

	it('the application’s `missing-service` / `missing-relative`: no service, or a relative the list no longer names, says so', () => {
		expect(resolveBookingSubmit({ ...ready, serviceId: undefined })).toEqual({
			kind: 'locked',
			reason: 'blocked',
			messages: ['Επιλέξτε υπηρεσία για να συνεχίσετε.']
		});
		expect(
			resolveBookingSubmit({ ...ready, visitor: { kind: 'relative', relativeId: 'rel-gone' } })
		).toEqual({
			kind: 'locked',
			reason: 'blocked',
			messages: ['Δεν μπορέσαμε να επιβεβαιώσουμε τον συγγενή του ραντεβού. Δοκιμάστε ξανά.']
		});
		expect(
			resolveBookingSubmit({ ...ready, visitor: { kind: 'relative', relativeId: 'rel-1' } })
		).toEqual({ kind: 'submit' });
	});
});

describe('the body of the one write', () => {
	const input = {
		doctorId: 'doc-1',
		officeId: 'off-a',
		startTime: '2026-11-08T07:30:00.000Z',
		serviceId: 'svc-simple',
		patient: bookingPatientSample,
		visitor: { kind: 'self' as const },
		note: '  Πονάει το γόνατο  ',
		firstVisit: { asked: false, answer: 'yes' as const }
	};

	it('U-103.2: one service, the slot’s own instant, the note trimmed, no first-visit unless asked', () => {
		expect(buildBookingRequest(input)).toEqual({
			doctorId: 'doc-1',
			officeId: 'off-a',
			patientId: 'pat-1',
			bookedForType: 'SELF',
			relativeId: null,
			startTime: '2026-11-08T07:30:00.000Z',
			patientNote: 'Πονάει το γόνατο',
			services: [{ doctorServiceId: 'svc-simple', quantity: 1 }]
		});
		expect(
			buildBookingRequest({ ...input, firstVisit: { asked: true, answer: 'no' } })
		).toMatchObject({
			firstVisit: false
		});
	});

	it('for a relative the list names; (negative) none for a relative it cannot name, nor without an instant', () => {
		expect(
			buildBookingRequest({ ...input, visitor: { kind: 'relative', relativeId: 'rel-1' } })
		).toMatchObject({ bookedForType: 'RELATIVE', relativeId: 'rel-1' });
		expect(
			buildBookingRequest({ ...input, visitor: { kind: 'relative', relativeId: 'x' } })
		).toBeNull();
		expect(buildBookingRequest({ ...input, startTime: null })).toBeNull();
		expect(buildBookingRequest({ ...input, patient: null })).toBeNull();
	});

	it('🔴 U-65.6 (negative): a note of 10.000 characters is cut to 500', () => {
		const request = buildBookingRequest({ ...input, note: 'α'.repeat(10_000) });
		expect(Array.from(request?.patientNote ?? '')).toHaveLength(500);
	});
});
