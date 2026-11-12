import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { formatCalendarDay } from '$shared/lib/calendar-day';
import { formatClock, readZonedParts, zonedDay } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** «14:32» of an instant, on the platform's clock (D-118), as the copy of a conversation writes it. */
export function messageClock(instant: number): string {
	const { hour, minute } = readZonedParts(instant, PLATFORM_TIME_ZONE);
	return formatClock(hour * 60 + minute) ?? '';
}

/** The day of an instant, to tell two messages' days apart. */
export function messageDay(instant: number): string {
	return zonedDay(instant, PLATFORM_TIME_ZONE);
}

/**
 * U-84.5: the copy's fixed name, by the day it is taken (`messageDay`): a date, never a person. It stayed with the
 * messages when the file's hand-over moved to `$shared/lib/save-file` (D-W4-30).
 */
export function conversationCopyName(day: string): string {
	return `edoctor-messages-${day}.txt`;
}

/** How many days ago `instant` was, on the platform's calendar; only 0 to 6, `null` further. */
function daysAgo(instant: number, now: number): number | null {
	const day = messageDay(instant);
	for (let back = 0; back < 7; back++) {
		if (day === zonedDay(now, PLATFORM_TIME_ZONE, -back)) return back;
	}
	return null;
}

/**
 * U-84 Π1 (as iOS and Airbnb): today the time, «Χθες», the weekday up to six days back, then the date: «30/9» in Greek,
 * «30 Sep» in English.
 */
export function conversationTimeLabel(
	instant: number,
	now: number,
	locale: SupportedLocale
): string {
	const back = daysAgo(instant, now);
	if (back === 0) return messageClock(instant);
	if (back === 1) return m.messages_yesterday({}, { locale });
	const day = messageDay(instant);
	if (back !== null) {
		return (formatCalendarDay(day, locale, { weekday: 'short' }) ?? '').replace('.', '');
	}
	const [, month, date] = day.split('-').map(Number);
	return locale === 'el'
		? `${date}/${month}`
		: (formatCalendarDay(day, locale, { day: 'numeric', month: 'short' }) ?? '');
}

/** U-84 Π2: over the messages of a day: «Σήμερα», «Χθες», «Τετάρτη 28 Οκτωβρίου» (the year when it is not this one). */
export function messageDayLabel(instant: number, now: number, locale: SupportedLocale): string {
	const back = daysAgo(instant, now);
	if (back === 0) return m.messages_today({}, { locale });
	if (back === 1) return m.messages_yesterday({}, { locale });
	const day = messageDay(instant);
	const sameYear = day.slice(0, 4) === messageDay(now).slice(0, 4);
	const label =
		formatCalendarDay(day, locale, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			...(sameYear ? {} : { year: 'numeric' })
		}) ?? '';
	return label.charAt(0).toUpperCase() + label.slice(1);
}
