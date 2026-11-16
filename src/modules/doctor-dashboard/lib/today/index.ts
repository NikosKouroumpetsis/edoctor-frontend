import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { formatCalendarDay } from '$shared/lib/calendar-day';
import {
	appointmentDayTime,
	appointmentDeadlineLabel,
	APPOINTMENT_DAY_TIME_SEPARATOR
} from '$shared/lib/appointment-when';
import {
	doctorAppointmentStatusPill,
	type AppointmentStatusPill
} from '$shared/lib/appointment-status';
import { readZonedParts, zonedDay } from '$shared/lib/format';
import { inMinutesLabel } from '$shared/lib/relative-time';
import { bookerWordLabel } from '$shared/lib/relative-words';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	AppointmentStatus,
	DoctorAppointmentFacts,
	DoctorAppointmentOutcome
} from '$modules/doctor-dashboard/api/appointments';
import type { DoctorReadinessBlockerCode } from '$modules/doctor-dashboard/api/readiness';

/*
 * Wave 5.1 · screen 66 «Σήμερα» (D-W51-22 … 27, `64-switch/sw.js:224-291`): the page's rules as pure functions — which
 * group an appointment belongs to, when «Σήμερα» is empty or not ready, and every card's words. Every hour on the
 * office's clock; «today» is the server's (D-118), never the device's.
 */

const DAY_IN_MS = 86_400_000;

/** The states that still ask something of the doctor (the server's open set). */
const OPEN: readonly AppointmentStatus[] = ['booked', 'checked_in'];
/** The states that make «Ολοκληρώθηκαν σήμερα» — never `rejected` / `expired` / `unavailable`: no visit ever was. */
const CLOSED_TODAY: readonly AppointmentStatus[] = ['completed', 'no_show', 'canceled'];
/** 🔴 D-W51-22 (4): the blockers that mean «Δεν δέχεστε ακόμη ραντεβού». */
const NOT_TAKING: readonly DoctorReadinessBlockerCode[] = [
	'NO_ENABLED_AVAILABILITY',
	'APPOINTMENTS_DISABLED',
	'APPOINTMENT_INTENT_MISSING'
];
/** D-W51-25: the one-tap answers of «Τι έγινε με την επίσκεψη;», in the owner's order (U-190.1). */
const ONE_TAP_OUTCOMES: readonly DoctorAppointmentOutcome[] = ['NO_SHOW', 'COMPLETED'];

const at = (instant: string | null) => (instant === null ? Number.NaN : Date.parse(instant));

/** The office-calendar day of an instant (`YYYY-MM-DD`). */
const officeDay = (instant: string, timeZone: string) => zonedDay(Date.parse(instant), timeZone);

/** How many office-calendar days from the server's «now» to the instant's day: 0 today, -1 yesterday, 1 tomorrow. */
export function officeDayOffset(instant: string, now: number, timeZone: string): number | null {
	const when = Date.parse(instant);
	if (!Number.isFinite(when) || !Number.isFinite(now)) return null;
	const day = Date.parse(`${zonedDay(when, timeZone)}T00:00:00Z`);
	const today = Date.parse(`${zonedDay(now, timeZone)}T00:00:00Z`);
	return Math.round((day - today) / DAY_IN_MS);
}

/** The instant a calendar day starts in a zone (its midnight there, summer or winter time alike). */
export function zonedDayStart(day: string, timeZone: string): number {
	const guess = Date.parse(`${day}T00:00:00Z`);
	let start = guess;
	// Twice: the second pass settles a midnight that a change of the clocks moved.
	for (let pass = 0; pass < 2; pass += 1) {
		const { year, month, day: date, hour, minute } = readZonedParts(start, timeZone);
		const shown = Date.UTC(year, month - 1, date, hour, minute);
		start -= shown - guess;
	}
	return start;
}

/**
 * 🔴 D-W51-22 (2): yesterday 00:00 and the end of today on the platform's clock (the server's «now»), both ends kept by
 * the server (`startTime` between them) — the end is the last millisecond before tomorrow, never tomorrow's midnight.
 */
