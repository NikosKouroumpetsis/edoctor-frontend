import { describe, expect, it } from 'vitest';
import {
	bookingPhoneFailureMessage,
	bookingProfileFailureMessage,
	bookingResendDeadline,
	bookingResendSecondsLeft,
	bookingResendWaitLabel,
	cleanBookingName,
	maskBookingMobile,
	toBookingProfilePatch
} from '.';

describe('the person’s missing facts (record §3.3, app = web)', () => {
	it('both halves of the name travel together, trimmed; the date of birth as that day’s instant', () => {
		expect(toBookingProfilePatch({ firstName: ' Ελένη ', lastName: 'Παππά' })).toEqual({
			firstName: 'Ελένη',
			lastName: 'Παππά'
		});
		expect(toBookingProfilePatch({ birthDate: '1988-03-12' })).toEqual({
			dateOfBirth: '1988-03-12T00:00:00.000Z'
		});
	});

	it('🔴 U-65.6 (negative): half a name, a NUL, 10.000 characters, a bad day — nothing that the server would refuse', () => {
		expect(toBookingProfilePatch({ firstName: 'Ελένη', lastName: '   ' })).toBeNull();
		expect(cleanBookingName('Ελ\u0000ένη')).toBe('Ελένη');
		expect(Array.from(cleanBookingName('α'.repeat(10_000)) ?? '')).toHaveLength(100);
		expect(toBookingProfilePatch({ birthDate: '12/03/1988' })).toBeNull();
		expect(cleanBookingName('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>');
	});

	it('the challenge’s refusals in words; the session says nothing (it signs in again)', () => {
		expect(bookingPhoneFailureMessage('number-taken', 'el')).toBe(
			'Αυτό το κινητό χρησιμοποιείται ήδη σε άλλον λογαριασμό.'
		);
		expect(bookingPhoneFailureMessage('invalid-code', 'en')).toBe(
			'That code is not right. Check it and try again.'
		);
		expect(bookingPhoneFailureMessage('session', 'el')).toBeNull();
		expect(bookingPhoneFailureMessage('unknown', 'el')).toBe('Κάτι πήγε στραβά. Δοκιμάστε ξανά.');
		expect(bookingResendWaitLabel(1, 'el')).toBe('Περιμένετε 1 δευτερόλεπτο για νέο κωδικό.');
		expect(bookingResendWaitLabel(30, 'el')).toBe('Περιμένετε 30 δευτερόλεπτα για νέο κωδικό.');
	});

	it('🔴 D-47 / U-65.6: after the send only the MASK stays — the country, the first two digits, the last three', () => {
		expect(maskBookingMobile('+30', '69 1234 5678')).toBe('+30 69•• ••• 678');
		expect(maskBookingMobile('+357', '099123456')).toBe('+357 99•• ••• 456');
		// (negative) a number too short to mask names nothing of it
		expect(maskBookingMobile('+30', '691')).toBe('+30 •••');
		expect(maskBookingMobile('+30', '6912345678')).not.toMatch(/2345/u);
	});

	it('«Αποστολή νέου κωδικού» 60″ apart: whole seconds left, 0 once passed or never started', () => {
		const deadline = bookingResendDeadline(1_000_000);
		expect(deadline).toBe(1_060_000);
		expect(bookingResendSecondsLeft(deadline, 1_000_000)).toBe(60);
		expect(bookingResendSecondsLeft(deadline, 1_059_001)).toBe(1);
		expect(bookingResendSecondsLeft(deadline, 1_060_000)).toBe(0);
		expect(bookingResendSecondsLeft(null, 5)).toBe(0);
	});

	it('the profile write’s refusals in words: the date of birth its own, the session none', () => {
		expect(bookingProfileFailureMessage('birth-date', 'el')).toBe(
			'Μη έγκυρη ημερομηνία γέννησης. Επιλέξτε ημερομηνία έως σήμερα και όχι παλαιότερη από 120 χρόνια.'
		);
		expect(bookingProfileFailureMessage('session', 'el')).toBeNull();
		expect(bookingProfileFailureMessage('invalid', 'en')).toBe('Something went wrong. Try again.');
	});
});
