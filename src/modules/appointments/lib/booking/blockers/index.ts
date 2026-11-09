import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { BookingBlockerCode } from '$modules/appointments/api/readiness';
import type { BookingBlockerReading, BookingFailureAction } from '../types';

type Message = (inputs: Record<string, never>, options: { locale: SupportedLocale }) => string;

/**
 * 🔴 THE reading of every blocker the contract can name (the application's `BOOKING_BLOCKERS`), a table the COMPILER
 * keeps total: a new code fails the build instead of reaching a reader as an identifier. Codes that mean one thing to a
 * patient share one sentence; the reschedule and cancel codes never refuse a booking, so they say nothing here; and the
 * web has no «Τα ραντεβού μου» (U-103.1), so what the application sends there leads back to the doctor.
 */
export const BOOKING_BLOCKERS = {
	APPOINTMENTS_DISABLED: { message: m.booking_blocker_doctor_unavailable, action: 'open-doctor' },
	APPOINTMENT_OVERLAPS_EXISTING: {
		message: m.booking_blocker_slot_unavailable,
		action: 'pick-slot'
	},
	AVAILABILITY_DISABLED: { message: m.booking_blocker_doctor_unavailable, action: 'open-doctor' },
	AVAILABILITY_NOT_FOUND: { message: m.booking_blocker_service_unavailable, action: 'open-doctor' },
	BOOKING_HORIZON_EXCEEDED: { message: m.booking_blocker_horizon_exceeded, action: 'pick-slot' },
	BOOKING_NOTICE_TOO_SHORT: { message: m.booking_blocker_notice_too_short, action: 'pick-slot' },
	CANCEL_AFTER_CANCELLATION_CUTOFF: { message: null, action: 'retry' },
	DOCTOR_NOT_VERIFIED: { message: m.booking_blocker_doctor_unavailable, action: 'open-doctor' },
	DOCTOR_SERVICE_NOT_OWNED_BY_DOCTOR: {
		message: m.booking_blocker_service_unavailable,
		action: 'open-doctor'
	},
	EXTERNAL_CALENDAR_BUSY: { message: m.booking_blocker_slot_unavailable, action: 'pick-slot' },
	INTERVAL_DURATION_MISMATCH: { message: m.booking_blocker_slot_unavailable, action: 'pick-slot' },
	INTERVAL_EXCEEDS_AVAILABLE_RANGE: {
		message: m.booking_blocker_slot_unavailable,
		action: 'pick-slot'
	},
	MARKETPLACE_LICENSE_INACTIVE: {
		message: m.booking_blocker_doctor_unavailable,
		action: 'open-doctor'
	},
	OFFICE_PHONE_REQUIRED: { message: m.booking_blocker_office_not_ready, action: 'open-doctor' },
	OUTSIDE_AVAILABILITY_WINDOW: { message: m.booking_blocker_slot_unavailable, action: 'pick-slot' },
	OUTSIDE_WEEKLY_SCHEDULE: { message: m.booking_blocker_slot_unavailable, action: 'pick-slot' },
	PATIENT_IS_THE_DOCTOR: {
		message: m.booking_blocker_patient_is_the_doctor,
		action: 'open-doctor'
	},
	PATIENT_NAME_MISSING: { message: m.booking_blocker_name_missing, action: 'complete-name' },
	PATIENT_PENDING_LIMIT_REACHED: {
		message: m.booking_blocker_pending_limit,
		action: 'open-doctor'
	},
	PATIENT_PHONE_UNVERIFIED: { message: m.booking_summary_phone_missing, action: 'complete-phone' },
	PATIENT_RESCHEDULE_LIMIT_REACHED: { message: null, action: 'retry' },
	RESCHEDULE_AFTER_CANCELLATION_CUTOFF: { message: null, action: 'retry' },
	RESCHEDULE_INSIDE_CANCELLATION_CUTOFF: { message: null, action: 'retry' },
	SCHEDULE_NOT_CONFIGURED: {
		message: m.booking_blocker_service_unavailable,
		action: 'open-doctor'
	},
	SLOT_ALREADY_ELAPSED: { message: m.booking_blocker_slot_unavailable, action: 'pick-slot' },
	SLOT_STEP_MISMATCH: { message: m.booking_blocker_slot_unavailable, action: 'pick-slot' }
} as const satisfies Record<
	BookingBlockerCode,
	{ message: Message | null; action: BookingFailureAction }
>;

/** The two the card's own rows answer (the name and the mobile, record §3.2): never repeated as a notice. */
export const ROW_BLOCKERS: readonly BookingBlockerCode[] = [
	'PATIENT_NAME_MISSING',
	'PATIENT_PHONE_UNVERIFIED'
];

/** What the CHOSEN hour breaks by the server's clock: said in the policy row (the application's warnings, D-118). */
export const CHOSEN_HOUR_BLOCKERS: readonly BookingBlockerCode[] = [
	'BOOKING_NOTICE_TOO_SHORT',
	'BOOKING_HORIZON_EXCEEDED',
	'OFFICE_PHONE_REQUIRED'
];

/** The reading of one code in the language, or `null` for an identifier this build does not know. */
export function readBookingBlocker(
	code: string,
	locale: SupportedLocale
): BookingBlockerReading | null {
	if (!Object.hasOwn(BOOKING_BLOCKERS, code)) return null;
	const entry = BOOKING_BLOCKERS[code as BookingBlockerCode];
	return { message: entry.message ? entry.message({}, { locale }) : null, action: entry.action };
}

/**
 * The blockers as sentences, in the order they came and never twice (two codes of one sentence are one thing to read);
 * a code with no sentence, or one this build does not know, is dropped rather than printed raw.
 */
export function bookingBlockerMessages(
	blockers: readonly string[],
	locale: SupportedLocale
): string[] {
	const messages = blockers
		.map((code) => readBookingBlocker(code, locale)?.message)
		.filter((message): message is string => Boolean(message));
	return [...new Set(messages)];
}
