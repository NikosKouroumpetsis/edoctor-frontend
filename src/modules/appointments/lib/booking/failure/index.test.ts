import { describe, expect, it } from 'vitest';
import { buildBookingFailureNotice } from '.';

const facts = (overrides: Partial<Parameters<typeof buildBookingFailureNotice>[0]>) => ({
	kind: 'unknown' as const,
	status: 422,
	blockers: [],
	fields: [],
	...overrides
});

describe('a refused booking in words (the application’s buildBookingFailureNotice, app = web)', () => {
	it('the blockers lead, the terminal way out first, each sentence once', () => {
		expect(
			buildBookingFailureNotice(
				facts({ kind: 'blocked', blockers: ['SLOT_ALREADY_ELAPSED', 'DOCTOR_NOT_VERIFIED'] }),
				'el'
			)
		).toEqual({
			action: 'open-doctor',
			message:
				'Αυτή η ώρα δεν είναι πλέον διαθέσιμη. Αυτός ο επαγγελματίας δεν δέχεται κρατήσεις αυτή τη στιγμή.',
			noteError: null
		});
		expect(
			buildBookingFailureNotice(
				facts({ kind: 'blocked', blockers: ['PATIENT_PHONE_UNVERIFIED'] }),
				'el'
			).action
		).toBe('complete-phone');
	});

	it('the taken hour; the note’s refusal under the note; another field named; the session signs in again', () => {
		expect(
			buildBookingFailureNotice(facts({ kind: 'slot-unavailable', status: 409 }), 'en')
		).toEqual({
			action: 'pick-slot',
			message: 'That time is no longer available.',
			noteError: null
		});
		expect(
			buildBookingFailureNotice(
				facts({ kind: 'invalid', fields: ['startTime', 'patientNote'] }),
				'el'
			)
		).toEqual({
			action: 'fix-note',
			message: null,
			noteError: 'Η σημείωση είναι πολύ μεγάλη. Συντομεύστε την και δοκιμάστε ξανά.'
		});
		expect(
			buildBookingFailureNotice(facts({ kind: 'invalid', fields: ['startTime'] }), 'el').message
		).toBe('Ελέγξτε την ώρα και δοκιμάστε ξανά.');
		expect(buildBookingFailureNotice(facts({ kind: 'session', status: 401 }), 'el').action).toBe(
			'sign-in'
		);
	});

	it('(negative) nobody decided, or a code with no words: «try again»', () => {
		expect(buildBookingFailureNotice(facts({}), 'el')).toEqual({
			action: 'retry',
			message: 'Η κράτηση δεν ολοκληρώθηκε. Δοκιμάστε ξανά.',
			noteError: null
		});
		expect(
			buildBookingFailureNotice(
				facts({ kind: 'blocked', blockers: ['RESCHEDULE_INSIDE_CANCELLATION_CUTOFF'] }),
				'el'
			).message
		).toBe('Η κράτηση δεν ολοκληρώθηκε. Δοκιμάστε ξανά.');
	});
});
