import { m } from '$paraglide/messages.js';
import { readZonedParts, zonedDay } from '$shared/lib/format';
import { withDoctorTitle } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { AppointmentFacts } from '$modules/appointments/api/appointment';
import type { BookingSlotChoice } from '../types';

export type BookingSuccessContent = {
	title: string;
	/** `null` for the neutral title (D-W3-29: the web has no «ραντεβού σας» to send anyone to). */
	body: string | null;
	nextTitle: string;
	next: string[];
	/** U-103.1: the web's «Για αλλαγή ή ακύρωση…» with the office's phone; `null` without one. */
	manage: string | null;
	confirmed: boolean;
};

/** «Παρασκευή 6 Νοεμβρίου, 19:00» on the OFFICE's clock, or `null` for anything that is not an instant. */
function expiryLabel(instant: string, locale: SupportedLocale, timeZone: string): string | null {
	const parsed = new Date(instant);
	if (Number.isNaN(parsed.getTime())) return null;
	const day = parsed.toLocaleDateString(locale, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone
	});
	const time = parsed.toLocaleTimeString(locale, {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone
	});
	return `${day}, ${time}`;
}

/**
 * Screen 31 (record §4, U-105): «Η κράτησή σας καταχωρήθηκε» for a request, «Το ραντεβού επιβεβαιώθηκε» for an instant
 * booking, each claimed only for its OWN status; anything else is the neutral «Η κράτηση καταχωρήθηκε», alone. «και SMS» only
 * when the server says one leaves (U-103.3 / D-09); the deadline of an open request on the office's clock (D-49).
 */
export function buildBookingSuccess({
	appointment,
	doctorName,
	smsExpected,
	locale
}: {
	appointment: AppointmentFacts | null | undefined;
	doctorName: string;
	smsExpected: boolean | null;
	locale: SupportedLocale;
}): BookingSuccessContent {
	const options = { locale };
	const doctor = withDoctorTitle(doctorName) || doctorName;
	const manage = appointment?.officePhone
		? m.booking_success_web_manage({ phone: appointment.officePhone }, options)
		: null;
	const nextTitle = m.booking_success_next_title({}, options);
	if (appointment?.status === 'pending') {
		const expiry = appointment.expiresAt
			? expiryLabel(appointment.expiresAt, locale, appointment.officeTimeZone)
			: null;
		return {
			title: m.booking_success_registered_title({}, options),
			body: m.booking_success_registered_body({ doctor }, options),
			nextTitle,
			next: [
				smsExpected
					? m.booking_success_next_reply_sms({}, options)
					: m.booking_success_next_reply({}, options),
				m.booking_success_calendar_email_if_confirmed({}, options),
				...(expiry ? [m.booking_success_next_expiry({ dateTime: expiry }, options)] : [])
			],
			manage,
			confirmed: false
		};
	}
	if (appointment?.status === 'booked') {
		return {
			title: m.booking_success_booked_title({}, options),
			body: m.booking_success_booked_body_named({ doctor }, options),
			nextTitle,
			next: [
				smsExpected
					? m.booking_success_calendar_email_sms({}, options)
					: m.booking_success_calendar_email({}, options)
			],
			manage,
			confirmed: true
		};
	}
	// 🔴 D-W3-29 (review w3-w2 R1 NIT-3): with no state the web says the title alone — «Δείτε την κατάστασή της στα ραντεβού
	// σας» would send the reader to a list the web does not have (U-103.1); the application keeps it.
	return {
		title: m.booking_success_unknown_title({}, options),
		body: null,
		nextTitle,
		next: [],
		manage: null,
		confirmed: false
	};
}

/**
 * Screen 31's hour on the card (record §4: «η ίδια κάρτα με την 30»): the appointment's instant as its office's day and
 * minute, on the OFFICE's clock (D-49) — the same shape the 30 chose it in. `null` for anything that is not an instant.
 */
export function bookingSlotOfAppointment(
	appointment: Pick<AppointmentFacts, 'officeId' | 'startTime' | 'officeTimeZone'>
): BookingSlotChoice | null {
	const instant = Date.parse(appointment.startTime);
	if (Number.isNaN(instant)) return null;
	const { hour, minute } = readZonedParts(instant, appointment.officeTimeZone);
	return {
		officeId: appointment.officeId,
		date: zonedDay(instant, appointment.officeTimeZone),
		startMinute: hour * 60 + minute
	};
}
