import { m } from '$paraglide/messages.js';
import type { ValidatorFn } from '$shared/lib/form';
import { clampTextLength } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	AppointmentActionsFacts,
	AppointmentCancelReasonCode,
	AppointmentCancelRequest,
	AppointmentChangeFailureFacts,
	AppointmentFacts
} from '$modules/appointments/api/appointment';
import {
	APPOINTMENT_CANCEL_MESSAGE_MAX_LENGTH,
	PATIENT_CANCEL_REASONS
} from '$modules/appointments/config';
import { appointmentDeadlineLabel } from '$modules/appointments/lib/when';

/*
 * Screen 53 «Ακύρωση ραντεβού» in words (record §9.2, U-137, P-W4 §4.4, P-B4 §13.3.2). 🔴 U-137.5: no word here — nor
 * before nor after — ever says «εκπρόθεσμα»: the patient never reads it.
 */

type Message = (inputs: Record<string, never>, options: { locale: SupportedLocale }) => string;

/**
 * Every reason the contract takes, in words (the application's `CANCEL_REASON_KEYS`): total over BOTH sides' lists, as
 * a doctor's cancellation is read on the patient's page too («Λόγος: …»); only the patient's five are offered.
 */
const CANCEL_REASON_WORDS = {
	DOCTOR_UNAVAILABLE: m.appointments_cancel_reason_doctor_unavailable,
	EMERGENCY: m.appointments_cancel_reason_emergency,
	FEELING_BETTER: m.appointments_cancel_reason_feeling_better,
	FOUND_ANOTHER_DOCTOR: m.appointments_cancel_reason_found_another_doctor,
	OTHER: m.appointments_cancel_reason_other,
	PERSONAL: m.appointments_cancel_reason_personal,
	SCHEDULE_CONFLICT: m.appointments_cancel_reason_schedule_conflict
} as const satisfies Record<AppointmentCancelReasonCode, Message>;

/** The patient's reasons, typed by the contract: a code the server stops taking fails the build here. */
const PATIENT_REASONS: readonly AppointmentCancelReasonCode[] = PATIENT_CANCEL_REASONS;

/** A stored reason in words, `null` for none or for a code this build does not know (never the code itself). */
export function cancelReasonLabel(code: string | null, locale: SupportedLocale): string | null {
	return code && Object.hasOwn(CANCEL_REASON_WORDS, code)
		? CANCEL_REASON_WORDS[code as AppointmentCancelReasonCode]({}, { locale })
		: null;
}

/** «Επιλέξτε τον λόγο»: the five the patient may send (D-20), in the server's order. */
export function cancelReasonOptions(
	locale: SupportedLocale
): { code: AppointmentCancelReasonCode; label: string }[] {
	return PATIENT_REASONS.map((code) => ({
		code,
		label: CANCEL_REASON_WORDS[code]({}, { locale })
	}));
}

/** Whether a picked value is one of the patient's five (U-65.6: only a code of the list ever travels). */
export function isPatientCancelReason(value: unknown): value is AppointmentCancelReasonCode {
	return typeof value === 'string' && (PATIENT_REASONS as readonly string[]).includes(value);
}

/** U-137.4: the screen's words for a request (`pending`) or a kept visit — its title and its button, the offer's line. */
export function cancelCopy(appointment: Pick<AppointmentFacts, 'status'>, locale: SupportedLocale) {
	const options = { locale };
	const request = appointment.status === 'pending';
	return {
		title: request
			? m.appointments_cancel_title_request({}, options)
			: m.appointments_cancel_title({}, options),
		submit: request
			? m.appointments_detail_cancel_request({}, options)
			: m.appointments_cancel_submit({}, options),
		keep: m.appointments_cancel_keep({}, options),
		offerTitle: m.appointments_cancel_offer_title({}, options),
		offerBody: request
			? m.appointments_cancel_offer_body_request({}, options)
			: m.appointments_cancel_offer_body({}, options)
	};
}

