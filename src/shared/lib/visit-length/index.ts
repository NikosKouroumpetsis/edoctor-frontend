import { m } from '$paraglide/messages.js';

type Locale = 'el' | 'en';

/**
 * 🔴 D-W52-10 (U-212.4, U-213.1): the visit lengths in minutes a doctor picks from — 15, 20, then every quarter up to two
 * hours — ONE list for the sign-up's first service (39) and for every service of «Υπηρεσίες και τιμές» (83); the
 * server's own `DOCTOR_SERVICE_VISIT_DURATIONS` (guarded by `tests/architecture/service-rules.test.ts`).
 */
export const VISIT_LENGTHS = [15, 20, 30, 45, 60, 75, 90, 105, 120] as const;

export type VisitLength = (typeof VISIT_LENGTHS)[number];

/** Whether `minutes` is one of the list (a stored length of before the list may be another). */
export function isVisitLength(minutes: unknown): minutes is VisitLength {
	return (VISIT_LENGTHS as readonly unknown[]).includes(minutes);
}

/**
 * 🔴 D-W52-10 (U-212.4, `64-switch/sw.js` `durLong` / `durShort`): a visit's length as the page writes it — under an
 * hour in minutes, from one hour in hours: `long` «45 λεπτά», «1 ώρα», «1 ώρα και 30 λεπτά», «2 ώρες»; `short` (a row's
 * line) «45′», «1 ώρα», «1 ώρα 30′», «2 ώρες». A length that is no whole positive number of minutes is `''`.
 */
export function formatVisitLength(
	minutes: number,
	locale: Locale,
	form: 'long' | 'short' = 'long'
): string {
	if (!Number.isInteger(minutes) || minutes <= 0) return '';
	const options = { locale };
	if (minutes < 60) {
		return form === 'long'
			? m.visit_length_minutes({ minutes }, options)
			: m.visit_length_short_minutes({ minutes }, options);
	}
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	if (rest === 0) {
		return hours === 1
			? m.visit_length_hour({}, options)
			: m.visit_length_hours({ hours }, options);
	}
	const parts = { hours, minutes: rest };
	if (form === 'short') {
		return hours === 1
			? m.visit_length_short_hour_minutes(parts, options)
			: m.visit_length_short_hours_minutes(parts, options);
	}
	return hours === 1
		? m.visit_length_hour_minutes(parts, options)
		: m.visit_length_hours_minutes(parts, options);
}
