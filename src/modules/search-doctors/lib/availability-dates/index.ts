import {
	formatCalendarDay,
	formatCalendarDayParts,
	type CalendarDayFormat
} from '$shared/lib/calendar-day';
import { zonedDay } from '$shared/lib/format';

/**
 * The dates under each «Πότε;» row (U-22.2): from today on the platform's clock, exactly the backend's windows
 * (`marketplace-availability-calculator`: today, today + 2, today + 6) — «Τετ 28 Οκτ» · «28 – 30 Οκτ» ·
 * «28 Οκτ – 3 Νοε»; «Οποτεδήποτε» has its words («Όλες οι ημέρες»), not dates. In the page's language through
 * Intl, a day and its month never split across two lines (no-break spaces); a window that crosses a month breaks
 * only after its dash.
 */

/** The windowed «Πότε;» values; `all` is not a window. */
export type AvailabilityWindow = 'today' | 'next3Days' | 'next7Days';

/** The last day of each window, counted from today (the backend's `addDays(today, 2 | 6)`). */
export const AVAILABILITY_WINDOW_END_OFFSET: Record<AvailabilityWindow, number> = {
	today: 0,
	next3Days: 2,
	next7Days: 6
};

const NBSP = ' ';

type DayParts = { day: string; month: string; dayFirst: boolean };

/**
 * The day as the shared `formatCalendarDay` prints it, every space of it a no-break one («28 Οκτ», «Wed, Oct 28»):
 * the application's (U-29.3, app = web).
 */
function formatUnbroken(day: string, language: string, format: CalendarDayFormat): string {
	return (formatCalendarDay(day, language, format) ?? '').replace(/\s/gu, NBSP);
}

/** A day's number and short month (`formatCalendarDayParts`), and whether the language writes the day first. */
function dayParts(day: string, language: string): DayParts {
	const parts = formatCalendarDayParts(day, language, { day: 'numeric', month: 'short' });
	const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? '';
	return {
		day: valueOf('day'),
		month: valueOf('month'),
		dayFirst:
			parts.findIndex((part) => part.type === 'day') <
			parts.findIndex((part) => part.type === 'month')
	};
}

/** «28 – 30 Οκτ» (one month, whole) or «28 Οκτ – 3 Νοε» (a break allowed only after the dash). */
function formatWindow(start: string, end: string, language: string): string {
	if (start.slice(0, 7) === end.slice(0, 7)) {
		const first = dayParts(start, language);
		const last = dayParts(end, language);
		const days = `${first.day}${NBSP}–${NBSP}${last.day}`;
		return last.dayFirst ? `${days}${NBSP}${last.month}` : `${last.month}${NBSP}${days}`;
	}
	const single = (day: string) => formatUnbroken(day, language, { day: 'numeric', month: 'short' });
	return `${single(start)}${NBSP}– ${single(end)}`;
}

/** The dates of the three windows for `now` (the server's «now», D-118) on `timeZone`, in `language`. */
export function buildAvailabilityDateLabels(
	now: number,
	language: string,
	timeZone: string
): Record<AvailabilityWindow, string> {
	const today = zonedDay(now, timeZone);
	const end = (window: AvailabilityWindow) =>
		zonedDay(now, timeZone, AVAILABILITY_WINDOW_END_OFFSET[window]);
	return {
		today: formatUnbroken(today, language, { weekday: 'short', day: 'numeric', month: 'short' }),
		next3Days: formatWindow(today, end('next3Days'), language),
		next7Days: formatWindow(today, end('next7Days'), language)
	};
}
