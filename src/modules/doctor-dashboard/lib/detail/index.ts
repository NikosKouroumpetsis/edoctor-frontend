import { m } from '$paraglide/messages.js';
import { cancelReasonLabel } from '$shared/lib/appointment-reasons';
import {
	doctorAppointmentStatusPill,
	isClosedAppointment,
	type AppointmentStatusPill
} from '$shared/lib/appointment-status';
import {
	APPOINTMENT_DAY_TIME_SEPARATOR,
	appointmentDayMonthLabel,
	appointmentDayTime,
	appointmentDayTimeLabel,
	appointmentDeadlineLabel,
	appointmentDurationLabel,
	appointmentRelativeDayLabel
} from '$shared/lib/appointment-when';
import { formatEuro, zonedDay } from '$shared/lib/format';
import {
	mobilePhoneLine,
	officeAddressLine,
	officeFloorLine,
	type PhoneLine
} from '$shared/lib/office';
import { withinDayLabel } from '$shared/lib/relative-time';
import { relativeGenderLabel, relativeNameWithWord } from '$shared/lib/relative-words';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorAppointmentActor,
	DoctorAppointmentAuditLine,
	DoctorAppointmentDetailFacts,
	DoctorAppointmentOutcome,
	DoctorAppointmentPerson,
	DoctorAppointmentVerdict,
	DoctorCancelReasonCode,
	DoctorRejectReasonCode
} from '$modules/doctor-dashboard/api/appointments';
import type { DoctorNewChannel } from '$modules/doctor-dashboard/lib/new';
import { officeDayOffset } from '$modules/doctor-dashboard/lib/today';

/*
 * Wave 5.1 · screen 68 «Το ραντεβού», the doctor's side, in words (D-W51-38; 88 §68; `64-switch/sw.js:395-449`
 * `apptBody`): the approved 51 of the patient with the patient in the doctor's place — its head, what asks for an
 * answer first, the patient's box (WHOLE, U-182.7), «Οι όροι σας» and «Χρονολόγιο». Since step 7 (D-W51-61, screen 71)
 * the outcome's blocks too: «σε εξέλιξη», «στο ιατρείο», «Τι έγινε με την επίσκεψη;» and the open correction.
 */

/** Screen 68's head: the doctor's pill, the day and the time, and «Σε 5 ώρες · Διάρκεια 30 λεπτά». */
export type DoctorAppointmentHead = {
	status: AppointmentStatusPill;
	day: string;
	time: string;
	sub: string;
};

/** 🔴 D-W51-29: who closed it — the side that canceled a `canceled` one, that refused a `rejected` one. */
const closedByOf = (appointment: DoctorAppointmentDetailFacts) =>
	appointment.status === 'rejected' ? appointment.rejectedBy : appointment.canceledBy;

/**
 * How near the visit is, as the prototype says it (`sw.js:358-394`): an open one ahead «Σε 20 λεπτά» / «Σε 5 ώρες»
 * within a day, else its day («Αύριο», «Σε 2 ημέρες»); an open one begun «Πριν από 2 ώρες», else «Χθες»; nothing for one
 * that is over (its length alone).
 */
function nearness(appointment: DoctorAppointmentDetailFacts, now: number, locale: SupportedLocale) {
	if (isClosedAppointment(appointment.status)) return null;
	const zone = appointment.officeTimeZone;
	const near = withinDayLabel(appointment.startTime, now, locale);
	if (near) return near;
	if (Date.parse(appointment.startTime) > now) {
		return appointmentRelativeDayLabel(appointment.startTime, now, locale, zone);
	}
	return officeDayOffset(appointment.startTime, now, zone) === -1
		? m.doctor_appointment_yesterday({}, { locale })
		: null;
}

export function buildDoctorAppointmentHead(
	appointment: DoctorAppointmentDetailFacts,
	now: number,
	locale: SupportedLocale
): DoctorAppointmentHead {
	const when = appointmentDayTime(appointment.startTime, locale, appointment.officeTimeZone);
	return {
		status: doctorAppointmentStatusPill(appointment.status, closedByOf(appointment), locale),
		day: when?.day ?? '',
		time: when?.time ?? '',
		sub: [
			nearness(appointment, now, locale),
			appointmentDurationLabel(appointment.durationInMinutes, locale)
		]
			.filter(Boolean)
			.join(APPOINTMENT_DAY_TIME_SEPARATOR)
	};
}

/** The one-tap answers of a visit that began (D-W51-25): «Δεν ήρθε · Ολοκληρώθηκε». */
export type DoctorAppointmentOutcomeAnswer = DoctorAppointmentVerdict;

/**
 * What asks for an answer first, or tells what was just done (88 §68, §71): a request with its deadline and
 * «Επιβεβαίωση»; a visit begun with its question («Η επίσκεψη είναι σε εξέλιξη.», «Ο ασθενής είναι στο ιατρείο.», «Τι
 * έγινε με την επίσκεψη;»), the system's outcome, «Δεν ήρθε · Ολοκληρώθηκε», «Ήρθε, είναι ακόμα στο ιατρείο» while it
 * lasts and what each answer means; the green card of what was just written; how a refused or canceled one ended; the
 * open correction of a settled one with «Διόρθωση».
 */
