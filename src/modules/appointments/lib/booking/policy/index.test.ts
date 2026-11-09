import { describe, expect, it } from 'vitest';
import { buildBookingPolicyRow } from '.';

const manual = {
	confirmationMode: 'MANUAL' as const,
	cancellationCutoffHours: 24,
	minBookingNoticeHours: 4
};

describe('«Πολιτική κράτησης» (record §3.2 row 9, app = web)', () => {
	it('a request: who confirms, the expiry, and the two rules on one line', () => {
		expect(buildBookingPolicyRow({ policy: manual, locale: 'el' })).toEqual({
			id: 'policy',
			label: 'Πολιτική κράτησης',
			value: 'Ο γιατρός επιβεβαιώνει το αίτημα',
			lines: [
				{ text: 'Αν ο γιατρός δεν απαντήσει, το αίτημα λήγει αυτόματα.', tone: 'muted' },
				{ text: 'Ακύρωση έως 24 ώρες πριν · Κράτηση τουλάχιστον 4 ώρες πριν', tone: 'muted' }
			],
			action: null
		});
	});

	it('an instant booking: «Άμεση επιβεβαίωση»; one hour is singular; no notice rule when there is none', () => {
		const row = buildBookingPolicyRow({
			policy: { confirmationMode: 'AUTO', cancellationCutoffHours: 1, minBookingNoticeHours: 0 },
			locale: 'en'
		});
		expect(row?.value).toBe('Confirmed immediately');
		expect(row?.lines).toEqual([{ text: 'Cancellation up to 1 hour before', tone: 'muted' }]);
	});

	it('U-91.1: the passed cancellation deadline warns an instant booking only; the chosen hour’s blockers warn', () => {
		const auto = { ...manual, confirmationMode: 'AUTO' as const };
		expect(
			buildBookingPolicyRow({
				policy: auto,
				insideCancellationCutoff: true,
				locale: 'el'
			})?.lines.at(-1)
		).toEqual({
			text: 'Για αυτή την ώρα η προθεσμία ακύρωσης έχει ήδη περάσει: αν την κλείσετε, δεν θα μπορείτε να την ακυρώσετε online.',
			tone: 'warning'
		});
		expect(
			buildBookingPolicyRow({
				policy: manual,
				insideCancellationCutoff: true,
				locale: 'el'
			})?.lines.some((line) => line.tone === 'warning')
		).toBe(false);
		expect(
			buildBookingPolicyRow({
				policy: manual,
				blockers: ['BOOKING_NOTICE_TOO_SHORT', 'DOCTOR_NOT_VERIFIED'],
				locale: 'el'
			})?.lines.at(-1)
		).toEqual({ text: 'Αυτή η ώρα είναι πολύ κοντά για κράτηση.', tone: 'warning' });
	});

	it('the last page says no expiry line; (negative) no rules read, no row', () => {
		expect(
			buildBookingPolicyRow({ policy: manual, readOnly: true, locale: 'el' })?.lines
		).toHaveLength(1);
		expect(buildBookingPolicyRow({ policy: undefined, locale: 'el' })).toBeNull();
	});
});
