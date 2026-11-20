import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { readZonedParts } from '$shared/lib/format';
import type {
	AppointmentRescheduleDayFacts,
	AppointmentRescheduleSlotFacts,
	AppointmentRescheduleSlotsFacts
} from './types';

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/u;
// An IANA name (`Europe/Athens`), never a text of another kind.
const ZONE = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){0,2}$/u;
const MAX_DAYS = 7;
const MAX_DAY_SLOTS = 200;
const MINUTES_IN_DAY = 24 * 60;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** One hour on the office's clock, or nothing: an instant that does not parse, or one off its day, is dropped. */
function slotOf(value: unknown, date: string, zone: string): AppointmentRescheduleSlotFacts[] {
	if (!isRecord(value) || typeof value.startTime !== 'string') return [];
	const startTime = value.startTime.trim();
	const instant = Date.parse(startTime);
	if (!startTime || Number.isNaN(instant)) return [];
	const parts = readZonedParts(instant, zone);
	const day = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
	const startMinute = parts.hour * 60 + parts.minute;
	if (
		day !== date ||
		!Number.isInteger(startMinute) ||
		startMinute < 0 ||
		startMinute >= MINUTES_IN_DAY
	)
		return [];
	return [{ startMinute, startTime }];
}

/**
 * 🔴 D-W52-75α · U-65.6: one week of the free hours field by field — days kept even when empty, a day that is not
 * `YYYY-MM-DD` dropped, at most the server's 7 days and a day's hours, hours in time order on the office's clock, the
 * office's zone only as an IANA name (the platform's otherwise).
 */
export function mapAppointmentRescheduleSlots(view: unknown): AppointmentRescheduleSlotsFacts {
	const answer = isRecord(view) ? view : {};
	const zone =
		typeof answer.timezone === 'string' && ZONE.test(answer.timezone)
			? answer.timezone
			: PLATFORM_TIME_ZONE;
	const days = Array.isArray(answer.slotsByDate) ? answer.slotsByDate : [];
	return {
		timezone: zone,
		days: days.slice(0, MAX_DAYS).flatMap((entry): AppointmentRescheduleDayFacts[] => {
			if (!isRecord(entry) || typeof entry.date !== 'string' || !CALENDAR_DAY.test(entry.date))
				return [];
			const date = entry.date;
			const slots = (Array.isArray(entry.slots) ? entry.slots : [])
				.slice(0, MAX_DAY_SLOTS)
				.flatMap((slot) => slotOf(slot, date, zone))
				.sort((left, right) => left.startMinute - right.startMinute);
			return [{ date, slots }];
		})
	};
}