export type DoctorAppointmentBlock =
	| { kind: 'request'; text: string; lines: string[]; confirm: boolean }
	| {
			kind: 'outcome';
			text: string;
			lines: string[];
			outcomes: DoctorAppointmentOutcomeAnswer[];
			/** 🔴 D-W51-61: «Ήρθε, είναι ακόμα στο ιατρείο» (`ARRIVED`) — while the visit lasts, only as the server offers it. */
			arrive: boolean;
			/** ««Ολοκληρώθηκε»: ο ασθενής μπορεί να γράψει κριτική. «Δεν ήρθε»: …» */
			meaning: string;
	  }
	| { kind: 'done'; text: string; lines: string[] }
	| { kind: 'closed'; text: string; lines: string[] }
	| { kind: 'correction'; text: string; lines: string[] };

const ONE_TAP_OUTCOMES: readonly DoctorAppointmentOutcomeAnswer[] = ['NO_SHOW', 'COMPLETED'];

const clockOf = (instant: string, locale: SupportedLocale, zone: string) =>
	appointmentDayTime(instant, locale, zone)?.time ?? '';

/** «Το αίτημα λήγει σήμερα στις 16:30, αν δεν απαντήσετε.» — today, tomorrow, else the whole day. */
function expiryLine(
	appointment: DoctorAppointmentDetailFacts,
	now: number,
	locale: SupportedLocale
) {
	const at = appointment.expiresAt;
	if (!at) return null;
	const zone = appointment.officeTimeZone;
	const options = { locale };
	const time = clockOf(at, locale, zone);
	const offset = officeDayOffset(at, now, zone);
	if (time && offset === 0) return m.doctor_appointment_expires_today({ time }, options);
	if (time && offset === 1) return m.doctor_appointment_expires_tomorrow({ time }, options);
	const date = appointmentDeadlineLabel(at, locale, zone);
	return date ? m.doctor_appointment_expires_date({ date }, options) : null;
}

/** The state a settling verdict leaves (`NO_SHOW` ⇒ `no_show`, `COMPLETED` ⇒ `completed`). */
const VERDICT_STATUS: Record<
	DoctorAppointmentOutcomeAnswer,
	DoctorAppointmentDetailFacts['status']
> = {
	NO_SHOW: 'no_show',
	COMPLETED: 'completed'
};

/** The verdict a settled visit holds now, `null` for any other state. */
export function doctorSettledVerdict(
	status: DoctorAppointmentDetailFacts['status']
): DoctorAppointmentOutcomeAnswer | null {
	if (status === 'completed') return 'COMPLETED';
	if (status === 'no_show') return 'NO_SHOW';
	return null;
}

/** «Δεν ήρθε» / «Ολοκληρώθηκε»: a verdict in the words of its button (66, 68, 71). */
export function doctorVerdictWord(
	verdict: DoctorAppointmentOutcomeAnswer,
	locale: SupportedLocale
): string {
	return verdict === 'NO_SHOW'
		? m.doctor_today_no_show({}, { locale })
		: m.doctor_today_completed({}, { locale });
}

type DayMessage = (inputs: { day: string }, options: { locale: SupportedLocale }) => string;

// The day with its article, by the weekday of the office's calendar (Sunday first, `getUTCDay`): «τη Δευτέρα …», «το
// Σάββατο …», «την Κυριακή …» — the application's `doctorDashboard.today.on.*`.
const ON_DAY: readonly DayMessage[] = [
	m.doctor_outcome_on_sunday,
	m.doctor_outcome_on_monday,
	m.doctor_outcome_on_tuesday,
	m.doctor_outcome_on_wednesday,
	m.doctor_outcome_on_thursday,
	m.doctor_outcome_on_friday,
	m.doctor_outcome_on_saturday
];

/**
 * 🔴 D-W51-61: the {πότε} of «… μπορείτε να το διορθώσετε ως {πότε}.» — the server's instant (never computed) on the
 * office's clock, as the application says it: «σήμερα, 18:30», «αύριο, 09:00», else «την Κυριακή 15 Νοεμβρίου, 18:30».
 */
export function doctorUntilPhrase(
	instant: string,
	now: number,
	locale: SupportedLocale,
	timeZone: string
): string | null {
	const parts = appointmentDayTime(instant, locale, timeZone);
	if (!parts) return null;
	const options = { locale };
	const lower = (text: string) => `${text.charAt(0).toLocaleLowerCase(locale)}${text.slice(1)}`;
	const offset = officeDayOffset(instant, now, timeZone);
	if (offset === 0) return lower(m.doctor_today_when_today({ time: parts.time }, options));
	if (offset === 1) return lower(m.doctor_today_when_tomorrow({ time: parts.time }, options));
	const weekday = new Date(`${zonedDay(Date.parse(instant), timeZone)}T00:00:00Z`).getUTCDay();
	const day = ON_DAY[weekday]?.({ day: parts.day }, options) ?? parts.day;
	return m.doctor_today_when_date({ date: day, time: parts.time }, options);
}

/** 🔴 D-W51-61: from the hour to the end (the server's `endTime`) the visit is «σε εξέλιξη»; after it, over. */
function isOngoing(appointment: DoctorAppointmentDetailFacts, now: number): boolean {
	const start = Date.parse(appointment.startTime);
	const end = appointment.endTime === null ? Number.NaN : Date.parse(appointment.endTime);
	return Number.isFinite(start) && Number.isFinite(end) && start <= now && now < end;
}

