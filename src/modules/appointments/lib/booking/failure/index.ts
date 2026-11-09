import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { AppointmentFailureFacts } from '$modules/appointments/api/appointment';
import { readBookingBlocker } from '../blockers';
import type { BookingFailureAction, BookingFailureNotice } from '../types';

/**
 * Which way out wins when a refusal names several (the application's `ACTION_PRIORITY`): the terminal one first — if the
 * doctor takes no booking, nothing else changes the answer — then what the reader fixes here, then the hour.
 */
const ACTION_PRIORITY: BookingFailureAction[] = [
	'open-doctor',
	'complete-name',
	'complete-phone',
	'pick-slot',
	'retry'
];

/**
 * 🔴 THE reading of a refused booking (the application's `buildBookingFailureNotice`): the blockers first, wherever they
 * came from; then the taken hour; then a refused field (the note's message goes UNDER the note); a session that ended
 * signs in again; anything nobody decided stays «try again», because the press itself is the retry.
 */
export function buildBookingFailureNotice(
	facts: AppointmentFailureFacts,
	locale: SupportedLocale
): BookingFailureNotice {
	const options = { locale };
	const readings = facts.blockers
		.map((code) => readBookingBlocker(code, locale))
		.filter((reading) => reading !== null);
	if (readings.length > 0) {
		const action =
			ACTION_PRIORITY.find((candidate) =>
				readings.some((reading) => reading.action === candidate)
			) ?? 'retry';
		const messages = [...new Set(readings.map((reading) => reading.message).filter(Boolean))];
		return {
			action,
			message: messages.length > 0 ? messages.join(' ') : m.booking_submit_error({}, options),
			noteError: null
		};
	}
	if (facts.kind === 'session') return { action: 'sign-in', message: null, noteError: null };
	if (facts.kind === 'slot-unavailable') {
		return {
			action: 'pick-slot',
			message: m.booking_blocker_slot_unavailable({}, options),
			noteError: null
		};
	}
	if (facts.kind === 'invalid') {
		if (facts.fields.includes('patientNote')) {
			return {
				action: 'fix-note',
				message: null,
				noteError: m.booking_submit_invalid_note({}, options)
			};
		}
		const field = facts.fields[0];
		const fieldWords = {
			bookedForType: m.booking_field_for_whom,
			relativeId: m.booking_field_for_whom,
			doctorId: m.booking_field_identity,
			officeId: m.booking_field_identity,
			patientId: m.booking_field_identity,
			patientNote: m.booking_field_note,
			services: m.booking_field_service,
			startTime: m.booking_field_time,
			// NIT-4 of R1: the application calls it «τα στοιχεία της κράτησης».
			firstVisit: m.booking_field_identity
		} as const;
		return {
			action: 'retry',
			message: field
				? m.booking_submit_invalid_field({ field: fieldWords[field]({}, options) }, options)
				: m.booking_submit_error({}, options),
			noteError: null
		};
	}
	return { action: 'retry', message: m.booking_submit_error({}, options), noteError: null };
}

/**
 * The words of a refusal's way out (the application's `ACTION_LABEL_KEYS`, review w3-w2 R1 MINOR-3): another hour, or
 * the doctor's page; `null` where the way out is the main button itself (a retry) or a row of the card.
 */
export function bookingFailureActionLabel(
	action: BookingFailureAction,
	locale: SupportedLocale
): string | null {
	if (action === 'pick-slot') return m.booking_cta_pick_another_time({}, { locale });
	if (action === 'open-doctor') return m.booking_cta_doctor({}, { locale });
	return null;
}
