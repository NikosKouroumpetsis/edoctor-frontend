import { describe, expect, it } from 'vitest';
import { BOOKING_BLOCKERS, bookingBlockerMessages, readBookingBlocker } from '.';

describe('the blockers in words (the application’s BOOKING_BLOCKERS, app = web)', () => {
	it('every code of the contract has a reading; the slot’s codes send to another hour, the doctor’s to the doctor', () => {
		expect(Object.keys(BOOKING_BLOCKERS)).toHaveLength(26);
		expect(readBookingBlocker('SLOT_ALREADY_ELAPSED', 'el')).toEqual({
			message: 'Αυτή η ώρα δεν είναι πλέον διαθέσιμη.',
			action: 'pick-slot'
		});
		expect(readBookingBlocker('DOCTOR_NOT_VERIFIED', 'en')?.action).toBe('open-doctor');
		expect(readBookingBlocker('PATIENT_NAME_MISSING', 'el')?.action).toBe('complete-name');
		expect(readBookingBlocker('PATIENT_PHONE_UNVERIFIED', 'el')?.action).toBe('complete-phone');
	});

	it('U-103.1: no blocker leads to «Τα ραντεβού μου» on the web (a pending request leads back to the doctor)', () => {
		const actions = Object.values(BOOKING_BLOCKERS).map((entry) => entry.action);
		expect(actions).not.toContain('open-appointments');
		expect(BOOKING_BLOCKERS.PATIENT_PENDING_LIMIT_REACHED.action).toBe('open-doctor');
	});

	it('one sentence for codes that mean one thing, in their order; (negative) an unknown code and the reschedule ones say nothing', () => {
		expect(
			bookingBlockerMessages(
				[
					'OUTSIDE_WEEKLY_SCHEDULE',
					'NOT_A_CODE',
					'SLOT_STEP_MISMATCH',
					'RESCHEDULE_INSIDE_CANCELLATION_CUTOFF',
					'DOCTOR_NOT_VERIFIED'
				],
				'en'
			)
		).toEqual([
			'That time is no longer available.',
			'This professional is not taking bookings right now.'
		]);
		expect(readBookingBlocker('constructor', 'el')).toBeNull();
	});
});