/** «Αν δεν απαντήσετε, αύριο στις 10:30 γράφεται «Ολοκληρώθηκε».» — today or tomorrow, the 66's own words. */
function unattendedLine(
	appointment: DoctorAppointmentDetailFacts,
	now: number,
	locale: SupportedLocale
) {
	const at = appointment.unattendedOutcomeAt;
	if (!at) return null;
	const zone = appointment.officeTimeZone;
	const time = clockOf(at, locale, zone);
	const offset = officeDayOffset(at, now, zone);
	if (!time) return null;
	if (offset === 0) return m.doctor_today_auto_outcome_today({ time }, { locale });
	if (offset === 1) return m.doctor_today_auto_outcome_tomorrow({ time }, { locale });
	return null;
}

/** The long instant of a trail or of how it ended: «Σάββατο 14 Νοεμβρίου, 12:45». */
const longWhen = (
	instant: string,
	appointment: DoctorAppointmentDetailFacts,
	locale: SupportedLocale
) => appointmentDeadlineLabel(instant, locale, appointment.officeTimeZone);

/** «Από εσάς · …», «Από τον ασθενή · …», «Από την υποστήριξη · …»; none for the system or without an instant. */
function byLine(
	actor: DoctorAppointmentActor | null,
	at: string | null,
	appointment: DoctorAppointmentDetailFacts,
	locale: SupportedLocale
) {
	const when = at ? longWhen(at, appointment, locale) : '';
	if (!when) return null;
	const options = { locale };
	if (actor === 'DOCTOR') return m.doctor_appointment_by_you({ when }, options);
	if (actor === 'PATIENT') return m.doctor_appointment_by_patient({ when }, options);
	if (actor === 'BACKOFFICE') return m.doctor_appointment_by_support({ when }, options);
	return null;
}

type Message = (inputs: Record<string, never>, options: { locale: SupportedLocale }) => string;

// The prototype's words of the doctor's own reasons (`sw.js:446-449`, the application's `doctorAppointments.reasons`):
// 🔴 D-W51-47 total over the contract's two enums of the doctor side, so a code the contract adds fails the build
// here instead of reaching screen 69 as a wire word. Read the other way round by 68: the doctor side's in its voice.
const DOCTOR_REASON_WORDS = {
	DOCTOR_UNAVAILABLE: m.doctor_appointment_reason_doctor_unavailable,
	SLOT_TAKEN: m.doctor_appointment_reason_slot_taken,
	NEEDS_DIFFERENT_SERVICE: m.doctor_appointment_reason_needs_different_service,
	EMERGENCY: m.doctor_appointment_reason_emergency,
	OTHER: m.doctor_appointment_reason_other
} as const satisfies Record<DoctorRejectReasonCode | DoctorCancelReasonCode, Message>;

/** A reason of the doctor side in the doctor's words (screen 69's rows, 68's «Λόγος»); `null` for another code. */
export function doctorReasonWord(code: string | null, locale: SupportedLocale): string | null {
	if (!code || !Object.hasOwn(DOCTOR_REASON_WORDS, code)) return null;
	return DOCTOR_REASON_WORDS[code as keyof typeof DOCTOR_REASON_WORDS]({}, { locale });
}

/** A stored reason in words: the doctor side's in its own voice, the patient's in theirs; `null` for an unknown code. */
export function doctorReasonLabel(
	code: string | null,
	by: DoctorAppointmentActor | null,
	locale: SupportedLocale
): string | null {
	if (!code) return null;
	if (by !== 'PATIENT') {
		const word = doctorReasonWord(code, locale);
		if (word) return word;
	}
	return cancelReasonLabel(code, locale);
}

/** How a refused or canceled one ended: who and when, the reason, the words, and that the patient was told. */
function closedBlock(
	appointment: DoctorAppointmentDetailFacts,
	locale: SupportedLocale
): DoctorAppointmentBlock | null {
	const options = { locale };
	const rejected = appointment.status === 'rejected';
	if (!rejected && appointment.status !== 'canceled') return null;
	const by = rejected ? appointment.rejectedBy : appointment.canceledBy;
	const at = rejected ? appointment.rejectedAt : appointment.canceledAt;
	const reason = doctorReasonLabel(
		rejected ? appointment.rejectReasonCode : appointment.cancelReasonCode,
		by,
		locale
	);
	const text = rejected ? appointment.rejectReasonText : appointment.cancelReasonText;
	const doctorSide = by === 'DOCTOR' || by === 'BACKOFFICE';
	const lines: (string | null)[] = [
		byLine(by, at, appointment, locale),
		reason ? m.doctor_appointment_reason({ reason }, options) : null,
		text && by === 'DOCTOR' ? m.doctor_appointment_your_message({ text }, options) : null,
		text && by === 'PATIENT' ? m.doctor_appointment_patient_message({ text }, options) : null,
		doctorSide ? m.doctor_appointment_patient_informed({}, options) : null
	];
	return {
		kind: 'closed',
		text: rejected
			? m.doctor_appointment_rejected({}, options)
			: appointment.confirmedAt === null
				? m.doctor_appointment_canceled_request({}, options)
				: m.doctor_appointment_canceled({}, options),
		lines: lines.filter((line): line is string => Boolean(line))
	};
}

