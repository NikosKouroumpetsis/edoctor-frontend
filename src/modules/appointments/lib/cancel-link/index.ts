import { m } from '$paraglide/messages.js';
import { appointmentDayTimeLabel } from '$shared/lib/appointment-when';
import { officeAddressJoin, officePhoneLine, type PhoneLine } from '$shared/lib/office';
import { withDoctorTitle } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	AppointmentCancelLinkFacts,
	AppointmentCancelLinkFailure,
	AppointmentCancelLinkRequest
} from '$modules/appointments/api/cancel-link';
import { PATIENT_CANCEL_REASONS } from '$modules/appointments/config';
import { buildCancelTerms, type CancelTermsLine } from '$modules/appointments/lib/cancel';
import type { AppointmentContext } from '$modules/appointments/lib/change';

/*
 * Wave 5.1 · the cancel link's page `/a/<token>` in words (D-W51-72, U-198.1; 88 §73 Ε1 Α): screen 53 for a patient the
 * doctor booked without an eDoctor account — the doctor, the day and the hour, the office, the terms, the patient's five
 * reasons and the words, «Ακύρωση ραντεβού»; after the deadline «Για ακύρωση, καλέστε το ιατρείο». 🔴 Nothing of the
 * patient: the server sends none (D-W51-58).
 */

// _source: backend `shared/utils/security/opaque-token` (`OPAQUE_TOKEN_LENGTH` 16, base64url; w51-b8b round 2): the
// one shape of a link's secret. Guarded by `tests/architecture/appointment-rules.test.ts`.
export const APPOINTMENT_CANCEL_TOKEN = /^[A-Za-z0-9_-]{16}$/u;

/** 🔴 D-W51-72 / U-65.6: the link's secret checked here, before any request — anything else is «δεν ισχύει». */
export function readAppointmentCancelToken(value: unknown): string | null {
	return typeof value === 'string' && APPOINTMENT_CANCEL_TOKEN.test(value) ? value : null;
}

/**
 * 🔴 D-W51-72 (U-65.6): the link's write as the contract takes it — only a reason of the patient's five (the server's
 * `reasonCode` of the link refuses the doctor side's), the words as the 53's form keeps them; `null` for anything else.
 */
export function toCancelLinkRequest(
	request: { reasonCode: string; reasonText?: string } | null
): AppointmentCancelLinkRequest | null {
	const code = PATIENT_CANCEL_REASONS.find((reason) => reason === request?.reasonCode);
	if (!request || !code) return null;
	return request.reasonText
		? { reasonCode: code, reasonText: request.reasonText }
		: { reasonCode: code };
}

/** What the page draws for the link as the server answered it. */
export type AppointmentCancelLinkView = 'form' | 'late' | 'gone';

/**
 * 🔴 D-W51-72: the form while it may be cancelled online (`canCancel`), «καλέστε το ιατρείο» once the deadline passed
 * (`late`, the server's: never computed here), «δεν ισχύει» for anything else.
 */
export function appointmentCancelLinkView(
	link: Pick<AppointmentCancelLinkFacts, 'canCancel' | 'late'>
): AppointmentCancelLinkView {
	if (link.canCancel) return 'form';
	return link.late ? 'late' : 'gone';
}

/** «Dr. Μαρία Τριανταφύλλου · Δερματολόγος»: the doctor's public name with the title, and the specialty. */
function doctorLine(link: AppointmentCancelLinkFacts): string {
	const name = link.doctor.name ? withDoctorTitle(link.doctor.name) : null;
	return [name, link.doctor.specialty].filter(Boolean).join(' · ');
}

/**
 * The box over the page (the 53's `.a-ctx`): «Το ραντεβού σας» / «Το αίτημά σας», the day and the hour on the office's
 * clock, the doctor, the office's address — no photo (the link's page names none) and no «Για: …» (nothing of the
 * patient).
 */
export function buildCancelLinkContext(
	link: AppointmentCancelLinkFacts,
	locale: SupportedLocale
): AppointmentContext {
	const options = { locale };
	const office = link.office;
	const city = [office.city, office.postalCode].filter(Boolean).join(' ');
	return {
		label:
			link.status === 'pending'
				? m.appointments_change_context_request({}, options)
				: m.appointments_change_context({}, options),
		when: appointmentDayTimeLabel(link.startTime, locale, link.officeTimeZone),
		line: doctorLine(link),
		address: officeAddressJoin({
			street: office.street ?? undefined,
			streetNumber: office.streetNumber ?? undefined,
			city: city || undefined
		}),
		forWhom: null,
		photo: null
	};
}

/** The office's phone as read and dialled («210 321 0101»), `null` without one. */
export function cancelLinkPhone(link: AppointmentCancelLinkFacts): PhoneLine | null {
	return officePhoneLine(link.office.phone);
}

/**
 * «Προθεσμία ακύρωσης» as the 53 says it (`buildCancelTerms`), from the server's terms: «Έως {πότε} · Ακυρώνετε από
 * εδώ.», «Έως την ώρα του ραντεβού» for a request and for a visit the doctor put inside its deadline, «Μετά · Μόνο
 * τηλεφωνικά με το ιατρείο · {τηλέφωνο}».
 */
export function buildCancelLinkTerms(
	link: AppointmentCancelLinkFacts,
	locale: SupportedLocale
): { title: string; lines: CancelTermsLine[] } {
	return buildCancelTerms({
		appointment: link,
		actions: {
			cancellationDeadline: link.cancellation?.deadline ?? null,
			cancellationCutoffHours: link.cancellation?.cutoffHours ?? null
		},
		phone: cancelLinkPhone(link)?.label ?? null,
		locale
	});
}

/**
 * «Τι θα γίνει» (the 53's words, record §9.2): the doctor is told, the hour opens up, a cancellation is final — the
 * email's line is left out (the page knows nothing of the patient).
 */
export function cancelLinkThenLines(locale: SupportedLocale): string[] {
	const options = { locale };
	return [
		m.appointments_cancel_then_notified({}, options),
		m.appointments_cancel_then_freed({}, options),
		m.appointments_cancel_then_final({}, options)
	];
}

/**
 * The words of a refused cancel that keep the form (D-W51-72): too many (`429`), anything else — a field, a lost request,
 * an outage — «Η ακύρωση δεν ολοκληρώθηκε…». The link gone, the deadline passed and the visit changed are the page's
 * own views, not words under the form.
 */
export function cancelLinkFailureText(
	failure: AppointmentCancelLinkFailure,
	locale: SupportedLocale
): string {
	return failure === 'rate-limited'
		? m.booking_details_errors_rate_limited({}, { locale })
		: m.appointments_cancel_failed({}, { locale });
}
