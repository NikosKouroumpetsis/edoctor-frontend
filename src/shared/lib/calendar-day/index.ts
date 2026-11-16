const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/u;

/** What of a day to print (any `Intl` date option but the zone: a day has none). */
export type CalendarDayFormat = Omit<Intl.DateTimeFormatOptions, 'timeZone'>;

/** A calendar day `YYYY-MM-DD` at UTC midnight, or `null` for one the calendar lacks (`2026-02-31` never rolls). */
function readCalendarDay(day: string): Date | null {
	const match = CALENDAR_DAY.exec(day.trim());
	if (!match) return null;
	const [, year, month, date] = match;
	const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(date)));
	if (parsed.getUTCDate() !== Number(date) || parsed.getUTCMonth() !== Number(month) - 1)
		return null;
	return parsed;
}

/**
 * A calendar day `YYYY-MM-DD` in the language, read and printed at UTC midnight (a day has no zone); `null` for a
 * day the calendar does not have (the application's `shared/lib/calendar-day` `formatCalendarDay`).
 */
export function formatCalendarDay(
	day: string,
	language: string,
	format: CalendarDayFormat
): string | null {
	const parsed = readCalendarDay(day);
	return parsed ? parsed.toLocaleDateString(language, { ...format, timeZone: 'UTC' }) : null;
}

/**
 * The same day as `formatCalendarDay` prints it, in its `Intl` parts (day, month, the literals between them), for a
 * caller that composes a range of days (the search's «28 – 30 Οκτ»); `[]` for a day the calendar lacks. The
 * application's name and signature (U-29.3, app = web).
 */
export function formatCalendarDayParts(
	day: string,
	language: string,
	options: CalendarDayFormat
): Intl.DateTimeFormatPart[] {
	const parsed = readCalendarDay(day);
	return parsed
		? new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' }).formatToParts(parsed)
		: [];
}

/** A day card of a strip of days: «Πέμ 30» over «Οκτ», and «Πέμ 30 Οκτ» as its whole name. */
export type CalendarDayStripLabels = { weekdayDay: string; month: string; accessible: string };

/**
 * One day of a strip of days in the language, weekday first in both languages (the application's join): the card's two
 * lines and its name for assistive tech; empty words for a day the calendar lacks. Shared by every strip that offers
 * days (the profile's availability, the doctor's «Αλλαγή ώρας»).
 */
export function calendarDayStripLabels(day: string, language: string): CalendarDayStripLabels {
	const weekday = formatCalendarDay(day, language, { weekday: 'short' });
	const date = formatCalendarDay(day, language, { day: 'numeric' });
	const weekdayDay = weekday && date ? `${weekday} ${date}` : '';
	const month = formatCalendarDay(day, language, { month: 'short' }) ?? '';
	return { weekdayDay, month, accessible: weekdayDay && month ? `${weekdayDay} ${month}` : '' };
}

const CALENDAR_DAY_IN_MS = 86_400_000;

/** The calendar day `days` after `day` (`YYYY-MM-DD`), or `null` for a day the calendar lacks. */
export function addCalendarDays(day: string, days: number): string | null {
	const parsed = readCalendarDay(day);
	if (!parsed || !Number.isInteger(days)) return null;
	return new Date(parsed.getTime() + days * CALENDAR_DAY_IN_MS).toISOString().slice(0, 10);
}