/**
 * 🔴 What screens 70 and 71 just saved on an appointment, remembered for its 68 (D-W51-51, D-W51-52, D-W51-62; never in
 * the address): the hour it moved FROM and whether that confirmed a request (U-190.2), the services and the price, or
 * the verdict an outcome was corrected into.
 */
export type DoctorAppointmentSaved =
	| { kind: 'moved'; was: string; confirmed: boolean }
	| { kind: 'charges' }
	| { kind: 'corrected'; to: DoctorAppointmentOutcomeAnswer }
	/** 🔴 D-W51-70: screen 72 just booked it, and how the summary said the patient is told. */
	| { kind: 'booked'; told: DoctorNewChannel[] };

/** The states a save of screen 70 is said on (a visit closed since then says how it ended instead). */
const SAVED_SHOWN_ON: readonly string[] = ['pending', 'booked', 'checked_in'];

/**
 * 🔴 D-W51-62 (`sw.js:1032`): the green card of a correction of screen 71 — «Διορθώθηκε σε «…».» and what it did; only
 * while the visit holds that verdict (one corrected again since then says nothing of it).
 */
function correctedBlock(
	appointment: DoctorAppointmentDetailFacts,
	to: DoctorAppointmentOutcomeAnswer,
	locale: SupportedLocale
): DoctorAppointmentBlock | null {
	if (appointment.status !== VERDICT_STATUS[to]) return null;
	const options = { locale };
	return {
		kind: 'done',
		text: m.doctor_correction_done({ outcome: doctorVerdictWord(to, locale) }, options),
		lines: [
			to === 'NO_SHOW'
				? m.doctor_correction_done_no_show({}, options)
				: m.doctor_correction_done_completed({}, options)
		]
	};
}

/**
 * 🔴 D-W51-61 (`sw.js:412-417`): a settled visit the server still lets the doctor correct — the system's
 * «Ολοκληρώθηκε» («Το «Ολοκληρώθηκε» γράφτηκε αυτόματα, γιατί δεν δηλώσατε έκβαση. Μπορείτε να το διορθώσετε ως …»)
 * or his own answer (U-196.1: «Γράψατε «…». Αν έγινε λάθος, μπορείτε να το διορθώσετε ως …»); the {πότε} is the
 * server's `outcomeCorrectableUntil`, never computed. None without the server's `actions.correction`.
 */
function correctionBlock(
	appointment: DoctorAppointmentDetailFacts,
	now: number,
	locale: SupportedLocale
): DoctorAppointmentBlock | null {
	const correction = appointment.actions.correction;
	const verdict = doctorSettledVerdict(appointment.status);
	const source = appointment.outcomeSource;
	if (!correction || !verdict || correction.to === verdict || !source) return null;
	const when = doctorUntilPhrase(
		appointment.outcomeCorrectableUntil ?? correction.until,
		now,
		locale,
		appointment.officeTimeZone
	);
	if (!when) return null;
	const outcome = doctorVerdictWord(verdict, locale);
	const options = { locale };
	return {
		kind: 'correction',
		text:
			source === 'SYSTEM'
				? m.doctor_outcome_correct_system({ outcome, when }, options)
				: m.doctor_outcome_correct_mine({ outcome, when }, options),
		lines: []
	};
}

/**
 * 🔴 D-W51-70 (`sw.js:1096`): «Ο ασθενής το βλέπει στην εφαρμογή του και ενημερώθηκε.» for an account; for a patient
 * without one «Ο ασθενής ενημερώθηκε με SMS και email.» by what was sent; nothing when nothing was.
 */
function bookedLine(told: readonly DoctorNewChannel[], locale: SupportedLocale): string | null {
	const options = { locale };
	if (told.includes('app')) return m.doctor_new_done_app({}, options);
	const sms = told.includes('sms');
	const email = told.includes('email');
	if (sms && email) return m.doctor_new_done_sms_email({}, options);
	if (sms) return m.doctor_new_done_sms({}, options);
	if (email) return m.doctor_new_done_email({}, options);
	return null;
}

/**
 * The green card of a save of screen 70 (`sw.js:1006`, `:1017`): what changed and that the patient was told; of screen
 * 72 (`sw.js:1096`) «Το ραντεβού κλείστηκε.» and how the patient was told.
 */
function savedBlock(
	appointment: DoctorAppointmentDetailFacts,
	saved: Exclude<DoctorAppointmentSaved, { kind: 'corrected' }>,
	locale: SupportedLocale
): DoctorAppointmentBlock {
	const options = { locale };
	if (saved.kind === 'booked') {
		const line = bookedLine(saved.told, locale);
		return { kind: 'done', text: m.doctor_new_done({}, options), lines: line ? [line] : [] };
	}
	if (saved.kind === 'charges') {
		return {
			kind: 'done',
			text: m.doctor_application_saved({}, options),
			lines: [m.doctor_charges_done_line({}, options)]
		};
	}
	const when = appointmentDayTimeLabel(saved.was, locale, appointment.officeTimeZone);
	return {
		kind: 'done',
		text: saved.confirmed
			? m.doctor_move_done_confirmed({}, options)
			: m.appointments_done_time({}, options),
		lines: when ? [m.doctor_move_done_was({ when }, options)] : []
	};
}

