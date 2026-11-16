import { m } from '$paraglide/messages.js';
import {
	APPOINTMENT_DAY_TIME_SEPARATOR,
	appointmentDayTimeLabel
} from '$shared/lib/appointment-when';
import { officeAddressIn, officeAddressJoin, type PhoneLine } from '$shared/lib/office';
import { withinDayLabel } from '$shared/lib/relative-time';
import { clampTextLength } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorAppointmentDetailFacts,
	DoctorCancelReasonCode,
	DoctorCancelRequest,
	DoctorRejectReasonCode,
	DoctorRejectRequest
} from '$modules/doctor-dashboard/api/appointments';
import {
	DOCTOR_CANCEL_REASONS,
	DOCTOR_REASON_TEXT_MAX_LENGTH,
	DOCTOR_REJECT_REASONS
} from '$modules/doctor-dashboard/config';
import { doctorAppointmentCallLine, doctorReasonWord } from '$modules/doctor-dashboard/lib/detail';
import type { DoctorReasonStep } from '$modules/doctor-dashboard/lib/paths';

/*
 * Wave 5.1 · screen 69 «Απόρριψη αιτήματος» / «Ακύρωση ραντεβού» in words (D-W51-46 … 48; 88 §69; `64-switch/sw.js:446-480`
 * `subPage`): the approved 53 of the patient from the doctor's side — the appointment's box, «Το ραντεβού είναι σε …»
 * for a cancellation within a day, the reasons of the server's lists, the words to the patient (500 at most), what will
 * happen, «Να μείνει» and the red button, locked until a reason is chosen.
 */

/** A reason of either list of the doctor side. */
export type DoctorReasonCode = DoctorRejectReasonCode | DoctorCancelReasonCode;

const REASONS: Record<DoctorReasonStep, readonly DoctorReasonCode[]> = {
	reject: DOCTOR_REJECT_REASONS,
	cancel: DOCTOR_CANCEL_REASONS
};

/** «Επιλέξτε τον λόγο»: the step's own reasons in the server's order, in the doctor's words (none chosen at first). */
export function doctorReasonOptions(
	step: DoctorReasonStep,
	locale: SupportedLocale
): { value: DoctorReasonCode; label: string }[] {
	return REASONS[step].map((value) => ({ value, label: doctorReasonWord(value, locale) ?? '' }));
}

/** 🔴 U-65.6: whether a picked value is one of the step's own reasons (only a code of the list ever travels). */
export function isDoctorReason(step: DoctorReasonStep, value: unknown): value is DoctorReasonCode {
	return typeof value === 'string' && (REASONS[step] as readonly string[]).includes(value);
}

/** The screen's words for a refusal or a cancellation: its title (and its red button), the box's word, what follows. */
export function doctorReasonCopy(step: DoctorReasonStep, locale: SupportedLocale) {
	const options = { locale };
	const reject = step === 'reject';
	return {
		title: reject
			? m.doctor_reason_reject_title({}, options)
			: m.doctor_reason_cancel_title({}, options),
		context: reject
			? m.doctor_reason_context_request({}, options)
			: m.doctor_reason_context_appointment({}, options),
		/** The toast on the 68 once the server took it (`sw.js:1110`). */
		done: reject
			? m.doctor_reason_done_reject({}, options)
			: m.doctor_reason_done_cancel({}, options),
		/** A write nobody decided (`422`, a lost request, `5xx`): the form stays (D-W51-48). */
		failed: reject
			? m.doctor_reason_failed_reject({}, options)
			: m.doctor_reason_failed_cancel({}, options),
		/** The step no longer allowed (D-W51-48, the 53's `late`): no form, one way back. */
		closed: reject
			? m.doctor_reason_closed_reject({}, options)
			: m.doctor_reason_closed_cancel({}, options)
	};
}

/** «Τι θα γίνει» (88 §69): the patient is told and reads the reason, the hour opens up, it is final. */
export function doctorReasonThenLines(step: DoctorReasonStep, locale: SupportedLocale): string[] {
	const options = { locale };
	return [
		m.doctor_reason_then_notified({}, options),
		m.doctor_reason_then_freed({}, options),
		step === 'reject'
			? m.doctor_reason_then_final_reject({}, options)
			: m.doctor_reason_then_final_cancel({}, options)
	];
}

/**
 * 🔴 U-65.6 / D-W51-34: the words as the field keeps them — 500 UTF-16 units (the browser's `maxlength`, so the server's
 * count of characters never passes it), never half an emoji; a paste past it is cut.
 */
export function clampDoctorReasonText(value: string): string {
	return clampTextLength(value, DOCTOR_REASON_TEXT_MAX_LENGTH);
}

/** «0/500» under the words, from the contract's bound (never a number of the page's own). */
export function doctorReasonCounter(value: string, locale: SupportedLocale): string {
	return m.doctor_reason_counter(
		{ count: clampDoctorReasonText(value).length, max: DOCTOR_REASON_TEXT_MAX_LENGTH },
		{ locale }
	);
}

