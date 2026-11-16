import { m } from '$paraglide/messages.js';
import type { ApiRequestBody } from '$shared/lib/api-client';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/*
 * D-W51-37 (moved from `modules/appointments/lib/cancel`: the patient's 51 and the doctor's 68 both read how a visit was
 * canceled, and a module never imports another): a stored cancellation reason in words.
 */

type Message = (inputs: Record<string, never>, options: { locale: SupportedLocale }) => string;

/** Every reason the contract takes for a cancellation (both sides' lists, `cancelAppointment`'s `reasonCode`). */
export type AppointmentCancelReasonCode = ApiRequestBody<'cancelAppointment'>['reasonCode'];

/**
 * Every reason the contract takes, in words (the application's `CANCEL_REASON_KEYS`): total over BOTH sides' lists, as
 * a doctor's cancellation is read on the patient's page too («Λόγος: …»).
 */
const CANCEL_REASON_WORDS = {
	DOCTOR_UNAVAILABLE: m.appointments_cancel_reason_doctor_unavailable,
	EMERGENCY: m.appointments_cancel_reason_emergency,
	FEELING_BETTER: m.appointments_cancel_reason_feeling_better,
	FOUND_ANOTHER_DOCTOR: m.appointments_cancel_reason_found_another_doctor,
	OTHER: m.appointments_cancel_reason_other,
	PERSONAL: m.appointments_cancel_reason_personal,
	SCHEDULE_CONFLICT: m.appointments_cancel_reason_schedule_conflict
} as const satisfies Record<AppointmentCancelReasonCode, Message>;

/** A stored reason in words, `null` for none or for a code this build does not know (never the code itself). */
export function cancelReasonLabel(code: string | null, locale: SupportedLocale): string | null {
	return code && Object.hasOwn(CANCEL_REASON_WORDS, code)
		? CANCEL_REASON_WORDS[code as AppointmentCancelReasonCode]({}, { locale })
		: null;
}
