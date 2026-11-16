import { m } from '$paraglide/messages.js';
import { appointmentDayTime, appointmentDayTimeLabel } from '$shared/lib/appointment-when';
import { calendarDayStripLabels } from '$shared/lib/calendar-day';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorAppointmentDetailFacts,
	DoctorRescheduleSlotsFacts
} from '$modules/doctor-dashboard/api/appointments';
import {
	buildDoctorAppointmentContext,
	type DoctorReasonContext
} from '$modules/doctor-dashboard/lib/reason';

/*
 * Wave 5.1 · screen 70 «Αλλαγή ώρας» in words (D-W51-51; 88 §70; `64-switch/sw.js:483-522` `movePage`): the approved 52
 * from the doctor's side — the appointment's box, «Μόνο οι ώρες που είστε πραγματικά ελεύθερος/η…», the days in cards and
 * the hours in a grid from the doctor's REAL free time (U-189.1), «Ήταν / Νέα ώρα» with what follows and the patient's
 * rule, «Άκυρο» / «Αλλαγή και επιβεβαίωση» for a request (U-190.2) or «Αποθήκευση».
 */

/** 🔴 D-W51-51: the screen opens its form only while the server lets the hour move — a request or a kept visit. */
export function doctorMoveEntry(
	appointment: Pick<DoctorAppointmentDetailFacts, 'status' | 'actions'>
): 'form' | 'closed' {
	const open = appointment.status === 'pending' || appointment.status === 'booked';
	return open && appointment.actions.canReschedule ? 'form' : 'closed';
}

/** 🔴 U-190.2: moving a request confirms it in the same write. */
export function isDoctorMoveConfirming(appointment: Pick<DoctorAppointmentDetailFacts, 'status'>) {
	return appointment.status === 'pending';
}

/** The screen's box: «Το αίτημα» for a request, else «Το ραντεβού» (`sw.js:514`). */
export function buildDoctorMoveContext(
	appointment: DoctorAppointmentDetailFacts,
	locale: SupportedLocale
): DoctorReasonContext {
	const options = { locale };
	return buildDoctorAppointmentContext(
		appointment,
		isDoctorMoveConfirming(appointment)
			? m.doctor_reason_context_request({}, options)
			: m.doctor_reason_context_appointment({}, options),
		locale
	);
}

/**
 * 🔴 D-W51-51 (88 §70): «Μόνο οι ώρες που είστε πραγματικά ελεύθερος/η: …» — the web does not know the doctor's linked
 * calendar, so the sentence ends at «…που έχετε.» — then the 52's own «Η ώρα αλλάζει στο ίδιο ιατρείο…».
 */
export function doctorMoveHelp(locale: SupportedLocale): string {
	const options = { locale };
	return `${m.doctor_move_help({}, options)} ${m.appointments_change_time_help({}, options)}`;
}

/** «Αλλαγή και επιβεβαίωση» for a request (U-190.2), «Αποθήκευση» for a kept visit (88 §70). */
export function doctorMoveSaveLabel(
	appointment: Pick<DoctorAppointmentDetailFacts, 'status'>,
	locale: SupportedLocale
): string {
	const options = { locale };
	return isDoctorMoveConfirming(appointment)
		? m.doctor_move_confirm({}, options)
		: m.booking_change_save({}, options);
}

/** One hour of the grid: its clock on the office's calendar and the instant the write sends. */
export type DoctorMoveSlot = { label: string; startTime: string };

/** One day card of the strip, with its hours (none: the card is dimmed, S-26.1). */
export type DoctorMoveDay = {
	date: string;
	label: string;
	sublabel: string;
	accessibleLabel: string;
	disabled: boolean;
	slots: DoctorMoveSlot[];
};

/**
 * 🔴 U-189.1 (D-W51-41): the days of every week read, in order and each once, with ONLY the hours the server listed as
 * free — less those it said were taken meanwhile (`gone`) and those that passed while the page was open (the server's
 * «now»). A day left with none is dimmed, never hidden (the 52's strip).
 */