export function doctorDayWindow(now: number): { from: string; to: string } {
	const yesterday = zonedDay(now, PLATFORM_TIME_ZONE, -1);
	const tomorrow = zonedDay(now, PLATFORM_TIME_ZONE, 1);
	return {
		from: new Date(zonedDayStart(yesterday, PLATFORM_TIME_ZONE)).toISOString(),
		to: new Date(zonedDayStart(tomorrow, PLATFORM_TIME_ZONE) - 1).toISOString()
	};
}

/** The groups of «Σήμερα», in the page's order. */
export type DoctorTodayGroups = {
	requests: DoctorAppointmentFacts[];
	outcome: DoctorAppointmentFacts[];
	next: DoctorAppointmentFacts[];
	done: DoctorAppointmentFacts[];
};

/**
 * 🔴 D-W51-22 · D-W51-23: the reads split into «Σήμερα»'s groups, EACH APPOINTMENT ONCE (the first group that asks for
 * it): the requests whose answer is still due (the one that expires first, first — one expired while the page looks is
 * gone); «Τι έγινε με την επίσκεψη;» the begun ones the server lets the doctor answer (the latest first); «Επόμενα
 * σήμερα» the kept ones still ahead today; «Ολοκληρώθηκαν σήμερα» today's completed, missed and canceled.
 */
export function splitDoctorToday(input: {
	requests: readonly DoctorAppointmentFacts[];
	day: readonly DoctorAppointmentFacts[];
	now: number;
}): DoctorTodayGroups {
	const { now } = input;
	const seen = new Set<string>();
	const once = (list: DoctorAppointmentFacts[]) =>
		list.filter((item) => {
			if (seen.has(item.id)) return false;
			seen.add(item.id);
			return true;
		});
	const isToday = (item: DoctorAppointmentFacts) =>
		officeDayOffset(item.startTime, now, item.officeTimeZone) === 0;
	const byStart = (a: DoctorAppointmentFacts, b: DoctorAppointmentFacts) =>
		at(a.startTime) - at(b.startTime);
	const byExpiry = (a: DoctorAppointmentFacts, b: DoctorAppointmentFacts) =>
		(Number.isFinite(at(a.expiresAt)) ? at(a.expiresAt) : Infinity) -
			(Number.isFinite(at(b.expiresAt)) ? at(b.expiresAt) : Infinity) || byStart(a, b);

	const requests = once(
		input.requests
			.filter(
				(item) =>
					item.status === 'pending' &&
					!(Number.isFinite(at(item.expiresAt)) && at(item.expiresAt) <= now)
			)
			.sort(byExpiry)
	);
	// A request of the day's read is a request: never again under another group (D-W51-22 «μία φορά»).
	for (const item of input.day) if (item.status === 'pending') seen.add(item.id);
	const outcome = once(
		input.day
			.filter(
				(item) =>
					OPEN.includes(item.status) &&
					at(item.startTime) <= now &&
					item.actions.outcomes.some((answer) => ONE_TAP_OUTCOMES.includes(answer))
			)
			.sort((a, b) => byStart(b, a))
	);
	const next = once(
		input.day
			.filter((item) => OPEN.includes(item.status) && at(item.startTime) > now && isToday(item))
			.sort(byStart)
	);
	const done = once(
		input.day.filter((item) => CLOSED_TODAY.includes(item.status) && isToday(item)).sort(byStart)
	);
	return { requests, outcome, next, done };
}

/** «Επερχόμενα»: from tomorrow on, grouped by the office's day, each day's visits by their hour. */
export function groupDoctorUpcoming(
	items: readonly DoctorAppointmentFacts[],
	now: number
): { day: string; items: DoctorAppointmentFacts[] }[] {
	const days = new Map<string, DoctorAppointmentFacts[]>();
	const sorted = [...items]
		.filter((item) => (officeDayOffset(item.startTime, now, item.officeTimeZone) ?? 0) >= 1)
		.sort((a, b) => at(a.startTime) - at(b.startTime));
	for (const item of sorted) {
		const day = officeDay(item.startTime, item.officeTimeZone);
		days.set(day, [...(days.get(day) ?? []), item]);
	}
	return [...days.entries()].map(([day, list]) => ({ day, items: list }));
}

