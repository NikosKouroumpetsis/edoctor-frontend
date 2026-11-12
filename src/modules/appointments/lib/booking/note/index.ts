import { m } from '$paraglide/messages.js';
import type { ValidatorFn } from '$shared/lib/form';
import { clampTextLength } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { BOOKING_PATIENT_NOTE_MAX_LENGTH } from '$modules/appointments/config';

/**
 * 🔴 U-65.6, D-39, D-W4-36.8: the note cut to the server's limit, counted in UTF-16 code units as its schema counts
 * them (the application's `.slice`), never through an emoji. The field's own `maxlength` stops typing but not every
 * paste, and nothing stops a value restored from the draft, so the limit is applied HERE, where the counter and the body
 * read the same value. The booking (screen 30) and screen 52's «Σημείωση» share it.
 */
export function clampBookingNote(value: string): string {
	return clampTextLength(value, BOOKING_PATIENT_NOTE_MAX_LENGTH);
}

/**
 * The note's rule for a form (`createForm`, review w4-arch-frontend L-2; screen 52's «Σημείωση»): within the server's 500
 * UTF-16 units (`maxLength`). The field cuts at the bound before the form sees more, so the rule has no words.
 */
export const bookingNoteRule: ValidatorFn = (value) =>
	typeof value === 'string' && value.length > BOOKING_PATIENT_NOTE_MAX_LENGTH
		? { maxLength: true }
		: null;

/** What the body carries: trimmed and clamped, or `null` for a blank note (an empty string is a note the doctor sees). */
export function toBookingNotePayload(value: string): string | null {
	return clampBookingNote(value).trim() || null;
}

/** «0/500»: the countdown of the field, in the units the server counts. */
export function bookingNoteCounter(value: string, locale: SupportedLocale): string {
	return m.booking_note_counter(
		{ count: clampBookingNote(value).length, max: BOOKING_PATIENT_NOTE_MAX_LENGTH },
		{ locale }
	);
}
