import { describe, expect, it } from 'vitest';
import type { AppointmentStatus } from '$shared/lib/api-client';
import {
	APPOINTMENT_PATIENT_STATUS_TONES,
	appointmentStatusPill,
	canAmendAppointment,
	doctorAppointmentStatusPill,
	isClosedAppointment
} from '.';

const ALL: AppointmentStatus[] = [
	'pending',
	'booked',
	'checked_in',
	'completed',
	'canceled',
	'rejected',
	'expired',
	'no_show',
	'unavailable'
];

describe('the patient’s status pill (record §6.1, D-W4-15, app = web)', () => {
	it('waiting warm, kept green, every other state neutral — the application’s words', () => {
		expect(appointmentStatusPill('pending', 'el')).toEqual({
			label: 'Σε αναμονή',
			tone: 'warning'
		});
		expect(appointmentStatusPill('booked', 'el')).toEqual({
			label: 'Επιβεβαιωμένο',
			tone: 'success'
		});
		expect(appointmentStatusPill('checked_in', 'el')).toEqual({
			label: 'Στο ιατρείο',
			tone: 'muted'
		});
		expect(appointmentStatusPill('no_show', 'el')).toEqual({
			label: 'Δεν προσήλθατε',
			tone: 'muted'
		});
		expect(ALL.filter((status) => APPOINTMENT_PATIENT_STATUS_TONES[status] === 'muted')).toEqual([
			'checked_in',
			'completed',
			'canceled',
			'rejected',
			'expired',
			'no_show',
			'unavailable'
		]);
		for (const status of ALL) expect(appointmentStatusPill(status, 'en').label).not.toBe(status);
	});

	it('🔴 the server’s rule of the visitor and the note: only `pending` and `booked` (D-W4-01: no flag on the wire)', () => {
		expect(ALL.filter(canAmendAppointment)).toEqual(['pending', 'booked']);
		expect(ALL.filter(isClosedAppointment)).toEqual([
			'completed',
			'canceled',
			'rejected',
			'expired',
			'no_show',
			'unavailable'
		]);
	});
});

describe('wave 5.1 · the doctor’s status pill (screen 66, D-W51-27: the client’s words, the doctor’s where they differ)', () => {
	it('«Αίτημα», «Επιβεβαιωμένο», «Ολοκληρώθηκε», «Δεν ήρθε» — the patient’s tones', () => {
		expect(doctorAppointmentStatusPill('pending', null, 'el')).toEqual({
			label: 'Αίτημα',
			tone: 'warning'
		});
		expect(doctorAppointmentStatusPill('booked', null, 'el')).toEqual({
			label: 'Επιβεβαιωμένο',
			tone: 'success'
		});
		expect(doctorAppointmentStatusPill('completed', null, 'el')).toEqual({
			label: 'Ολοκληρώθηκε',
			tone: 'muted'
		});
		expect(doctorAppointmentStatusPill('no_show', null, 'el')).toEqual({
			label: 'Δεν ήρθε',
			tone: 'muted'
		});
		for (const status of ALL) {
			expect(doctorAppointmentStatusPill(status, null, 'el').tone).toBe(
				APPOINTMENT_PATIENT_STATUS_TONES[status]
			);
			expect(doctorAppointmentStatusPill(status, null, 'en').label).not.toBe(status);
		}
	});

	it('a cancellation says who: «από τον ασθενή», «από εσάς»; the support’s, the system’s or none the bare word', () => {
		expect(doctorAppointmentStatusPill('canceled', 'PATIENT', 'el').label).toBe(
			'Ακυρώθηκε από τον ασθενή'
		);
		expect(doctorAppointmentStatusPill('canceled', 'DOCTOR', 'el').label).toBe(
			'Ακυρώθηκε από εσάς'
		);
		expect(doctorAppointmentStatusPill('canceled', 'BACKOFFICE', 'el').label).toBe('Ακυρώθηκε');
		expect(doctorAppointmentStatusPill('canceled', null, 'el').label).toBe('Ακυρώθηκε');
		// Who canceled matters only for a cancellation.
		expect(doctorAppointmentStatusPill('completed', 'PATIENT', 'el').label).toBe('Ολοκληρώθηκε');
	});

	it('🔴 D-W51-29: ποιος ακύρωσε / απέρριψε — «Απορρίφθηκε από εσάς» for the doctor’s refusal, the bare word for anyone else’s; «Έληξε χωρίς απάντηση»', () => {
		expect(doctorAppointmentStatusPill('rejected', 'DOCTOR', 'el')).toEqual({
			label: 'Απορρίφθηκε από εσάς',
			tone: 'muted'
		});
		for (const side of ['PATIENT', 'BACKOFFICE', 'SYSTEM', null] as const) {
			expect(doctorAppointmentStatusPill('rejected', side, 'el').label, String(side)).toBe(
				'Απορρίφθηκε'
			);
		}
		expect(doctorAppointmentStatusPill('expired', null, 'el')).toEqual({
			label: 'Έληξε χωρίς απάντηση',
			tone: 'muted'
		});
		expect(doctorAppointmentStatusPill('expired', 'DOCTOR', 'el').label).toBe(
			'Έληξε χωρίς απάντηση'
		);
		expect(doctorAppointmentStatusPill('rejected', 'DOCTOR', 'en').label).toBe('Declined by you');
		expect(doctorAppointmentStatusPill('expired', null, 'en').label).toBe('Expired unanswered');
		// The patient keeps their own words (screen 50).
		expect(appointmentStatusPill('expired', 'el').label).toBe('Έληξε');
		expect(appointmentStatusPill('rejected', 'el').label).toBe('Απορρίφθηκε');
	});
});