/** Whether «Σήμερα» has nothing in any of its four groups. */
export function isDoctorTodayEmpty(groups: DoctorTodayGroups): boolean {
	return Object.values(groups).every((list) => list.length === 0);
}

/**
 * 🔴 D-W51-22 (4): «Δεν δέχεστε ακόμη ραντεβού» only when there is no appointment at all — today nor from tomorrow —
 * and the readiness names one of its three blockers.
 */
export function isDoctorNotTaking(input: {
	groups: DoctorTodayGroups;
	upcoming: readonly DoctorAppointmentFacts[];
	blockers: readonly string[];
}): boolean {
	return (
		isDoctorTodayEmpty(input.groups) &&
		input.upcoming.length === 0 &&
		input.blockers.some((code) => (NOT_TAKING as readonly string[]).includes(code))
	);
}

/** 🔴 D-W51-23: the earliest deadline still ahead among the requests shown, the instant the page looks again. */
export function nextDoctorRequestExpiry(
	requests: readonly DoctorAppointmentFacts[],
	now: number
): number | null {
	const ahead = requests.map((item) => at(item.expiresAt)).filter((when) => when > now);
	return ahead.length > 0 ? Math.min(...ahead) : null;
}

/**
 * The answers a card offers (D-W51-21: the server's `actions`, never a guess of ours): a request's «Απόρριψη» (screen
 * 69, D-W51-49), «Αλλαγή» (screen 70, D-W51-51) and «Επιβεβαίωση», a visit begun's «Δεν ήρθε · Ολοκληρώθηκε».
 */
export type DoctorTodayCardActions = {
	reject: boolean;
	move: boolean;
	confirm: boolean;
	outcomes: DoctorAppointmentOutcome[];
};

/** One card of «Σήμερα» / «Επερχόμενα», its words ready for the shared `VisitCard`. */
export type DoctorTodayCard = {
	id: string;
	when: string;
	soon: string | null;
	name: string;
	meta: string | null;
	byline: string | null;
	quote: string | null;
	deadline: string | null;
	footnote: string | null;
	tag: AppointmentStatusPill | null;
	dim: boolean;
	actions: DoctorTodayCardActions;
};

/**
 * Where a card stands: one of «Σήμερα»'s groups, «Επερχόμενα» (66 and 67), or screen 67's «Ιστορικό» (D-W51-29).
 */
export type DoctorTodayGroup = keyof DoctorTodayGroups | 'upcoming' | 'history';

const time = (instant: string, locale: SupportedLocale, timeZone: string) =>
	appointmentDayTime(instant, locale, timeZone)?.time ?? '';

/** «Σήμερα, 17:30», «Χθες, 18:00», «Αύριο, 10:00», else «Δευτέρα 16 Νοεμβρίου, 10:00» (`sw.js:226-231`). */
function dayAndTime(instant: string, now: number, locale: SupportedLocale, timeZone: string) {
	const parts = appointmentDayTime(instant, locale, timeZone);
	if (!parts) return '';
	const options = { locale };
	const offset = officeDayOffset(instant, now, timeZone);
	if (offset === 0) return m.doctor_today_when_today({ time: parts.time }, options);
	if (offset === -1) return m.doctor_today_when_yesterday({ time: parts.time }, options);
	if (offset === 1) return m.doctor_today_when_tomorrow({ time: parts.time }, options);
	return m.doctor_today_when_date({ date: parts.day, time: parts.time }, options);
}

/** «Σάββατο 14 Νοεμβρίου, 09:00» whatever the day: a visit of «Ιστορικό» (`sw.js:311-319`). */
function dateAndTime(instant: string, locale: SupportedLocale, timeZone: string) {
	const parts = appointmentDayTime(instant, locale, timeZone);
	return parts ? m.doctor_today_when_date({ date: parts.day, time: parts.time }, { locale }) : '';
}