/**
 * 🔴 88 §68, §71 (`sw.js:404-418`), in this order: the green card of an outcome this page just wrote, or of the
 * correction screen 71 just saved (D-W51-62); a request the doctor can answer; a visit begun whose outcome is due
 * (D-W51-61); the green card of what screen 70 just saved (D-W51-51 / 52), while it is open; how a refused / canceled
 * one ended; the open correction of a settled one (D-W51-61, U-196.1). Nothing for the rest (a kept one ahead, one over
 * that the server no longer lets correct).
 */
export function buildDoctorAppointmentBlock(input: {
	appointment: DoctorAppointmentDetailFacts;
	now: number;
	/** What this page answered for it, once the server took it (the page's memory). */
	done: 'confirm' | DoctorAppointmentOutcome | null;
	/** What screens 70 / 71 saved on it just before (the screen's memory). */
	saved?: DoctorAppointmentSaved | null;
	locale: SupportedLocale;
}): DoctorAppointmentBlock | null {
	const { appointment, now, done, saved = null, locale } = input;
	const options = { locale };
	if (done === 'COMPLETED' && appointment.status === 'completed') {
		return {
			kind: 'done',
			text: m.doctor_appointment_done_completed({}, options),
			lines: [m.doctor_appointment_done_completed_line({}, options)]
		};
	}
	if (done === 'NO_SHOW' && appointment.status === 'no_show') {
		return {
			kind: 'done',
			text: m.doctor_appointment_done_no_show({}, options),
			lines: [m.doctor_appointment_patient_informed({}, options)]
		};
	}
	if (saved?.kind === 'corrected') {
		const corrected = correctedBlock(appointment, saved.to, locale);
		if (corrected) return corrected;
	}
	if (appointment.status === 'pending' && appointment.actions.canConfirm) {
		return {
			kind: 'request',
			text: expiryLine(appointment, now, locale) ?? m.doctor_appointment_waiting({}, options),
			lines: [],
			confirm: true
		};
	}
	const outcomes = ONE_TAP_OUTCOMES.filter((answer) =>
		appointment.actions.outcomes.includes(answer)
	);
	if (outcomes.length > 0) {
		const auto = unattendedLine(appointment, now, locale);
		const ongoing = isOngoing(appointment, now);
		return {
			kind: 'outcome',
			text:
				appointment.status === 'checked_in'
					? m.doctor_outcome_arrived({}, options)
					: ongoing
						? m.doctor_outcome_ongoing({}, options)
						: m.doctor_appointment_outcome_question({}, options),
			lines: auto ? [auto] : [],
			outcomes,
			arrive: ongoing && appointment.actions.outcomes.includes('ARRIVED'),
			meaning: m.doctor_outcome_meaning({}, options)
		};
	}
	if (saved && saved.kind !== 'corrected' && SAVED_SHOWN_ON.includes(appointment.status)) {
		return savedBlock(appointment, saved, locale);
	}
	return closedBlock(appointment, locale) ?? correctionBlock(appointment, now, locale);
}

/** The patient's box (`sw.js:421-424`): the name (with the relative's word), the visits' tag, the number to call. */
export type DoctorAppointmentPatientBox = {
	name: string;
	/** «Πρώτη επίσκεψη σε εσάς» (green) or «4η επίσκεψη σε εσάς · τελευταία 22 Οκτωβρίου» (neutral); none unsent. */
	visits: { label: string; first: boolean } | null;
	/** 🔴 D-W51-71 (`m-after-new.png`): «Χωρίς λογαριασμό eDoctor» under the name for the doctor's record, else none. */
	noAccount: string | null;
	/** «Κλήση»: the account holder's mobile (the one who booked), else the relative's. */
	call: PhoneLine | null;
};

/**
 * «Κλήση» (`sw.js:420`, `(a.by || a.who).tel`): the account holder's mobile — the one who booked, when it is for a
 * relative — else the relative's; screen 69's «τηλεφωνήστε και στον ασθενή» calls the same number (D-W51-47).
 */
export function doctorAppointmentCallLine(
	appointment: DoctorAppointmentDetailFacts
): PhoneLine | null {
	return mobilePhoneLine(appointment.patient.phone) ?? mobilePhoneLine(appointment.relative?.phone);
}

/** The person the visit is for, named as the 51 names a visitor: «Νίκος Μαυρίδης (γιος)». */
function visitorName(appointment: DoctorAppointmentDetailFacts, locale: SupportedLocale): string {
	const relative = appointment.relative;
	if (!relative) return appointment.patient.name ?? '';
	return relativeNameWithWord(relative.name ?? '', relative.relationship, relative.gender, locale);
}

/** 🔴 D-W51-33: «Πρώτη επίσκεψη σε εσάς» at none before; «{n+1}η επίσκεψη σε εσάς · τελευταία {ημέρα}». */
export function doctorVisitsLabel(
	appointment: DoctorAppointmentDetailFacts,
	locale: SupportedLocale
): DoctorAppointmentPatientBox['visits'] {
	const visits = appointment.visitsWithDoctor;
	if (!visits) return null;
	const options = { locale };
	if (visits.count === 0)
		return { label: m.doctor_appointment_first_visit({}, options), first: true };
	const count = visits.count + 1;
	const date = visits.lastAt
		? appointmentDayMonthLabel(visits.lastAt, locale, appointment.officeTimeZone)
		: '';
	return {
		label: date
			? m.doctor_appointment_visit_count_last({ count, date }, options)
			: m.doctor_appointment_visit_count({ count }, options),
		first: false
	};
}

