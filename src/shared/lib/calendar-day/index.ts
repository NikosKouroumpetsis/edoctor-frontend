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
