/**
 * Formatting of numbers, amounts, calendar days and clock times, as the application writes them
 * (`application/src/shared/lib/{format-number,format-day-time,calendar-day,zoned-time}`): pure, no locale read
 * here — the caller names the language. Dates are read on a zone the caller names (the platform's, D-118), never
 * the device's.
 */

const MINUTES_IN_DAY = 1440;
const DAY_IN_MS = 86_400_000;

/** The wall-clock reading of an instant in one zone; `month` is 1–12 and `hour` 0–23. */
export type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number };

/** The wall-clock parts an instant shows in `timeZone`, through Intl (midnight reported as 24 is 0). */
export function readZonedParts(instant: number, timeZone: string): ZonedParts {
	const formatter = new Intl.DateTimeFormat('en-US', {
		day: '2-digit',
		hour: '2-digit',
		hour12: false,
		minute: '2-digit',
		month: '2-digit',
		timeZone,
		year: 'numeric'
	});
	const parts = Object.fromEntries(
		formatter
			.formatToParts(new Date(instant))
			.flatMap((part) =>
				part.type === 'literal' ? [] : [[part.type, Number(part.value)] as const]
			)
	);
	return {
		year: parts.year ?? Number.NaN,
		month: parts.month ?? Number.NaN,
		day: parts.day ?? Number.NaN,
		hour: parts.hour === 24 ? 0 : (parts.hour ?? Number.NaN),
		minute: parts.minute ?? Number.NaN
	};
}

/** The calendar day (`YYYY-MM-DD`) of an instant in `timeZone`, `offsetDays` later. */
export function zonedDay(instant: number, timeZone: string, offsetDays = 0): string {
	const { year, month, day } = readZonedParts(instant, timeZone);
	return new Date(Date.UTC(year, month - 1, day) + offsetDays * DAY_IN_MS)
		.toISOString()
		.slice(0, 10);
}

/** «HH:MM» of a minute of the day (0–1439) on the 24-hour clock, or `null` (the application's `formatClock`). */
export function formatClock(minute: number): string | null {
	if (!Number.isInteger(minute) || minute < 0 || minute >= MINUTES_IN_DAY) return null;
	return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/** A number in the language («4,9» / «4.9»), with at most / at least these decimals. */
export function formatDecimal(
	value: number,
	language: string,
	maxFractionDigits: number,
	minFractionDigits: number = maxFractionDigits
): string {
	return new Intl.NumberFormat(language, {
		maximumFractionDigits: maxFractionDigits,
		minimumFractionDigits: minFractionDigits
	}).format(value);
}

const LAST_DIGIT = /(\d)(?!.*\d)/u;

/**
 * An amount in euros as the language writes it («60 €» / «€60»), cents only when it has them. `orMore` marks an open
 * upper end on the number itself: «170+ €» / «€170+» (the application's `formatEuro`).
 */
export function formatEuro(
	amount: number,
	language: string,
	options: { orMore?: boolean } = {}
): string {
	const fractionDigits = Number.isInteger(amount) ? 0 : 2;
	const formatted = new Intl.NumberFormat(language, {
		currency: 'EUR',
		maximumFractionDigits: fractionDigits,
		minimumFractionDigits: fractionDigits,
		style: 'currency'
	}).format(amount);
	return options.orMore ? formatted.replace(LAST_DIGIT, '$1+') : formatted;
}

/** The compact count's ceiling, «1.000+» / «1,000+» (the filters' button, S-31.7, S-34.7; the application's). */
export const APPROX_COUNT_CAP = 1000;

/**
 * A count in the language through the one number rule (S-31.2), «N+» when it is only a lower bound — the server
 * stopped counting at its candidate cap (S-34.6) — and never «0+» (the application's `formatCount`).
 */
export function formatCount(count: number, language: string, isLowerBound: boolean): string {
	const digits = formatDecimal(count, language, 0);
	return isLowerBound && count > 0 ? `${digits}+` : digits;
}

/** A compact count and whether it was written with «+» (the caller then picks the plural). */
export type ApproxCount = { capped: boolean; display: string };

/**
 * A count for a compact «N results» label, capped (the application's `formatApproxCount`): below `cap` the count —
 * «N+» when it is only a lower bound — at or above it the cap with «+»; a negative or non-finite count reads 0.
 */
export function formatApproxCount(
	count: number,
	language: string,
	cap = APPROX_COUNT_CAP,
	isLowerBound = false
): ApproxCount {
	const safe = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
	if (safe >= cap) return { capped: true, display: formatCount(cap, language, true) };
	const lowerBound = isLowerBound && safe > 0;
	return { capped: lowerBound, display: formatCount(safe, language, lowerBound) };
}
