import { describe, expect, it } from 'vitest';
import { bookingNoteCounter, clampBookingNote, toBookingNotePayload } from '.';

describe('the note for the doctor (D-39, U-65.6)', () => {
	it('keeps a note within 500 code points as it is, and counts it', () => {
		expect(clampBookingNote('Πονάει το γόνατο')).toBe('Πονάει το γόνατο');
		expect(bookingNoteCounter('', 'el')).toBe('0/500');
		expect(bookingNoteCounter('αβγ', 'en')).toBe('3/500');
	});

	it('🔴 U-65.6 (negative): 10.000 characters are cut to 500; an emoji counts as one, never split in half', () => {
		expect(Array.from(clampBookingNote('α'.repeat(10_000)))).toHaveLength(500);
		const emoji = '😀'.repeat(501);
		const clamped = clampBookingNote(emoji);
		expect(Array.from(clamped)).toHaveLength(500);
		expect(clamped.endsWith('😀')).toBe(true);
	});

	it('a blank note travels as `null`; markup stays text (the page draws it as a text node)', () => {
		expect(toBookingNotePayload('   ')).toBeNull();
		expect(toBookingNotePayload(' <img src=x onerror=alert(1)> ')).toBe(
			'<img src=x onerror=alert(1)>'
		);
	});
});