/** One line of «Προθεσμία ακύρωσης»: its strong words and the words beside them. */
export type CancelTermsLine = { title: string; body: string };

/**
 * 🔴 «Προθεσμία ακύρωσης» (P-B4 §13.3.2, as written): a request (`pending`) always «Έως την ώρα του ραντεβού · Ακυρώνετε
 * το αίτημα από εδώ.»; a kept visit the doctor put inside its deadline (`cancellationDeadline === startTime`) «Έως την ώρα
 * του ραντεβού · Ακυρώνετε από εδώ, επειδή …»; any other «Έως {the instant} · Ακυρώνετε από εδώ.» and «Μετά · Μόνο
 * τηλεφωνικά με το ιατρείο · {phone}». An answer without the instant (D-118: never computed here): «Ακύρωση έως {N} ώρες πριν».
 * `phone` is the office's as the page shows it (the screen's `appointmentPhone`), the «Μετά» line only with one.
 */
export function buildCancelTerms({
	appointment,
	actions,
	phone,
	locale
}: {
	appointment: Pick<AppointmentFacts, 'status' | 'startTime' | 'officeTimeZone'>;
	actions: AppointmentActionsFacts | null;
	phone: string | null;
	locale: SupportedLocale;
}): { title: string; lines: CancelTermsLine[] } {
	const options = { locale };
	const title = m.appointments_cancel_terms_title({}, options);
	const untilStart = m.appointments_cancel_terms_until_start({}, options);
	if (appointment.status === 'pending') {
		return {
			title,
			lines: [{ title: untilStart, body: m.appointments_cancel_terms_here_request({}, options) }]
		};
	}
	const deadline = actions?.cancellationDeadline ?? null;
	if (deadline !== null && deadline === appointment.startTime) {
		return {
			title,
			lines: [{ title: untilStart, body: m.appointments_cancel_terms_here_moved({}, options) }]
		};
	}
	const when = deadline
		? appointmentDeadlineLabel(deadline, locale, appointment.officeTimeZone)
		: '';
	const hours = actions?.cancellationCutoffHours ?? null;
	const until = when
		? m.appointments_cancel_terms_until({ when }, options)
		: hours !== null
			? hours === 1
				? m.booking_policy_cancellation_one({ hours }, options)
				: m.booking_policy_cancellation_other({ hours }, options)
			: null;
	return {
		title,
		lines: [
			...(until ? [{ title: until, body: m.appointments_cancel_terms_here({}, options) }] : []),
			...(phone
				? [
						{
							title: m.appointments_cancel_terms_after({}, options),
							body: m.appointments_cancel_terms_phone_only({ phone }, options)
						}
					]
				: [])
		]
	};
}

/**
 * «Τι θα γίνει» (record §9.2): the doctor is told, the hour opens up, the email (only when the snapshot has one,
 * D-W4-11), and that a cancellation is final.
 */
export function cancelThenLines(
	appointment: Pick<AppointmentFacts, 'patientHasEmail'>,
	locale: SupportedLocale
): string[] {
	const options = { locale };
	return [
		m.appointments_cancel_then_notified({}, options),
		m.appointments_cancel_then_freed({}, options),
		...(appointment.patientHasEmail ? [m.appointments_cancel_then_email({}, options)] : []),
		m.appointments_cancel_then_final({}, options)
	];
}

/**
 * The cancel's body (D-20): the reason always; the words trimmed, cut to 500 (U-137.1: the screen's bound, the server
 * takes 2000; D-W4-36.8: in UTF-16 units, as the server counts) and LEFT OUT when blank — the server's validator refuses
 * an empty text. `null` for a reason that is not one of the patient's five.
 */
export function toCancelRequest(reasonCode: string, text: string): AppointmentCancelRequest | null {
	if (!isPatientCancelReason(reasonCode)) return null;
	const words = clampCancelMessage(text.trim()).trim();
	return words ? { reasonCode, reasonText: words } : { reasonCode };
}