/** The words that travel: trimmed, cut at the bound, and LEFT OUT when blank (the server refuses an empty text). */
function wordsOf(text: string): string | null {
	const words = clampDoctorReasonText(text.trim()).trim();
	return words || null;
}

/** «Απόρριψη αιτήματος»'s body: the reason of the four, the words as `message`; `null` for a code out of the list. */
export function toDoctorRejectRequest(reason: string, text: string): DoctorRejectRequest | null {
	if (!isDoctorReason('reject', reason)) return null;
	const words = wordsOf(text);
	const reasonCode = reason as DoctorRejectReasonCode;
	return words ? { reasonCode, message: words } : { reasonCode };
}

/** «Ακύρωση ραντεβού»'s body: the reason of the three, the words as `reasonText`; `null` for a code out of the list. */
export function toDoctorCancelRequest(reason: string, text: string): DoctorCancelRequest | null {
	if (!isDoctorReason('cancel', reason)) return null;
	const words = wordsOf(text);
	const reasonCode = reason as DoctorCancelReasonCode;
	return words ? { reasonCode, reasonText: words } : { reasonCode };
}

/**
 * 🔴 D-W51-48 (the server's `actions`, never a guess): what screen 69 opens as — the form while the step is allowed, else
 * «δεν γίνεται πια» with one way back. A request is refused (`canReject`); a kept appointment is canceled (`canCancel`,
 * never a request: the prototype cancels only what was confirmed, `sw.js:438`, a request is refused instead).
 */
export function doctorReasonEntry(
	appointment: Pick<DoctorAppointmentDetailFacts, 'status' | 'actions'>,
	step: DoctorReasonStep
): 'form' | 'closed' {
	if (step === 'reject') return appointment.actions.canReject ? 'form' : 'closed';
	return appointment.actions.canCancel && appointment.status !== 'pending' ? 'form' : 'closed';
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** «Το ραντεβού είναι σε 20 λεπτά.» and the number to call, when a cancellation is that near. */
export type DoctorReasonSoon = { text: string; call: PhoneLine | null };

/**
 * 🔴 D-W51-47 (`sw.js:462-463`): only for a cancellation whose start is ahead by less than a day on the server's clock —
 * «Το ραντεβού είναι σε {πότε}.» with 68's own words of nearness («σε 20 λεπτά», «σε 5 ώρες»), and the number of the
 * one who booked (else the relative's); without a number, the sentence alone.
 */
export function doctorReasonSoon(
	appointment: DoctorAppointmentDetailFacts,
	step: DoctorReasonStep,
	now: number,
	locale: SupportedLocale
): DoctorReasonSoon | null {
	if (step !== 'cancel') return null;
	const start = Date.parse(appointment.startTime);
	if (!Number.isFinite(start) || start <= now || start - now >= DAY_IN_MS) return null;
	const near = withinDayLabel(start, now, locale);
	if (!near) return null;
	// «Σε 20 λεπτά» of the head, inside the sentence: its first letter small («σε 20 λεπτά»), as the prototype writes it.
	const when = `${near.charAt(0).toLocaleLowerCase(locale)}${near.slice(1)}`;
	return {
		text: m.doctor_reason_soon({ when }, { locale }),
		call: doctorAppointmentCallLine(appointment)
	};
}

/** Screen 69's box (`sw.js:470`): the word, the day and the hour, «name · service · length», the office's street. */
export type DoctorReasonContext = { label: string; title: string; lines: string[]; name: string };

export function buildDoctorReasonContext(
	appointment: DoctorAppointmentDetailFacts,
	step: DoctorReasonStep,
	locale: SupportedLocale
): DoctorReasonContext {
	return buildDoctorAppointmentContext(appointment, doctorReasonCopy(step, locale).context, locale);
}

/**
 * The box of every step screen of the doctor (`sw.js:470`, `:495` `ctxOf`; screens 69 and 70): the caller's word («Το
 * αίτημα», «Το ραντεβού»), the day and the hour on the office's clock, «name · service · length», the office's street.
 */
export function buildDoctorAppointmentContext(
	appointment: DoctorAppointmentDetailFacts,
	label: string,
	locale: SupportedLocale
): DoctorReasonContext {
	const options = { locale };
	const name = appointment.relative?.name ?? appointment.patient.name ?? '';
	const services = appointment.serviceLines
		.filter((line) => line.isActive && line.title)
		.map((line) =>
			line.durationInMinutes && line.durationInMinutes > 0
				? [line.title, m.doctor_today_minutes({ minutes: line.durationInMinutes }, options)].join(
						APPOINTMENT_DAY_TIME_SEPARATOR
					)
				: line.title
		)
		.join(', ');
	const office = appointment.office ? officeAddressIn(appointment.office, locale) : null;
	const street = office
		? officeAddressJoin({ street: office.street, streetNumber: office.streetNumber })
		: '';
	return {
		label,
		title: appointmentDayTimeLabel(appointment.startTime, locale, appointment.officeTimeZone),
		lines: [[name, services].filter(Boolean).join(APPOINTMENT_DAY_TIME_SEPARATOR), street].filter(
			Boolean
		),
		name
	};
}
