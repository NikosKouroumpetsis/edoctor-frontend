import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/*
 * Wave 5.1 · D-W51-27: how far an instant still is, «σε 20 λεπτά» (screen 66's next visit of the day, the application's
 * `relativeMinutesLabel`): whole minutes rounded UP, so a moment still ahead never reads «σε 0 λεπτά».
 */

const MINUTE_IN_MS = 60_000;

/** Whole minutes from `now` to `instant` (rounded up), or `null` for a non-instant or a moment already reached. */
export function minutesUntil(instant: string | number, now: number): number | null {
	const at = typeof instant === 'number' ? instant : Date.parse(instant);
	if (!Number.isFinite(at) || !Number.isFinite(now) || at <= now) return null;
	return Math.ceil((at - now) / MINUTE_IN_MS);
}

/**
 * «σε {n} λεπτά» («in {n} minutes») while the instant is at most `withinMinutes` ahead (60 by default); `null` once it is
 * further, reached, or no instant.
 */
export function inMinutesLabel(
	instant: string | number,
	now: number,
	locale: SupportedLocale,
	withinMinutes = 60
): string | null {
	const minutes = minutesUntil(instant, now);
	if (minutes === null || minutes > withinMinutes) return null;
	return minutes === 1
		? m.relative_time_in_minutes_one({ count: minutes }, { locale })
		: m.relative_time_in_minutes_other({ count: minutes }, { locale });
}

const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;

/**
 * Wave 5.1 · D-W51-38 (screen 68's head, «Σε 5 ώρες · Διάρκεια 30 λεπτά»): how near an instant is, within a day either
 * way — ahead «Σε 20 λεπτά» (minutes rounded UP, never «Σε 0») and «Σε 5 ώρες» (hours rounded to the nearest, never 0),
 * behind «Πριν από 10 λεπτά» / «Πριν από 2 ώρες». `null` a day or more away (the caller says the day), at the very
 * instant, or for no instant.
 */
export function withinDayLabel(
	instant: string | number,
	now: number,
	locale: SupportedLocale
): string | null {
	const at = typeof instant === 'number' ? instant : Date.parse(instant);
	if (!Number.isFinite(at) || !Number.isFinite(now) || at === now) return null;
	const span = Math.abs(at - now);
	if (span >= DAY_IN_MS) return null;
	const options = { locale };
	if (at > now) {
		if (span <= HOUR_IN_MS - MINUTE_IN_MS / 2) {
			const minutes = Math.ceil(span / MINUTE_IN_MS);
			return minutes === 1
				? m.relative_time_head_in_minutes_one({ count: minutes }, options)
				: m.relative_time_head_in_minutes_other({ count: minutes }, options);
		}
		const hours = Math.max(1, Math.round(span / HOUR_IN_MS));
		return hours === 1
			? m.relative_time_head_in_hours_one({ count: hours }, options)
			: m.relative_time_head_in_hours_other({ count: hours }, options);
	}
	if (span < HOUR_IN_MS) {
		const minutes = Math.max(1, Math.floor(span / MINUTE_IN_MS));
		return minutes === 1
			? m.relative_time_head_ago_minutes_one({ count: minutes }, options)
			: m.relative_time_head_ago_minutes_other({ count: minutes }, options);
	}
	const hours = Math.floor(span / HOUR_IN_MS);
	return hours === 1
		? m.relative_time_head_ago_hours_one({ count: hours }, options)
		: m.relative_time_head_ago_hours_other({ count: hours }, options);
}
