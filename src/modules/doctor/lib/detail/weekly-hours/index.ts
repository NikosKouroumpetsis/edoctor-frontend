import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorOfficeWeeklyHoursFacts, DoctorWeekday } from '$modules/doctor/api/profile';

/** Monday first; the days' index is also the offset from `REFERENCE_MONDAY`. */
const WEEK: readonly DoctorWeekday[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday'
];

/** A Monday, at noon in UTC: only to ask `Intl` for the days' names. */
const REFERENCE_MONDAY = Date.UTC(2024, 0, 1, 12);
const DAY_MS = 86_400_000;

export type DoctorWeeklyHoursRow = {
	id: string;
	/** «Δευ–Παρ», «Δευ, Τετ». */
	days: string;
	/** «09:00–14:00», one per range; none for closed days. */
	ranges: string[];
	today: boolean;
};

function shortDayName(index: number, locale: SupportedLocale): string {
	return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
		REFERENCE_MONDAY + index * DAY_MS
	);
}

const clock = (minute: number) =>
	`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

/** The day of the week now in the office's time zone; the platform's when the answer names an unknown zone. */
function weekdayAt(now: number, timeZone: string): DoctorWeekday {
	const read = (zone: string) =>
		new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: zone }).format(now);
	let name: string;
	try {
		name = read(timeZone);
	} catch {
		name = read(PLATFORM_TIME_ZONE);
	}
	return name.toLowerCase() as DoctorWeekday;
}

/** «Δευ–Παρ» for neighbours, «Δευ, Τετ» otherwise (the days' indexes, in order). */
function daysLabel(indexes: number[], locale: SupportedLocale): string {
	const runs: number[][] = [];
	for (const index of indexes) {
		const run = runs.at(-1);
		if (run && run.at(-1) === index - 1) run.push(index);
		else runs.push([index]);
	}
	return runs
		.map((run) => {
			const first = shortDayName(run[0], locale);
			return run.length === 1 ? first : `${first}–${shortDayName(run[run.length - 1], locale)}`;
		})
		.join(', ');
}

/**
 * 🔴 U-68.1 Π5 (app = web): the raw week as lines of days with the same hours: in the week's order, the closed days
 * last (a day the answer leaves out is a closed one too), and the line of today marked on the office's own clock
 * (D-118: `now` is the server's).
 */
export function buildDoctorWeeklyHours(
	facts: DoctorOfficeWeeklyHoursFacts,
	locale: SupportedLocale,
	now: number
): DoctorWeeklyHoursRow[] {
	const today = weekdayAt(now, facts.timezone);
	const groups = new Map<string, { ranges: string[]; days: number[] }>();
	WEEK.forEach((day, index) => {
		const ranges = (facts.days.find((entry) => entry.day === day)?.ranges ?? []).map(
			(range) => `${clock(range.startMinute)}–${clock(range.endMinute)}`
		);
		const key = ranges.join('|');
		const group = groups.get(key);
		if (group) group.days.push(index);
		else groups.set(key, { ranges, days: [index] });
	});
	const ordered = [...groups.values()].sort(
		(a, b) => Number(a.ranges.length === 0) - Number(b.ranges.length === 0)
	);
	return ordered.map((group) => ({
		id: group.days.join('-'),
		days: daysLabel(group.days, locale),
		ranges: group.ranges,
		today: group.days.some((index) => WEEK[index] === today)
	}));
}
