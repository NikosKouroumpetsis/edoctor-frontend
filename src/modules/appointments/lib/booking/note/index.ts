import { m } from '$paraglide/messages.js';
import { countCodePoints } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { BOOKING_PATIENT_NOTE_MAX_LENGTH } from '$modules/appointments/config';

/**
 * 🔴 U-65.6, D-39: the note cut to the server's limit, counted in code points as its schema counts them. The field's own
 * `maxlength` stops typing but not every paste, and nothing stops a value restored from the draft, so the limit is
 * applied HERE, where the counter and the body read the same value.
 */
export function clampBookingNote(value: string): string {
	return countCodePoints(value) <= BOOKING_PATIENT_NOTE_MAX_LENGTH
		? value
		: Array.from(value).slice(0, BOOKING_PATIENT_NOTE_MAX_LENGTH).join('');
}

/** What the body carries: trimmed and clamped, or `null` for a blank note (an empty string is a note the doctor sees). */
export function toBookingNotePayload(value: string): string | null {
	return clampBookingNote(value).trim() || null;
}

/** «0/500»: the countdown of the field. */
export function bookingNoteCounter(value: string, locale: SupportedLocale): string {
	return m.booking_note_counter(
		{ count: countCodePoints(clampBookingNote(value)), max: BOOKING_PATIENT_NOTE_MAX_LENGTH },
		{ locale }
	);
}