export function buildDoctorAppointmentPatientBox(
	appointment: DoctorAppointmentDetailFacts,
	locale: SupportedLocale
): DoctorAppointmentPatientBox {
	return {
		name: visitorName(appointment, locale),
		visits: doctorVisitsLabel(appointment, locale),
		noAccount:
			appointment.patientKind === 'RECORD' ? m.doctor_new_no_account({}, { locale }) : null,
		call: doctorAppointmentCallLine(appointment)
	};
}

/**
 * 🔴 U-193.1 · D-W51-87: what «Μήνυμα» opens — the conversation this doctor holds with the account, else one the doctor
 * starts with the patient of the appointment (the account, or the relative: the conversation is the account's that
 * books). Rewrites the step-4 rule «only to a conversation that exists». 🔴 D-W51-71: never for a patient without an
 * account (he has nowhere to read it, `m-after-new.png`) — whatever the answer says.
 */
export type DoctorAppointmentMessageTarget =
	| { conversationId: string }
	| { patient: { kind: 'account' | 'relative'; id: string } };

export function doctorAppointmentMessageTarget(
	appointment: Pick<DoctorAppointmentDetailFacts, 'patientKind' | 'conversationId' | 'patientKey'>
): DoctorAppointmentMessageTarget | null {
	if (appointment.patientKind === 'RECORD') return null;
	if (appointment.conversationId) return { conversationId: appointment.conversationId };
	const key = appointment.patientKey;
	return key && (key.kind === 'account' || key.kind === 'relative')
		? { patient: { kind: key.kind, id: key.id } }
		: null;
}

/** One labelled fact of a person («Κινητό · +30 …», a mobile dials). */
export type DoctorAppointmentPair = { id: string; label: string; value: string; dial?: string };

/** One row of the box (88 §68): its label, values, muted lines, pairs and amounts, and the screen its «Αλλαγή» opens. */
export type DoctorAppointmentRow = {
	id: 'date-time' | 'office' | 'services' | 'patient' | 'visitor' | 'booker' | 'note' | 'price';
	label: string;
	values: string[];
	/** What the fact is now, muted («Τελική τιμή που ορίσατε.»). */
	notes: string[];
	hint: string | null;
	pairs: DoctorAppointmentPair[];
	emphasis: boolean;
	breakdown: {
		lines: { label: string; amount: string }[];
		totalLabel: string;
		total: string;
	} | null;
	/** 🔴 D-W51-51 / 52: the screen of 70 its «Αλλαγή» opens, only with the server's `actions`; `null` for none. */
	change: 'time' | 'services' | null;
};

/**
 * 🔴 D-W51-51 (`sw.js:429`): «Ημέρα και ώρα» changes while the hour may move — a request or a kept visit, with the
 * server's `canReschedule`; 🔴 D-W51-52 (`sw.js:431`, `:434`): «Υπηρεσίες» and «Κόστος» with `canEditCharges`.
 */
export function doctorAppointmentRowChange(
	appointment: Pick<DoctorAppointmentDetailFacts, 'status' | 'actions'>,
	row: DoctorAppointmentRow['id']
): DoctorAppointmentRow['change'] {
	if (row === 'date-time') {
		const open = appointment.status === 'pending' || appointment.status === 'booked';
		return open && appointment.actions.canReschedule ? 'time' : null;
	}
	if (row === 'services' || row === 'price') {
		return appointment.actions.canEditCharges ? 'services' : null;
	}
	return null;
}

/**
 * 🔴 U-182.7: a person's facts WHOLE, in the prototype's order (`sw.js:401`) — mobile (it dials), email, ΑΜΚΑ, ΑΦΜ and,
 * for a relative, the gender. A fact the server did not send is left out, never a label without an answer.
 */
function personPairs(
	person: DoctorAppointmentPerson,
	gender: string | null,
	locale: SupportedLocale
): DoctorAppointmentPair[] {
	const options = { locale };
	const mobile = mobilePhoneLine(person.phone);
	const genderWord = gender ? relativeGenderLabel(gender, locale) : '';
	const pairs: (DoctorAppointmentPair | null)[] = [
		mobile
			? {
					id: 'mobile',
					label: m.doctor_appointment_mobile({}, options),
					value: mobile.label,
					dial: mobile.dial
				}
			: null,
		person.email
			? { id: 'email', label: m.doctor_appointment_email({}, options), value: person.email }
			: null,
		person.amka
			? { id: 'amka', label: m.doctor_appointment_amka({}, options), value: person.amka }
			: null,
		person.afm
			? { id: 'afm', label: m.doctor_appointment_afm({}, options), value: person.afm }
			: null,
		genderWord
			? { id: 'gender', label: m.doctor_appointment_gender({}, options), value: genderWord }
			: null
	];
	return pairs.filter((pair): pair is DoctorAppointmentPair => pair !== null);
}

/**
 * 🔴 Screen 68's rows (88 §68, `sw.js:426-433`): «Ημέρα και ώρα» · «Ιατρείο» (address, the floor muted) · «Υπηρεσίες»
 * (each active line «Επανέλεγχος · 20 λεπτά») · «Στοιχεία ασθενή» WHOLE — or, for a relative, «Ασθενής» (the name with
 * the word, then the relative's facts and gender) and «Το έκλεισε» (the holder's) · «Σημείωση του ασθενή» (only with
 * one) · «Κόστος» (each priced line and «Σύνολο» for two or more; «Τελική τιμή που ορίσατε.» when the doctor set it;
 * «Ο ασθενής βλέπει την τιμή ως ενδεικτική.»). A row the server has nothing for is left out; each says which screen of
 * 70 its «Αλλαγή» opens (D-W51-51 / 52).
 */
