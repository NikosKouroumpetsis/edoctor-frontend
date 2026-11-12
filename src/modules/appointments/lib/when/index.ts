import { m } from '$paraglide/messages.js';
import { formatCalendarDay, type CalendarDayFormat } from '$shared/lib/calendar-day';
import { formatClock, readZonedParts, zonedDay } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/*
 * Wave 4.0 · the appointment's hours in words, ALWAYS on its office's clock (owner 2026-09-27 «ώρα ιατρείου παντού»,
 * the application's `appointmentWhenLabel`): a patient abroad reads the hour the office keeps. A day is the office's
 * calendar day, printed as a day (UTC midnight, `formatCalendarDay`); the time is its wall clock. Anything that is not
 * an instant reads as nothing (`null`), never as a wrong day.
 */

const DAY_IN_MS = 86_400_000;

/** The office's calendar day (`YYYY-MM-DD`) and minute of an instant, or `null` for anything that is not one. */
function officeMoment(instant: string, timeZone: string): { day: string; minute: number } | null {
	const parsed = Date.parse(instant);
	if (Number.isNaN(parsed)) return null;
	const { hour, minute } = readZonedParts(parsed, timeZone);
	return { day: zonedDay(parsed, timeZone), minute: hour * 60 + minute };
}

function dayOf(
	instant: string,
	timeZone: string,
	locale: SupportedLocale,
	format: CalendarDayFormat
): { day: string; time: string } | null {
	const moment = officeMoment(instant, timeZone);
	if (!moment) return null;
	const day = formatCalendarDay(moment.day, locale, format);
	const time = formatClock(moment.minute);
	return day && time ? { day, time } : null;
}

/**
 * The dot between a day and its time when they share a line (`common_day_time_date`'s, the same in both languages): the
 * card and the 51's head join their two parts with it from 744 (record §6.1).
 */
export const APPOINTMENT_DAY_TIME_SEPARATOR = ' · ';

/**
 * «Πέμπτη 12 Νοεμβρίου» and «12:30» as two parts (screen 50's card, 51's head, 52's «Ήταν / Νέα ώρα»): below 744 they
 * stack, from 744 they read «day · time» — never a dot left hanging (record §6.1).
 */
export function appointmentDayTime(
	instant: string,
	locale: SupportedLocale,
	timeZone: string
): { day: string; time: string } | null {
	return dayOf(instant, timeZone, locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** «Πέμπτη 12 Νοεμβρίου · 12:30» in one line (`common_day_time_date`); empty for a non-instant. */
export function appointmentDayTimeLabel(
	instant: string,
	locale: SupportedLocale,
	timeZone: string
): string {
	const parts = appointmentDayTime(instant, locale, timeZone);
	return parts ? m.common_day_time_date({ date: parts.day, time: parts.time }, { locale }) : '';
}

/**
 * «Πέμ 12 Νοε · 11:00»: an instant told in passing (the hour the doctor moved, a request's deadline, when it was
 * canceled, the hour inside the cutoff, record §7.2); empty for a non-instant.
 */
export function appointmentShortWhenLabel(
	instant: string,
	locale: SupportedLocale,
	timeZone: string
): string {
	const parts = dayOf(instant, timeZone, locale, {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});
	return parts ? m.common_day_time_date({ date: parts.day, time: parts.time }, { locale }) : '';
}

/**
 * «Τετάρτη 11 Νοεμβρίου, 12:30»: a deadline (U-135.6 «Δηλαδή έως …», screen 53's «Έως …», screen 31's request), the
 * way the email says it; empty for a non-instant.
 */
export function appointmentDeadlineLabel(
	instant: string,
	locale: SupportedLocale,
	timeZone: string
): string {
	const parts = appointmentDayTime(instant, locale, timeZone);
	return parts ? `${parts.day}, ${parts.time}` : '';
}

/** «21 Δεκεμβρίου 2026»: a date of the patient's (the rating's last day, the review's day); empty for a non-instant. */
export function appointmentDateLabel(
	instant: string,
	locale: SupportedLocale,
	timeZone: string
): string {
	const moment = officeMoment(instant, timeZone);
	return moment
		? (formatCalendarDay(moment.day, locale, { day: 'numeric', month: 'long', year: 'numeric' }) ??
				'')
		: '';
}

/** «Οκτώβριος 2026»: the month the history groups a visit under, on the office's calendar; empty for a non-instant. */
export function appointmentMonthLabel(
	instant: string,
	locale: SupportedLocale,
	timeZone: string
): string {
	const moment = officeMoment(instant, timeZone);
	return moment
		? (formatCalendarDay(`${moment.day.slice(0, 7)}-01`, locale, {
				month: 'long',
				year: 'numeric'
			}) ?? '')
		: '';
}

/** The office-calendar month (`YYYY-MM`) of an instant, the history's group, `null` for a non-instant. */
export function appointmentMonthKey(instant: string, timeZone: string): string | null {
	return officeMoment(instant, timeZone)?.day.slice(0, 7) ?? null;
}

/**
 * How many office-calendar days from the server's «now» (D-118) to the appointment's day: 0 today, 1 tomorrow; `null`
 * for a non-instant or a day already past.
 */
export function appointmentDaysAway(instant: string, now: number, timeZone: string): number | null {
	const moment = officeMoment(instant, timeZone);
	if (!moment || !Number.isFinite(now)) return null;
	const today = Date.parse(`${zonedDay(now, timeZone)}T00:00:00Z`);
	const days = Math.round((Date.parse(`${moment.day}T00:00:00Z`) - today) / DAY_IN_MS);
	return days >= 0 ? days : null;
}

/**
 * «Σήμερα» / «Αύριο» / «Σε {count} ημέρες» (screen 50's «Επόμενο ραντεβού · …», 51's head, P-A4 §4): the appointment's
 * day on its office's calendar against the server's «now»; `null` for a day already past.
 */
export function appointmentRelativeDayLabel(
	instant: string,
	now: number,
	locale: SupportedLocale,
	timeZone: string
): string | null {
	const days = appointmentDaysAway(instant, now, timeZone);
	if (days === null) return null;
	const options = { locale };
	if (days === 0) return m.appointments_relative_today({}, options);
	if (days === 1) return m.appointments_relative_tomorrow({}, options);
	return m.appointments_relative_in_days({ count: days }, options);
}

/** «Διάρκεια 30 λεπτά»; `null` without a length (`appointments_detail_duration`). */
export function appointmentDurationLabel(
	minutes: number | null,
	locale: SupportedLocale
): string | null {
	return minutes !== null && Number.isFinite(minutes) && minutes > 0
		? m.appointments_detail_duration({ minutes }, { locale })
		: null;
}