/** 🔴 D-W51-29: who closed it — the side that canceled a `canceled` one, that refused a `rejected` one. */
const closedByOf = (item: DoctorAppointmentFacts) =>
	item.status === 'rejected' ? item.rejectedBy : item.canceledBy;

/**
 * «Απαντήστε έως τις 16:30» for a request of today due today; «… έως σήμερα, 21:15» / «αύριο, 09:00» for one of
 * another day; else the client's deadline («Τετάρτη 11 Νοεμβρίου, 12:30»). `null` without a deadline.
 */
function replyBy(item: DoctorAppointmentFacts, now: number, locale: SupportedLocale) {
	if (!item.expiresAt) return null;
	const zone = item.officeTimeZone;
	const options = { locale };
	const offset = officeDayOffset(item.expiresAt, now, zone);
	const clock = time(item.expiresAt, locale, zone);
	if (!clock) return null;
	if (offset === 0) {
		return officeDayOffset(item.startTime, now, zone) === 0
			? m.doctor_today_reply_by_time({ time: clock }, options)
			: m.doctor_today_reply_by_today({ time: clock }, options);
	}
	if (offset === 1) return m.doctor_today_reply_by_tomorrow({ time: clock }, options);
	const date = appointmentDeadlineLabel(item.expiresAt, locale, zone);
	return date ? m.doctor_today_reply_by_date({ date }, options) : null;
}

/** «Αν δεν απαντήσετε, αύριο στις 18:00 γράφεται «Ολοκληρώθηκε».» — today or tomorrow only, else nothing. */
function unattendedLine(item: DoctorAppointmentFacts, now: number, locale: SupportedLocale) {
	if (!item.unattendedOutcomeAt) return null;
	const zone = item.officeTimeZone;
	const clock = time(item.unattendedOutcomeAt, locale, zone);
	const offset = officeDayOffset(item.unattendedOutcomeAt, now, zone);
	if (!clock) return null;
	if (offset === 0) return m.doctor_today_auto_outcome_today({ time: clock }, { locale });
	if (offset === 1) return m.doctor_today_auto_outcome_tomorrow({ time: clock }, { locale });
	return null;
}

/** «Επίσκεψη · 30 λεπτά · Κηφισίας 120»; the service alone for a visit that is over (`sw.js:238-239`). */
function metaOf(item: DoctorAppointmentFacts, locale: SupportedLocale, short: boolean) {
	const minutes = item.service?.durationInMinutes;
	const office =
		item.office?.translated.find((entry) => entry.language === locale)?.line ??
		item.office?.line ??
		null;
	const parts = short
		? [item.service?.title ?? null]
		: [
				item.service?.title ?? null,
				minutes && minutes > 0 ? m.doctor_today_minutes({ minutes }, { locale }) : null,
				office
			];
	return parts.filter(Boolean).join(APPOINTMENT_DAY_TIME_SEPARATOR) || null;
}

/**
 * The card of one appointment in its group (`sw.js:253-268`, D-W51-27): the visitor is the relative when it is for one,
 * and «Το έκλεισε: {όνομα} ({σχέση})» names the account holder by the relationship turned around; the note in the
 * language's quotes; the deadline on a request, the system's outcome on a visit begun, «σε {n} λεπτά» on the first of
 * the day's next (`soon`), the state's pill over and from tomorrow, fainter when over. 🔴 Screen 67's «Ιστορικό»
 * (D-W51-29): the whole date and the hour, the service, its length and the office, fainter, the state as the doctor reads
 * it — who canceled or refused it, «Έληξε χωρίς απάντηση». 🔴 D-W51-71 (step 8): a patient without an account (the
 * doctor's record) reads «Χωρίς λογαριασμό eDoctor» in the byline's place (a record is never booked for a relative).
 */