export function buildDoctorAppointmentRows(
	appointment: DoctorAppointmentDetailFacts,
	locale: SupportedLocale
): DoctorAppointmentRow[] {
	const options = { locale };
	const row = (
		entry: Pick<DoctorAppointmentRow, 'id' | 'label'> & Partial<DoctorAppointmentRow>
	): DoctorAppointmentRow => ({
		values: [],
		notes: [],
		hint: null,
		pairs: [],
		emphasis: false,
		breakdown: null,
		change: doctorAppointmentRowChange(appointment, entry.id),
		...entry
	});
	const rows: DoctorAppointmentRow[] = [];
	const zone = appointment.officeTimeZone;

	const when = appointmentDayTimeLabel(appointment.startTime, locale, zone);
	rows.push(
		row({
			id: 'date-time',
			label: m.doctor_appointment_date_time({}, options),
			values: when ? [when] : []
		})
	);

	const address = appointment.office ? officeAddressLine(appointment.office, locale) : '';
	const floor = appointment.office ? officeFloorLine(appointment.office, locale) : null;
	if (address || floor) {
		rows.push(
			row({
				id: 'office',
				label: m.doctor_appointment_office({}, options),
				values: address ? [address] : [],
				hint: floor
			})
		);
	}

	const active = appointment.serviceLines.filter((line) => line.isActive);
	if (active.length > 0) {
		rows.push(
			row({
				id: 'services',
				label: m.doctor_appointment_services({}, options),
				values: active.map((line) =>
					line.durationInMinutes && line.durationInMinutes > 0
						? [
								line.title,
								m.doctor_today_minutes({ minutes: line.durationInMinutes }, options)
							].join(APPOINTMENT_DAY_TIME_SEPARATOR)
						: line.title
				)
			})
		);
	}

	const relative = appointment.relative;
	if (relative) {
		rows.push(
			row({
				id: 'visitor',
				label: m.doctor_appointment_patient({}, options),
				values: [visitorName(appointment, locale)].filter(Boolean),
				pairs: personPairs(relative, relative.gender, locale)
			}),
			row({
				id: 'booker',
				label: m.doctor_appointment_booked_by({}, options),
				values: appointment.patient.name ? [appointment.patient.name] : [],
				pairs: personPairs(appointment.patient, null, locale)
			})
		);
	} else {
		const pairs = personPairs(appointment.patient, null, locale);
		if (pairs.length > 0) {
			rows.push(
				row({ id: 'patient', label: m.doctor_appointment_patient_details({}, options), pairs })
			);
		}
	}

	if (appointment.patientNote) {
		rows.push(
			row({
				id: 'note',
				label: m.doctor_appointment_note({}, options),
				values: [appointment.patientNote]
			})
		);
	}

	const total = appointment.totalAmount;
	if (total !== null) {
		const priced = active.filter((line) => line.amount !== null);
		rows.push(
			row({
				id: 'price',
				label: m.doctor_appointment_cost({}, options),
				values: priced.length > 1 ? [] : [formatEuro(total, locale)],
				emphasis: true,
				notes:
					appointment.priceOverriddenAt !== null ? [m.doctor_charges_price_set({}, options)] : [],
				hint: m.doctor_appointment_cost_hint({}, options),
				breakdown:
					priced.length > 1
						? {
								lines: priced.map((line) => ({
									label: line.title,
									amount: formatEuro(line.amount as number, locale)
								})),
								totalLabel: m.doctor_appointment_total({}, options),
								total: formatEuro(total, locale)
							}
						: null
			})
		);
	}
	return rows;
}

/** «Οι όροι σας»: how it is confirmed, then until when the patient cancels. */
export type DoctorAppointmentTerms = { title: string; lines: string[] };

/**
 * 🔴 88 §68 «Οι όροι σας» (`sw.js:434`; D-W51-33: `patientCancellation`, `confirmationModeSnapshot`), only while it is
 * open ahead (a request, a kept visit): «Επιβεβαίωση από εσάς» for a request, «Άμεση επιβεβαίωση» for one confirmed
 * by itself, else «Επιβεβαιωμένο»; then «Ο ασθενής ακυρώνει έως {n} ώρες πριν · δηλαδή έως {πότε}.» from the very
 * deadline the patient reads (never computed here, D-118 — w51-b4 §4), «… έως την ώρα του ραντεβού.» when that is the
 * start (U-90.1 Α2), «Η προθεσμία ακύρωσης του ασθενή πέρασε.» once it passed.
 */
