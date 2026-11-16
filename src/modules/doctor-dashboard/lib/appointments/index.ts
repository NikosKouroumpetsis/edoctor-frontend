import { m } from '$paraglide/messages.js';
import { appointmentMonthKey, appointmentMonthLabel } from '$shared/lib/appointment-when';
import { isClosedAppointment } from '$shared/lib/appointment-status';
import { zonedDay } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	AppointmentStatus,
	DoctorAppointmentFacts
} from '$modules/doctor-dashboard/api/appointments';
import { doctorUpcomingDayLabel, officeDayOffset } from '$modules/doctor-dashboard/lib/today';

/*
 * Wave 5.1 · screen 67 «Ραντεβού» (D-W51-29, `64-switch/sw.js:296-353`): the book's rules as pure functions — what each
 * pill holds and how it is grouped. Every hour on the office's clock; «now» is the server's (D-118).
 */

/** The states still ahead of the doctor (the server's open set). */
const OPEN: readonly AppointmentStatus[] = ['pending', 'booked', 'checked_in'];

const at = (instant: string | null) => (instant === null ? Number.NaN : Date.parse(instant));

/** 🔴 D-W51-23: a request whose deadline was reached is no request any more (the worker closes it). */
const isDue = (item: DoctorAppointmentFacts, now: number) =>
	item.status === 'pending' && Number.isFinite(at(item.expiresAt)) && at(item.expiresAt) <= now;

/** Each appointment once, the first read that named it. */
function once(items: readonly DoctorAppointmentFacts[]): DoctorAppointmentFacts[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		if (seen.has(item.id)) return false;
		seen.add(item.id);
		return true;
	});
}

/**
 * 🔴 D-W51-29 «Αιτήματα»: every request still waiting for the doctor, whatever its day — the one that expires first,
 * first (one with no deadline last, then by its hour); a deadline reached leaves the list (D-W51-23).
 */
export function doctorWaitingRequests(
	items: readonly DoctorAppointmentFacts[],
	now: number
): DoctorAppointmentFacts[] {
	const expiry = (item: DoctorAppointmentFacts) =>
		Number.isFinite(at(item.expiresAt)) ? at(item.expiresAt) : Infinity;
	return once(items.filter((item) => item.status === 'pending' && !isDue(item, now))).sort(
		(a, b) => expiry(a) - expiry(b) || at(a.startTime) - at(b.startTime)
	);
}

/** One day of «Επερχόμενα»: its office-calendar day, whether it is today, its heading and its visits by the hour. */
export type DoctorAheadDay = {
	day: string;
	today: boolean;
	label: string;
	items: DoctorAppointmentFacts[];
};

/**
 * 🔴 D-W51-29 «Επερχόμενα»: from now on — today's still ahead (`scope=today`, `startTime > now`) under «Σήμερα», then
 * each day from tomorrow (`scope=upcoming`, «Δευτέρα 16 Νοεμβρίου») — the requests among them («Αίτημα»), a request
 * past its deadline none; each appointment once, each day by the hour.
 */
export function groupDoctorAhead(input: {
	today: readonly DoctorAppointmentFacts[];
	upcoming: readonly DoctorAppointmentFacts[];
	now: number;
	locale: SupportedLocale;
}): DoctorAheadDay[] {
	const { now, locale } = input;
	const ahead = once([...input.today, ...input.upcoming])
		.filter((item) => OPEN.includes(item.status) && at(item.startTime) > now && !isDue(item, now))
		.sort((a, b) => at(a.startTime) - at(b.startTime));
	const days = new Map<string, DoctorAheadDay>();
	for (const item of ahead) {
		const day = zonedDay(at(item.startTime), item.officeTimeZone);
		const entry = days.get(day);
		if (entry) {
			entry.items.push(item);
			continue;
		}
		const today = officeDayOffset(item.startTime, now, item.officeTimeZone) === 0;
		days.set(day, {
			day,
			today,
			label: today
				? m.doctor_appointments_day_today({}, { locale })
				: doctorUpcomingDayLabel(day, locale),
			items: [item]
		});
	}
	return [...days.values()];
}

/**
 * 🔴 D-W51-29 «Ιστορικό»: only what is closed — the server's history holds the open visits of the days before too,
 * which are «Τι έγινε» of screen 66 — each once, in the order read (newest first).
 */
export function doctorHistoryRows(
	items: readonly DoctorAppointmentFacts[]
): DoctorAppointmentFacts[] {
	return once(items.filter((item) => isClosedAppointment(item.status)));
}

/** One month of «Ιστορικό»: its office-calendar month, its heading («Οκτώβριος 2026») and its visits as read. */
export type DoctorHistoryMonth = { month: string; label: string; items: DoctorAppointmentFacts[] };

/**
 * «Ιστορικό» by the office's month, in the order read (screen 50's way, D-W51-29): a month split between two pages keeps
 * one heading; a row with no month is left out (it has no hour to show either).
 */
export function groupDoctorHistory(
	rows: readonly DoctorAppointmentFacts[],
	locale: SupportedLocale
): DoctorHistoryMonth[] {
	const months: DoctorHistoryMonth[] = [];
	for (const item of rows) {
		const month = appointmentMonthKey(item.startTime, item.officeTimeZone);
		if (!month) continue;
		const known = months.find((entry) => entry.month === month);
		if (known) {
			known.items.push(item);
			continue;
		}
		months.push({
			month,
			label: appointmentMonthLabel(item.startTime, locale, item.officeTimeZone),
			items: [item]
		});
	}
	return months;
}

/** The office's line in the page's language («Κηφισίας 120»), else its first one. */
export function doctorOfficeLine(
	office: { lines: readonly { language: string; line: string }[] },
	locale: SupportedLocale
): string {
	return (
		office.lines.find((entry) => entry.language === locale)?.line ?? office.lines[0]?.line ?? ''
	);
}
