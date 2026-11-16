import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import type { ApiResponseData, AppointmentStatus } from '$shared/lib/api-client';
import { readInstant } from '$shared/lib/instant';
import type { AppointmentCancelLinkFacts } from './types';

type CancelLinkView = ApiResponseData<'getAppointmentCancelLink', 200>;

// Long enough for any real name, street or specialty; a phone of digits, spaces and one «+» (U-65.6).
const MAX_TEXT = 200;
const MAX_PHONE = 32;
const ZONE = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){0,2}$/u;

const record = (value: unknown): Record<string, unknown> | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
const text = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const read = value.trim();
	return read && read.length <= MAX_TEXT ? read : null;
};
const phone = (value: unknown) => {
	const read = text(value);
	return read && read.length <= MAX_PHONE && /^\+?[\d\s]+$/u.test(read) ? read : null;
};

/** 🔴 Every state the contract can answer, total over its union: any other word is no visit of the page. */
const STATUSES = {
	pending: true,
	checked_in: true,
	completed: true,
	canceled: true,
	booked: true,
	rejected: true,
	unavailable: true,
	expired: true,
	no_show: true
} as const satisfies Record<AppointmentStatus, true>;

const statusOf = (value: unknown): AppointmentStatus | null =>
	typeof value === 'string' && Object.hasOwn(STATUSES, value) ? (value as AppointmentStatus) : null;

/**
 * 🔴 D-W51-72 (U-65.6): the page of one cancel link as FACTS, field by field, nothing made up — `null` for an answer with
 * no state of the contract or an hour that is no instant; the flags only when `true`; the zone only as an IANA name.
 */
export function mapAppointmentCancelLink(
	view: CancelLinkView | null | undefined
): AppointmentCancelLinkFacts | null {
	const answer = record(view);
	const status = statusOf(answer?.status);
	const startTime = readInstant(answer?.startTime);
	if (!answer || !status || !startTime) return null;
	const doctor = record(answer.doctor);
	const office = record(answer.office);
	const terms = record(answer.cancellation);
	const hours = terms?.cutoffHours;
	const floor = office?.floor;
	const zone = text(answer.officeTimeZone);
	return {
		status,
		startTime,
		endTime: readInstant(answer.endTime),
		officeTimeZone: zone && ZONE.test(zone) ? zone : PLATFORM_TIME_ZONE,
		doctor: { name: text(doctor?.fullName), specialty: text(doctor?.specialty) },
		office: {
			street: text(office?.street),
			streetNumber: text(office?.streetNumber),
			city: text(office?.city),
			postalCode: text(office?.postalCode),
			floor: typeof floor === 'number' && Number.isFinite(floor) ? Math.trunc(floor) : null,
			phone: phone(office?.phone)
		},
		cancellation:
			typeof hours === 'number' && Number.isInteger(hours) && hours >= 0
				? { cutoffHours: hours, deadline: readInstant(terms?.deadline) }
				: null,
		canCancel: answer.canCancel === true,
		late: answer.late === true
	};
}