export function buildDoctorAppointmentTerms(
	appointment: DoctorAppointmentDetailFacts,
	locale: SupportedLocale
): DoctorAppointmentTerms | null {
	if (appointment.status !== 'pending' && appointment.status !== 'booked') return null;
	const options = { locale };
	const lines = [
		appointment.status === 'pending'
			? m.doctor_appointment_terms_by_you({}, options)
			: appointment.confirmationMode === 'AUTO'
				? m.doctor_appointment_terms_instant({}, options)
				: m.doctor_appointment_terms_confirmed({}, options)
	];
	const terms = appointment.patientCancellation;
	if (terms) {
		if (terms.deadline === null) {
			lines.push(m.doctor_appointment_terms_passed({}, options));
		} else if (terms.deadline === appointment.startTime) {
			lines.push(m.doctor_appointment_terms_until_start({}, options));
		} else {
			const when = appointmentDeadlineLabel(terms.deadline, locale, appointment.officeTimeZone);
			const hours = terms.cutoffHours;
			if (when) {
				lines.push(
					hours === 1
						? m.doctor_appointment_terms_cutoff_one({ hours, when }, options)
						: m.doctor_appointment_terms_cutoff_other({ hours, when }, options)
				);
			}
		}
	}
	return { title: m.doctor_appointment_terms_title({}, options), lines };
}

/** One line of «Χρονολόγιο»: what happened, then when and by whom. */
export type DoctorAppointmentLogLine = { id: string; title: string; detail: string };

const isHourChange = (line: DoctorAppointmentAuditLine) =>
	line.action === 'UPDATED' &&
	line.previousStartTime !== null &&
	line.nextStartTime !== null &&
	line.previousStartTime !== line.nextStartTime;

/** The state a line led to, in the trail's words; `null` for a state the trail does not tell. */
function statusTitle(line: DoctorAppointmentAuditLine, locale: SupportedLocale): string | null {
	const options = { locale };
	switch (line.status) {
		case 'booked':
			return m.doctor_appointment_log_confirmed({}, options);
		case 'checked_in':
			return m.doctor_appointment_log_arrived({}, options);
		case 'completed':
			return m.doctor_appointment_log_completed({}, options);
		case 'no_show':
			return m.doctor_appointment_log_no_show({}, options);
		case 'canceled':
			return m.doctor_appointment_log_canceled({}, options);
		case 'rejected':
			return m.doctor_appointment_log_rejected({}, options);
		case 'expired':
			return m.doctor_appointment_log_expired({}, options);
		default:
			return null;
	}
}

/** 🔴 U-197.2 (`sw.js:1097`): an appointment the doctor booked confirmed at once — «Κλείστηκε · από εσάς». */
const isBookedByDoctor = (line: DoctorAppointmentAuditLine) =>
	line.action === 'CREATED' && line.actorKind === 'DOCTOR' && line.status === 'booked';

/** _source: the backend's `APPOINTMENT_AUDIT_ACTIONS` (a READ-ONLY copy of the words this page tells). */
function logTitle(line: DoctorAppointmentAuditLine, locale: SupportedLocale): string | null {
	const options = { locale };
	switch (line.action) {
		case 'CREATED':
			return isBookedByDoctor(line)
				? m.doctor_appointment_log_booked({}, options)
				: m.doctor_appointment_log_requested({}, options);
		case 'CONFIRMED':
			return m.doctor_appointment_log_confirmed({}, options);
		case 'UPDATED':
			return isHourChange(line) ? m.doctor_appointment_log_moved({}, options) : null;
		case 'REJECTED':
			return m.doctor_appointment_log_rejected({}, options);
		case 'CANCELED':
			return m.doctor_appointment_log_canceled({}, options);
		case 'OUTCOME_DECLARED':
		case 'STATUS_CHANGED':
			return statusTitle(line, locale);
		default:
			return null;
	}
}

const BY_WORDS: Record<DoctorAppointmentActor, Message> = {
	DOCTOR: m.doctor_appointment_log_by_you,
	SYSTEM: m.doctor_appointment_log_by_system,
	PATIENT: m.doctor_appointment_log_by_patient,
	BACKOFFICE: m.doctor_appointment_log_by_support
};

/**
 * 🔴 88 §68 «Χρονολόγιο» (D-W51-38, `sw.js:435`): the server's trail, oldest first — «Ζητήθηκε · Επιβεβαιώθηκε ·
 * Μετακινήθηκε · Ολοκληρώθηκε …», each with «Σάββατο 14 Νοεμβρίου, 12:45 · από εσάς / αυτόματα / από τον ασθενή». A
 * line the page has no word for (a note's edit, a service's change until step 6) is left out. 🔴 U-197.2 (step 8): one the
 * doctor booked confirmed at once reads ONE line «Κλείστηκε · από εσάς» — the `CONFIRMED` the server writes with its
 * `CREATED` (D-W51-56) says nothing more.
 */
export function buildDoctorAppointmentLog(
	appointment: DoctorAppointmentDetailFacts,
	locale: SupportedLocale
): DoctorAppointmentLogLine[] {
	const sorted = [...appointment.auditTrail].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
	return sorted
		.filter(
			(line, index) =>
				!(
					line.action === 'CONFIRMED' &&
					line.actorKind === 'DOCTOR' &&
					index > 0 &&
					isBookedByDoctor(sorted[index - 1] as DoctorAppointmentAuditLine)
				)
		)
		.flatMap((line, index) => {
			const title = logTitle(line, locale);
			const when = longWhen(line.at, appointment, locale);
			if (!title || !when) return [];
			const by = line.actorKind ? BY_WORDS[line.actorKind]({}, { locale }) : null;
			return [
				{
					id: `${index}`,
					title,
					detail: [when, by].filter(Boolean).join(APPOINTMENT_DAY_TIME_SEPARATOR)
				}
			];
		});
}
