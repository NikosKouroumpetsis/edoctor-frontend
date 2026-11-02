import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { formatCalendarDay } from '$shared/lib/calendar-day';
import { formatClock, readZonedParts, zonedDay } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * 🔴 The application's ONE day-and-time phrase (S-32.9, `shared/lib/format-day-time`), on the Greek clock (D-118):
 * «Σήμερα · 10:00» and «Αύριο · 10:00» on the platform's today and the next day, else «Πέμ 30 Οκτ · 10:00»
 * («Thu, Oct 30 · 10:00»). Shared since wave 1.5: the cards (`search-doctors`) and the profile (`doctor`) say it the
 * same way, and a module never imports another.
 */

/**
 * A day `YYYY-MM-DD` and a minute of it (an office's slot, told on its own calendar) by the one rule: empty for a day
 * the calendar lacks or a minute outside the day (the application's `formatDayTime`).
 */
export function formatDayTime(
	{ day, minute }: { day: string; minute: number },
	now: number,
	locale: SupportedLocale
): string {
	const time = formatClock(minute);
	const date = formatCalendarDay(day, locale, {
		day: 'numeric',
		month: 'short',
		weekday: 'short'
	});
	if (!time || !date) return '';
	if (day === zonedDay(now, PLATFORM_TIME_ZONE)) return m.day_time_today({ time }, { locale });
	if (day === zonedDay(now, PLATFORM_TIME_ZONE, 1))
		return m.day_time_tomorrow({ time }, { locale });
	return m.day_time_date({ date, time }, { locale });
}

/** An instant by the same rule, read on the platform's clock; empty for a non-instant. */
export function formatInstantDayTime(
	instant: number,
	now: number,
	locale: SupportedLocale
): string {
	if (!Number.isFinite(instant)) return '';
	const { hour, minute } = readZonedParts(instant, PLATFORM_TIME_ZONE);
	return formatDayTime(
		{ day: zonedDay(instant, PLATFORM_TIME_ZONE), minute: hour * 60 + minute },
		now,
		locale
	);
}

/**
 * 🔴 S-34.1: how long until the platform's next day begins (Greek midnight, D-118), so a surface that says
 * «Σήμερα / Αύριο» draws itself again then; at least a second, never a negative wait.
 */
export function msUntilNextPlatformDay(now: number): number {
	const { hour, minute } = readZonedParts(now, PLATFORM_TIME_ZONE);
	const intoMinute = ((now % 60_000) + 60_000) % 60_000;
	const left = ((24 - hour) * 60 - minute) * 60_000 - intoMinute;
	return Math.max(left, 1_000);
}
