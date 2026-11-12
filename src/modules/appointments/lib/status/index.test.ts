import { describe, expect, it } from 'vitest';
import type { AppointmentStatus } from '$modules/appointments/api/appointment';
import {
	APPOINTMENT_PATIENT_STATUS_TONES,
	appointmentStatusPill,
	canAmendAppointment,
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
