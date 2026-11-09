import { describe, expect, it } from 'vitest';
import type { AppointmentFacts } from '$modules/appointments/api/appointment';
import { bookingSlotOfAppointment, buildBookingSuccess } from '.';

const pending: AppointmentFacts = {
	id: 'a-1',
	doctorId: 'doc-1',
	officeId: 'off-a',
	officeTimeZone: 'Europe/Athens',
	status: 'pending',
	confirmationMode: 'MANUAL',
	startTime: '2026-11-09T07:30:00.000Z',
	expiresAt: '2026-11-06T17:00:00.000Z',
	officePhone: '210 123 4567',
	patientNote: null,
	relativeId: null,
	serviceIds: ['svc-simple'],
	snapshot: { visitor: { kind: 'self', name: null }, service: null, totalAmount: null }
};
const base = { doctorName: 'Μαρία Τριανταφύλλου', smsExpected: false, locale: 'el' as const };

describe('screen 31 (record §4, U-105)', () => {
	it('U-105: a request — its title, the doctor, the next steps with the deadline on the office’s clock', () => {
		expect(buildBookingSuccess({ ...base, appointment: pending })).toEqual({
			title: 'Η κράτησή σας καταχωρήθηκε',
			body: 'Περιμένει την επιβεβαίωση από Dr. Μαρία Τριανταφύλλου.',
			nextTitle: 'Τι ακολουθεί',
			next: [
				'Μόλις απαντήσει ο γιατρός, θα σας ενημερώσουμε με email.',
				'Αν ο γιατρός επιβεβαιώσει, θα λάβετε email με το ραντεβού για το ημερολόγιό σας.',
				'Αν ο γιατρός δεν απαντήσει έως Παρασκευή 6 Νοεμβρίου, 19:00, το αίτημα λήγει αυτόματα.'
			],
			manage:
				'Για αλλαγή ή ακύρωση, ανοίξτε την εφαρμογή eDoctor ή καλέστε το ιατρείο στο 210 123 4567.',
			confirmed: false
		});
	});

	it('U-103.3 / D-09: «και SMS» only when the server says one leaves', () => {
		expect(buildBookingSuccess({ ...base, smsExpected: true, appointment: pending }).next[0]).toBe(
			'Μόλις απαντήσει ο γιατρός, θα σας ενημερώσουμε με email και SMS.'
		);
		expect(buildBookingSuccess({ ...base, smsExpected: null, appointment: pending }).next[0]).toBe(
			'Μόλις απαντήσει ο γιατρός, θα σας ενημερώσουμε με email.'
		);
	});

	it('an instant booking is confirmed; (negative) any other state claims neither', () => {
		const booked = buildBookingSuccess({ ...base, appointment: { ...pending, status: 'booked' } });
		expect(booked).toMatchObject({
			title: 'Το ραντεβού επιβεβαιώθηκε',
			body: 'Σας περιμένει Dr. Μαρία Τριανταφύλλου την ώρα που επιλέξατε.',
			next: ['Θα λάβετε email με το ραντεβού για το ημερολόγιό σας.'],
			confirmed: true
		});
		expect(buildBookingSuccess({ ...base, appointment: null })).toMatchObject({
			title: 'Η κράτηση καταχωρήθηκε',
			manage: null,
			confirmed: false
		});
		// 🔴 D-W3-29: no state ⇒ the title alone — never «…στα ραντεβού σας» (U-103.1), on any state the web cannot claim.
		for (const appointment of [null, { ...pending, status: 'rejected' as const }]) {
			const neutral = buildBookingSuccess({ ...base, appointment });
			expect(neutral).toMatchObject({ body: null, next: [], manage: null });
			expect(JSON.stringify(neutral)).not.toMatch(/ραντεβού σας/u);
		}
		expect(
			buildBookingSuccess({ ...base, appointment: { ...pending, expiresAt: 'soon' } }).next
		).toHaveLength(2);
	});

	it('record §4: the card’s hour is the appointment’s instant on the OFFICE’s clock; (negative) a non-instant is none', () => {
		expect(bookingSlotOfAppointment(pending)).toEqual({
			officeId: 'off-a',
			date: '2026-11-09',
			startMinute: 570
		});
		expect(bookingSlotOfAppointment({ ...pending, startTime: '2026-11-08T22:30:00.000Z' })).toEqual(
			{ officeId: 'off-a', date: '2026-11-09', startMinute: 30 }
		);
		expect(bookingSlotOfAppointment({ ...pending, startTime: 'later' })).toBeNull();
	});
});
