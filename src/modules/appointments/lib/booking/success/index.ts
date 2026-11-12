import { m } from '$paraglide/messages.js';
import { readZonedParts, zonedDay } from '$shared/lib/format';
import { withDoctorTitle } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { AppointmentFacts } from '$modules/appointments/api/appointment';
import { appointmentDeadlineLabel } from '$modules/appointments/lib/when';
import type { BookingSlotChoice } from '../types';

export type BookingSuccessContent = {
	title: string;
	body: string;
	nextTitle: string;
	next: string[];
	confirmed: boolean;
};

/**
 * Screen 31 (record §4, U-105): «Η κράτησή σας καταχωρήθηκε» for a request, «Το ραντεβού επιβεβαιώθηκε» for an instant
 * booking, each claimed only for its OWN status; anything else is the neutral «Η κράτηση καταχωρήθηκε» with «Δείτε την
 * κατάστασή της στα ραντεβού σας.» (D-W4-54). «και SMS» only when the server says one leaves (U-103.3 / D-09); the
 * deadline of an open request on the office's clock (D-49).
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
	const nextTitle = m.booking_success_next_title({}, options);
	if (appointment?.status === 'pending') {
		// «Παρασκευή 6 Νοεμβρίου, 19:00» on the OFFICE's clock: the deadlines' one phrase (wave 4.0, `lib/when`).
		const expiry = appointment.expiresAt
			? appointmentDeadlineLabel(appointment.expiresAt, locale, appointment.officeTimeZone) || null
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
			confirmed: true
		};
	}
	// 🔴 D-W4-54 (wave 4.0, P-W4 Σ-18, in place of D-W3-29): the web has «Τα ραντεβού μου» now, so the neutral title says
	// where to look, as the application does.
	return {
		title: m.booking_success_unknown_title({}, options),
		body: m.booking_success_unknown_body({}, options),
		nextTitle,
		next: [],
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
