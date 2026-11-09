import type { BookingHints, BookingSlotChoice, BookingStep } from '../types';

/**
 * 🔴 P-W3 §3.2.5, U-65.6: the booking's address carries hints only — the office, the day, the time and the service —
 * never a person's fact; each is read by its pattern from an untrusted query (a bad one is absent, never a 500). The
 * instant that is booked is never built from them: it is the `startTime` of the slot the page read.
 */
const HINT_ID = /^[A-Za-z0-9_-]{1,80}$/u;
const HINT_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const HINT_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/u;
/** An appointment's id in the last page's address (`?appointment=`): the same plain id. */
const APPOINTMENT_ID = HINT_ID;

export const BOOKING_STEPS = [
	'time',
	'service',
	'for-whom',
	'relative',
	'details/phone',
	'details/code',
	'details/name',
	'details/birth-date',
	'success'
] as const satisfies readonly BookingStep[];

/**
 * The booking route's `[...step]` (P-W3 Σ-1, one route for screen 30 and its screens: see `bookingPath`): `null` for
 * screen 30 itself (no step), the step when it is one of the closed list, `undefined` for anything else (a 404).
 */
export function readBookingStep(value: string | undefined): BookingStep | null | undefined {
	const step = (value ?? '').replace(/\/+$/u, '');
	if (!step) return null;
	return BOOKING_STEPS.find((candidate) => candidate === step);
}

/** A real calendar day (`2026-02-31` is none): the day as the slots name it. */
function isCalendarDay(value: string): boolean {
	if (!HINT_DATE.test(value)) return false;
	const [year, month, day] = value.split('-').map(Number);
	const parsed = new Date(Date.UTC(year, month - 1, day));
	return parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

/** The hints of a booking address: each present only when valid. */
export function readBookingHints(params: URLSearchParams): BookingHints {
	const hints: BookingHints = {};
	const office = params.get('office');
	if (office && HINT_ID.test(office)) hints.office = office;
	const service = params.get('service');
	if (service && HINT_ID.test(service)) hints.service = service;
	const date = params.get('date');
	if (date && isCalendarDay(date)) hints.date = date;
	const time = params.get('time');
	if (time && HINT_TIME.test(time)) hints.time = time;
	return hints;
}

/** `09:30` ⇒ 570; `null` for anything that is not an `HH:MM` of a day. */
export function minuteOfTime(time: string | undefined): number | null {
	const match = time ? HINT_TIME.exec(time) : null;
	return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** 570 ⇒ `09:30`. */
export function timeOfMinute(minute: number): string {
	const hours = Math.floor(minute / 60);
	return `${String(hours).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/** The hour the hints name, or `null` unless office, day and time are all there. */
export function slotOfHints(hints: BookingHints): BookingSlotChoice | null {
	const startMinute = minuteOfTime(hints.time);
	if (!hints.office || !hints.date || startMinute === null) return null;
	return { officeId: hints.office, date: hints.date, startMinute };
}

/** The hints of a choice (the hour and the service), the way the address keeps them. */
export function hintsOf(slot: BookingSlotChoice | null, serviceId: string | null): BookingHints {
	return {
		...(slot
			? { office: slot.officeId, date: slot.date, time: timeOfMinute(slot.startMinute) }
			: {}),
		...(serviceId ? { service: serviceId } : {})
	};
}

/** The hints as one comparable string, in a fixed order. */
export function hintsKey(hints: BookingHints): string {
	return ['office', 'date', 'time', 'service']
		.map((key) => `${key}=${hints[key as keyof BookingHints] ?? ''}`)
		.join('&');
}

/**
 * A booking address, before its language: `/doctors/<slug>/booking[/<step>]?office=…&date=…&time=…&service=…`, the
 * hints in a fixed order and only the valid ones (a step's address carries the same hints as the page).
 */
export function bookingPath(
	slug: string,
	step: BookingStep | null,
	hints: BookingHints = {}
): string {
	return withBookingHints(
		`/doctors/${encodeURIComponent(slug)}/booking${step ? `/${step}` : ''}`,
		hints
	);
}

/** `path` with the valid hints of `hints` as its query, in a fixed order (the doctor's page keeps the hour, record §3.2). */
export function withBookingHints(path: string, hints: BookingHints): string {
	const query = new URLSearchParams();
	const valid = readBookingHints(new URLSearchParams(hints as Record<string, string>));
	for (const key of ['office', 'date', 'time', 'service'] as const) {
		const value = valid[key];
		if (value) query.set(key, value);
	}
	const search = query.toString();
	return `${path}${search ? `?${search}` : ''}`;
}

/** Screen 31's address: the success step and the appointment's id (a plain id, else none). */
export function bookingSuccessPath(slug: string, appointmentId: string): string {
	const id = APPOINTMENT_ID.test(appointmentId) ? `?appointment=${appointmentId}` : '';
	return `${bookingPath(slug, 'success')}${id}`;
}

/** `?appointment=` of the last page: a plain id, else `null` (the route answers 404). */
export function readAppointmentId(params: URLSearchParams): string | null {
	const value = params.get('appointment');
	return value && APPOINTMENT_ID.test(value) ? value : null;
}
