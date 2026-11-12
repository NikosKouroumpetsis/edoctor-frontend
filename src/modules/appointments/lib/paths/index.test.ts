import { describe, expect, it } from 'vitest';
import {
	APPOINTMENTS_HISTORY_SEARCH,
	appointmentPath,
	appointmentsPath,
	appointmentStepPath,
	ratingPath,
	readAppointmentsAddress
} from '.';

const ID = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';

describe('lib/paths · the addresses of the patient’s pages (D-W4-20)', () => {
	it('the email’s two links and what an appointment opens, read back by the same closed list', () => {
		expect(appointmentsPath).toBe('/appointments');
		expect(appointmentPath(ID)).toBe(`/appointments/${ID}`);
		expect(appointmentStepPath(ID, 'cancel')).toBe(`/appointments/${ID}/cancel`);
		expect(ratingPath(ID)).toBe(`/ratings/${ID}`);
		expect(
			readAppointmentsAddress(
				appointmentStepPath(ID, 'time').slice('/appointments/'.length),
				new URLSearchParams()
			)
		).toEqual({ view: 'appointment', appointmentId: ID, step: 'time' });
		expect(readAppointmentsAddress('', new URLSearchParams(APPOINTMENTS_HISTORY_SEARCH))).toEqual({
			view: 'list',
			tab: 'history'
		});
	});

	it('🔴 U-65.6 (negative): an id is path-encoded, so no id can add a step or leave the page', () => {
		expect(appointmentPath('../x/cancel')).toBe('/appointments/..%2Fx%2Fcancel');
		expect(ratingPath('a/b?c')).toBe('/ratings/a%2Fb%3Fc');
	});
});
