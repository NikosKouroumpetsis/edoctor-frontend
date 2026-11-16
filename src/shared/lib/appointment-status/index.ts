import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { AppointmentStatus } from '$shared/lib/api-client';

/** The colour a status pill takes (the application's `AppointmentStatusTone` for the patient): warm, green, neutral. */
export type AppointmentStatusTone = 'warning' | 'success' | 'muted';

/** One status as a pill: the word a patient reads, and the tone it is read in. */
export type AppointmentStatusPill = { label: string; tone: AppointmentStatusTone };

type Message = (inputs: Record<string, never>, options: { locale: SupportedLocale }) => string;

/** 🔴 Every state the contract can answer, in the application's words (`appointments.status.*`), total over the union. */
const STATUS_WORDS = {
	booked: m.appointments_status_booked,
	canceled: m.appointments_status_canceled,
	checked_in: m.appointments_status_checked_in,
	completed: m.appointments_status_completed,
	expired: m.appointments_status_expired,
	no_show: m.appointments_status_no_show,
	pending: m.appointments_status_pending,
	rejected: m.appointments_status_rejected,
	unavailable: m.appointments_status_unavailable
} as const satisfies Record<AppointmentStatus, Message>;

/**
 * The patient's tones (record §6.1, D-W4-15, the application's `APPOINTMENT_PATIENT_STATUS_TONES`): waiting warm, kept
 * green, every other state neutral — how a visit ended is news, not an alarm (`checked_in`, `unavailable` too).
 */
export const APPOINTMENT_PATIENT_STATUS_TONES = {
	booked: 'success',
	canceled: 'muted',
	checked_in: 'muted',
	completed: 'muted',
	expired: 'muted',
	no_show: 'muted',
	pending: 'warning',
	rejected: 'muted',
	unavailable: 'muted'
} as const satisfies Record<AppointmentStatus, AppointmentStatusTone>;

/** The patient's pill of one status (screens 50, 51, 54): the application's word, the patient's tone. */
export function appointmentStatusPill(
	status: AppointmentStatus,
	locale: SupportedLocale
): AppointmentStatusPill {
	return {
		label: STATUS_WORDS[status]({}, { locale }),
		tone: APPOINTMENT_PATIENT_STATUS_TONES[status]
	};
}

/**
 * Wave 5.1 · screen 66 (D-W51-27, `sw.js:238-249`): the doctor's words where the patient's speak to the patient — a
 * request is «Αίτημα», a visit missed «Δεν ήρθε»; a cancellation says who («από τον ασθενή» / «από εσάς», the support's
 * or the system's the bare «Ακυρώθηκε»). 🔴 Screen 67 (D-W51-29): a request nobody answered «Έληξε χωρίς απάντηση», one
 * the doctor refused «Απορρίφθηκε από εσάς» (anyone else's the bare «Απορρίφθηκε»). The rest are the patient's words, the
 * tones the patient's.
 */
const DOCTOR_STATUS_WORDS = {
	...STATUS_WORDS,
	pending: m.appointments_status_doctor_pending,
	no_show: m.appointments_status_doctor_no_show,
	expired: m.appointments_status_doctor_expired
} as const satisfies Record<AppointmentStatus, Message>;

/**
 * Who closed it — canceled a `canceled` one (`canceledBy`) or refused a `rejected` one (`rejectedBy`) — as the contract
 * names the sides (`AppointmentActorKind`); any other value reads the bare word.
 */
export type AppointmentCloseSide = 'DOCTOR' | 'BACKOFFICE' | 'PATIENT' | 'SYSTEM';

/**
 * The doctor's pill of one status (screens 66, 67; 73 next): the doctor's word, the patient's tone. `closedBy` is the
 * side that canceled a `canceled` one or rejected a `rejected` one (D-W51-29); for any other state it says nothing.
 */
export function doctorAppointmentStatusPill(
	status: AppointmentStatus,
	closedBy: AppointmentCloseSide | null,
	locale: SupportedLocale
): AppointmentStatusPill {
	const options = { locale };
	const label =
		status === 'canceled' && closedBy === 'PATIENT'
			? m.appointments_status_doctor_canceled_by_patient({}, options)
			: status === 'canceled' && closedBy === 'DOCTOR'
				? m.appointments_status_doctor_canceled_by_you({}, options)
				: status === 'rejected' && closedBy === 'DOCTOR'
					? m.appointments_status_doctor_rejected_by_you({}, options)
					: DOCTOR_STATUS_WORDS[status]({}, options);
	return { label, tone: APPOINTMENT_PATIENT_STATUS_TONES[status] };
}

/** The states that are over (the server's «final» set): the visit lives in «Ιστορικό» whatever its hour. */
const CLOSED: readonly AppointmentStatus[] = [
	'completed',
	'canceled',
	'rejected',
	'expired',
	'no_show',
	'unavailable'
];

/** Whether the appointment is over (closed by its state), the rest are open: `pending`, `booked`, `checked_in`. */
export function isClosedAppointment(status: AppointmentStatus): boolean {
	return CLOSED.includes(status);
}

/**
 * 🔴 The server's rule for the person's «Αλλαγή» of the visitor and the note (`ensureAmendableStatus`, record §7.1,
 * D-W4-01: no flag on the wire): while it is waiting or kept, with no deadline. ONE owner of it on the web.
 */
export function canAmendAppointment(status: AppointmentStatus): boolean {
	return status === 'pending' || status === 'booked';
}