/** The words as the field keeps them: 500 in UTF-16 units (D-W4-36.8), never half an emoji — a paste past it is cut. */
export function clampCancelMessage(value: string): string {
	return clampTextLength(value, APPOINTMENT_CANCEL_MESSAGE_MAX_LENGTH);
}

/**
 * The form of screen 53 as the shared `createForm` keeps it (the contract's «Form state», review w4-arch-frontend L-2):
 * the reason chosen (`''` for none yet) and the words.
 */
export type CancelFormValues = { reason: string; message: string };

/**
 * The form's rules (U-137.1, U-65.6): a reason of the patient's five (`required`: the button sleeps without one), the
 * words within 500 UTF-16 units (`maxLength`, D-W4-36.8 — the field cuts at it, `clampCancelMessage`). Neither has words
 * of its own on the screen.
 */
export function cancelFormRules(): Record<keyof CancelFormValues, ValidatorFn[]> {
	return {
		reason: [(value) => (isPatientCancelReason(value) ? null : { required: true })],
		message: [
			(value) =>
				typeof value === 'string' && value.length > APPOINTMENT_CANCEL_MESSAGE_MAX_LENGTH
					? { maxLength: true }
					: null
		]
	};
}

/** «0/500» under the words, in the units the server counts. */
export function cancelMessageCounter(value: string, locale: SupportedLocale): string {
	return m.booking_note_counter(
		{ count: clampCancelMessage(value).length, max: APPOINTMENT_CANCEL_MESSAGE_MAX_LENGTH },
		{ locale }
	);
}

/**
 * What screen 53 opens as (P-W4 §4.4): the form while the patient may cancel (`canCancel`); the view «η προθεσμία
 * έληξε» once the deadline has passed (`isPastCancellationCutoff`, the 51's own rule for its notice); any other closed
 * visit (canceled, refused, expired, begun) is no cancellation at all — the screen gives way to the 51, which tells how
 * it ended (review w4-w3 R1 MINOR-1: never «η προθεσμία έληξε» for a deadline that did not).
 */
export function cancelEntryOf(
	actions: Pick<AppointmentActionsFacts, 'canCancel' | 'isPastCancellationCutoff'>
): 'form' | 'deadline' | 'closed' {
	if (actions.canCancel) return 'form';
	return actions.isPastCancellationCutoff ? 'deadline' : 'closed';
}

/** What a refused cancellation means for the screen. */
export type CancelOutcome =
	| { kind: 'deadline' }
	| { kind: 'session' }
	| { kind: 'failed'; message: string };

/**
 * What a refused cancellation means for the screen (P-W4 §4.4, D-W4-37): the deadline passed while it was open
 * (`CANCEL_AFTER_CANCELLATION_CUTOFF`, and only that code) ⇒ the view «η προθεσμία έληξε» (review w4-w3 R1 MINOR-1:
 * never for a deadline that did not); too many writes ⇒ «Πολλές προσπάθειες…»; the session ⇒ nothing here (the sign-in
 * opens); anything else — a `403` / `404` that names no code, the `409` «changed concurrently», an unknown code — ⇒
 * «Η ακύρωση δεν ολοκληρώθηκε…», the patient STAYS with the reason and the words (D-W4-37.1). Every answer but the
 * session reads the appointment again (the screen's `onReread`): a visit closed meanwhile then gives way to the 51, a
 * deadline passed shows its view (D-W4-37.2).
 */
export function readCancelOutcome(
	failure: AppointmentChangeFailureFacts,
	locale: SupportedLocale
): CancelOutcome {
	if (failure.kind === 'session') return { kind: 'session' };
	if (failure.blockers.includes('CANCEL_AFTER_CANCELLATION_CUTOFF')) return { kind: 'deadline' };
	return {
		kind: 'failed',
		message:
			failure.kind === 'rate-limited'
				? m.booking_details_errors_rate_limited({}, { locale })
				: m.appointments_cancel_failed({}, { locale })
	};
}