export function buildDoctorMoveDays(input: {
	pages: readonly DoctorRescheduleSlotsFacts[];
	gone: readonly string[];
	now: number;
	locale: SupportedLocale;
}): DoctorMoveDay[] {
	const seen = new Set<string>();
	return input.pages.flatMap((page) =>
		page.days.flatMap((day) => {
			if (seen.has(day.date)) return [];
			seen.add(day.date);
			const labels = calendarDayStripLabels(day.date, input.locale);
			const slots = day.slots.flatMap((slot) => {
				if (input.gone.includes(slot.startTime) || Date.parse(slot.startTime) <= input.now)
					return [];
				const clock = appointmentDayTime(slot.startTime, input.locale, page.timeZone)?.time;
				return clock ? [{ label: clock, startTime: slot.startTime }] : [];
			});
			return [
				{
					date: day.date,
					label: labels.weekdayDay,
					sublabel: labels.month,
					accessibleLabel: labels.accessible,
					disabled: slots.length === 0,
					slots
				}
			];
		})
	);
}

/** The day the strip opens on: the chosen one while it is still there, else the first with an hour, else the first. */
export function doctorMoveSelectedDay(
	days: readonly DoctorMoveDay[],
	chosen: string | null
): DoctorMoveDay | null {
	const kept = chosen ? days.find((day) => day.date === chosen && !day.disabled) : undefined;
	return kept ?? days.find((day) => !day.disabled) ?? days[0] ?? null;
}

const HOUR_IN_MS = 3_600_000;

/**
 * 🔴 U-90.1 Α2 (88 §70): the patient's rule after the move, from the appointment's own terms (`patientCancellation`) —
 * «έως {n} ώρες πριν», or, when the new hour is already within those {n} hours of the server's «now», «ως την ώρα του
 * ραντεβού, χωρίς «εκπρόθεσμη»»; none without terms.
 */
export function doctorMoveRule(
	appointment: Pick<DoctorAppointmentDetailFacts, 'patientCancellation'>,
	startTime: string,
	now: number,
	locale: SupportedLocale
): string | null {
	const terms = appointment.patientCancellation;
	const start = Date.parse(startTime);
	if (!terms || terms.cutoffHours < 1 || !Number.isFinite(start)) return null;
	const hours = terms.cutoffHours;
	const options = { locale };
	if (start - now < hours * HOUR_IN_MS) {
		return hours === 1
			? m.doctor_move_rule_inside_one({ hours }, options)
			: m.doctor_move_rule_inside_other({ hours }, options);
	}
	return hours === 1
		? m.doctor_move_rule_one({ hours }, options)
		: m.doctor_move_rule_other({ hours }, options);
}

/** «Ήταν / Νέα ώρα» and what follows once saved (`sw.js:511`). */
export type DoctorMoveDiff = { was: string; next: string; note: string };

/**
 * «Ήταν» the appointment's hour, «Νέα ώρα» the chosen one, both on the office's clock; then what follows — a request is
 * confirmed at the new hour (U-190.2), a kept visit stays kept, the patient is told — and the patient's rule.
 */
export function buildDoctorMoveDiff(input: {
	appointment: DoctorAppointmentDetailFacts;
	startTime: string;
	timeZone: string;
	now: number;
	locale: SupportedLocale;
}): DoctorMoveDiff {
	const { appointment, startTime, locale } = input;
	const options = { locale };
	const then = isDoctorMoveConfirming(appointment)
		? m.doctor_move_then_request({}, options)
		: m.doctor_move_then_booked({}, options);
	return {
		was: appointmentDayTimeLabel(appointment.startTime, locale, appointment.officeTimeZone),
		next: appointmentDayTimeLabel(startTime, locale, input.timeZone),
		note: [then, doctorMoveRule(appointment, startTime, input.now, locale)]
			.filter(Boolean)
			.join(' ')
	};
}