export function buildDoctorTodayCard(input: {
	appointment: DoctorAppointmentFacts;
	group: DoctorTodayGroup;
	now: number;
	locale: SupportedLocale;
	soon?: boolean;
}): DoctorTodayCard {
	const { appointment: item, group, now, locale } = input;
	const options = { locale };
	const zone = item.officeTimeZone;
	const relative = item.relative;
	const name = (relative ? relative.name : item.patientName) ?? '';
	const word = relative ? bookerWordLabel(relative.relationship, locale) : '';
	const byline =
		item.patientKind === 'RECORD'
			? m.doctor_new_no_account({}, options)
			: relative && item.patientName
				? word
					? m.doctor_today_booked_by({ name: item.patientName, word }, options)
					: m.doctor_today_booked_by_name({ name: item.patientName }, options)
				: null;
	const withDay = group === 'requests' || group === 'outcome';
	return {
		id: item.id,
		when:
			group === 'history'
				? dateAndTime(item.startTime, locale, zone)
				: withDay
					? dayAndTime(item.startTime, now, locale, zone)
					: time(item.startTime, locale, zone),
		soon: group === 'next' && input.soon ? inMinutesLabel(item.startTime, now, locale) : null,
		name,
		meta: metaOf(item, locale, group === 'done'),
		byline,
		quote:
			group === 'requests' && item.patientNote
				? m.doctor_today_quote({ note: item.patientNote }, options)
				: null,
		deadline: group === 'requests' ? replyBy(item, now, locale) : null,
		footnote: group === 'outcome' ? unattendedLine(item, now, locale) : null,
		tag:
			group === 'done' || group === 'upcoming' || group === 'history'
				? doctorAppointmentStatusPill(item.status, closedByOf(item), locale)
				: null,
		dim: group === 'done' || group === 'history',
		actions: {
			reject: group === 'requests' && item.actions.canReject,
			move: group === 'requests' && item.actions.canReschedule,
			confirm: group === 'requests' && item.actions.canConfirm,
			outcomes:
				group === 'outcome'
					? ONE_TAP_OUTCOMES.filter((answer) => item.actions.outcomes.includes(answer))
					: []
		}
	};
}

const longDay = (day: string, locale: SupportedLocale) =>
	formatCalendarDay(day, locale, { weekday: 'long', day: 'numeric', month: 'long' }) ?? '';

/** «Σάββατο 14 Νοεμβρίου»: the server's today on the platform's calendar (under the pills). */
export function doctorTodayDateLabel(now: number, locale: SupportedLocale): string {
	return longDay(zonedDay(now, PLATFORM_TIME_ZONE), locale);
}

/** «Δευτέρα 16 Νοεμβρίου»: a day's heading of «Επερχόμενα» (`YYYY-MM-DD` of the office's calendar). */
export function doctorUpcomingDayLabel(day: string, locale: SupportedLocale): string {
	return longDay(day, locale);
}

const NEXT_ON_WEEKDAY = [
	m.doctor_today_empty_next_sunday,
	m.doctor_today_empty_next_monday,
	m.doctor_today_empty_next_tuesday,
	m.doctor_today_empty_next_wednesday,
	m.doctor_today_empty_next_thursday,
	m.doctor_today_empty_next_friday,
	m.doctor_today_empty_next_saturday
] as const;

/**
 * «Το επόμενο είναι τη Δευτέρα 16 Νοεμβρίου, στις 10:00.» (`sw.js:281`): the first of «Επερχόμενα», the weekday with its
 * own article; «… αύριο, στις 10:00.» for tomorrow; `null` with nothing ahead.
 */
export function doctorTodayNextLabel(
	upcoming: readonly DoctorAppointmentFacts[],
	now: number,
	locale: SupportedLocale
): string | null {
	const first = [...upcoming].sort((a, b) => at(a.startTime) - at(b.startTime))[0];
	if (!first) return null;
	const zone = first.officeTimeZone;
	const clock = time(first.startTime, locale, zone);
	if (!clock) return null;
	if (officeDayOffset(first.startTime, now, zone) === 1) {
		return m.doctor_today_empty_next_tomorrow({ time: clock }, { locale });
	}
	const day = officeDay(first.startTime, zone);
	const date = formatCalendarDay(day, locale, { day: 'numeric', month: 'long' });
	if (!date) return null;
	const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
	return NEXT_ON_WEEKDAY[weekday]({ date, time: clock }, { locale });
}
