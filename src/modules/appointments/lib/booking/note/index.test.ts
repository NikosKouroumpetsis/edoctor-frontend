import { describe, expect, it } from 'vitest';
import { bookingNoteCounter, bookingNoteRule, clampBookingNote, toBookingNotePayload } from '.';

describe('the note for the doctor (D-39, U-65.6, D-W4-36.8)', () => {
	it('keeps a note within 500 as it is, and counts it', () => {
		expect(clampBookingNote('Πονάει το γόνατο')).toBe('Πονάει το γόνατο');
		expect(bookingNoteCounter('', 'el')).toBe('0/500');
		expect(bookingNoteCounter('αβγ', 'en')).toBe('3/500');
	});

	// Rewrites the D-39 «an emoji counts as one» by D-W4-36.8 (the task doc: «και στη σημείωση της κράτησης»).
	it('🔴 D-W4-36.8 (negative): 10.000 characters are cut to 500; an emoji counts as two UTF-16 units, as the server counts it, and is never split in half', () => {
		expect(clampBookingNote('α'.repeat(10_000))).toHaveLength(500);
		const emoji = '😀'.repeat(501);
		expect(clampBookingNote(emoji)).toBe('😀'.repeat(250));
		expect(bookingNoteCounter(emoji, 'el')).toBe('500/500');
		const odd = clampBookingNote(`α${'😀'.repeat(300)}`);
		expect(odd).toHaveLength(499);
		expect(odd.endsWith('😀')).toBe(true);
	});

	it('a blank note travels as `null`; markup stays text (the page draws it as a text node)', () => {
		expect(toBookingNotePayload('   ')).toBeNull();
		expect(toBookingNotePayload(' <img src=x onerror=alert(1)> ')).toBe(
			'<img src=x onerror=alert(1)>'
		);
	});
});

describe('the note’s rule for a form (`createForm`, review w4-arch-frontend L-2)', () => {
	it('🔴 D-W4-36.8 (negative): 500 UTF-16 units pass, 501 do not, 251 emoji (502 units) do not; what the field keeps (`clampBookingNote`) always passes; an empty note passes (it removes the note)', () => {
		expect(bookingNoteRule('')).toBeNull();
		expect(bookingNoteRule('α'.repeat(500))).toBeNull();
		expect(bookingNoteRule('α'.repeat(501))).toEqual({ maxLength: true });
		expect(bookingNoteRule('😀'.repeat(251))).toEqual({ maxLength: true });
		expect(bookingNoteRule(clampBookingNote('😀'.repeat(251)))).toBeNull();
		expect(bookingNoteRule(clampBookingNote('α'.repeat(10_000)))).toBeNull();
	});
});
