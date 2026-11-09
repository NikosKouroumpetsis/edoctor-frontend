import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { BookingProfileFailure, BookingProfilePatch } from '$modules/appointments/api/patient';
import type { BookingPhoneFailure } from '$modules/appointments/api/phone';
import {
	BOOKING_NAME_MAX_LENGTH,
	BOOKING_PHONE_RESEND_SECONDS
} from '$modules/appointments/config';

const BIRTH_DATE = /^\d{4}-\d{2}-\d{2}$/u;

/** U-65.6: a name part as the server takes it — trimmed, no NUL, at most 100 — or `null` for a blank one. */
export function cleanBookingName(value: string): string | null {
	const clean = Array.from(value.replaceAll('\u0000', '').trim())
		.slice(0, BOOKING_NAME_MAX_LENGTH)
		.join('')
		.trim();
	return clean || null;
}

/**
 * The body of the profile write (the application's `toBookingDetailsPatch`), carrying ONLY what was asked and answered:
 * both halves of the name together (the server refuses half a name), the date of birth as the instant of that day.
 * `null` when there is nothing to send.
 */
export function toBookingProfilePatch(values: {
	firstName?: string;
	lastName?: string;
	birthDate?: string;
}): BookingProfilePatch | null {
	const patch: BookingProfilePatch = {};
	if (values.firstName !== undefined || values.lastName !== undefined) {
		const firstName = cleanBookingName(values.firstName ?? '');
		const lastName = cleanBookingName(values.lastName ?? '');
		if (!firstName || !lastName) return null;
		patch.firstName = firstName;
		patch.lastName = lastName;
	}
	if (values.birthDate && BIRTH_DATE.test(values.birthDate)) {
		patch.dateOfBirth = `${values.birthDate}T00:00:00.000Z`;
	}
	return Object.keys(patch).length > 0 ? patch : null;
}

/** The sentence of a refused step of the phone challenge (record §3.3); `null` for the session (it signs in again). */
export function bookingPhoneFailureMessage(
	failure: BookingPhoneFailure,
	locale: SupportedLocale
): string | null {
	const options = { locale };
	switch (failure) {
		case 'number-taken':
			return m.booking_details_errors_number_taken({}, options);
		case 'invalid-code':
			return m.booking_details_errors_invalid_code({}, options);
		case 'stale-code':
			return m.booking_details_errors_stale_code({}, options);
		case 'locked':
			return m.booking_details_errors_locked({}, options);
		case 'rate-limited':
			return m.booking_details_errors_rate_limited({}, options);
		case 'session':
			return null;
		default:
			return m.booking_details_errors_unknown({}, options);
	}
}

/** «Περιμένετε 1 δευτερόλεπτο / 30 δευτερόλεπτα…»: what is left of the resend's wait, singular only for one. */
export function bookingResendWaitLabel(seconds: number, locale: SupportedLocale): string {
	return seconds === 1
		? m.booking_details_code_resend_wait_one({ seconds }, { locale })
		: m.booking_details_code_resend_wait_other({ seconds }, { locale });
}

/**
 * «+30 69•• ••• 412»: the number a code went to, the way the server masks the account's own (`loginPhoneMasked`) —
 * the country, the first two digits, the last three. 🔴 D-47 / U-65.6: only this ever stays on the page after the send.
 */
export function maskBookingMobile(dialCode: string, typed: string): string {
	const digits = typed.replace(/\D/gu, '').replace(/^0+/u, '');
	if (digits.length < 6) return `${dialCode} •••`;
	return `${dialCode} ${digits.slice(0, 2)}•• ••• ${digits.slice(-3)}`;
}

/** The words of a refused write of the person's name or date of birth; `null` for the session (it signs in again). */
export function bookingProfileFailureMessage(
	failure: BookingProfileFailure,
	locale: SupportedLocale
): string | null {
	const options = { locale };
	if (failure === 'session') return null;
	if (failure === 'birth-date') return m.booking_details_errors_birth_date_invalid({}, options);
	return m.booking_details_errors_unknown({}, options);
}

/** When the next «Αποστολή νέου κωδικού» may go: 60 seconds after a send (the sign-in's cooldown). */
export function bookingResendDeadline(now: number): number {
	return now + BOOKING_PHONE_RESEND_SECONDS * 1000;
}

/** Whole seconds left before that deadline (0 once it passed; a second begun counts whole). */
export function bookingResendSecondsLeft(deadline: number | null, now: number): number {
	if (deadline === null) return 0;
	return Math.max(0, Math.ceil((deadline - now) / 1000));
}
