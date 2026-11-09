import { m } from '$paraglide/messages.js';
import type { AppointmentCreateRequest } from '$modules/appointments/api/appointment';
import type { BookingPatientFacts } from '$modules/appointments/api/patient';
import type { BookingReadinessFacts } from '$modules/appointments/api/readiness';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { BOOKING_SERVICE_QUANTITY } from '$modules/appointments/config';
import { bookingBlockerMessages, CHOSEN_HOUR_BLOCKERS, ROW_BLOCKERS } from '../blockers';
import { firstVisitPayload } from '../first-visit';
import { toBookingNotePayload } from '../note';
import type { BookingSlotState, BookingSubmitDecision, BookingVisitor } from '../types';

/**
 * 🔴 What «Επιβεβαίωση κράτησης» does now (P-W3 §3.2.3, record §3.2, the application's `resolveBookingSubmission`): a guest
 * signs in first; an hour that is gone, or a blocker no row answers, locks it (with its words — never none, review
 * w3-w2 R1 MAJOR-2); no service, or a relative the list no longer names, locks it with the application's words
 * (MINOR-4 α); a missing name or mobile opens its screen; otherwise the body is sent. While the person's facts or the
 * readiness are still on their way, it waits locked — a press never meets a silent early return.
 */
export function resolveBookingSubmit({
	signedIn,
	slotState,
	patient,
	readiness,
	serviceId,
	visitor,
	locale
}: {
	signedIn: boolean;
	slotState: BookingSlotState;
	patient: BookingPatientFacts | null | undefined;
	readiness: BookingReadinessFacts | undefined;
	serviceId: string | undefined;
	visitor: BookingVisitor;
	locale: SupportedLocale;
}): BookingSubmitDecision {
	if (!signedIn) return { kind: 'sign-in' };
	if (slotState === 'gone' || slotState === 'gone-duration') {
		return { kind: 'locked', reason: 'slot', messages: [] };
	}
	if (slotState === 'waiting' || patient === undefined || readiness === undefined) {
		return { kind: 'locked', reason: 'waiting', messages: [] };
	}
	// An account the server names no patient for (a doctor's) cannot book: it says so, never a silent lock.
	if (patient === null) {
		return {
			kind: 'locked',
			reason: 'blocked',
			messages: [m.booking_submit_blocked_patient({}, { locale })]
		};
	}
	const standing = readiness.blockers.filter((code) => !ROW_BLOCKERS.includes(code));
	if (standing.length > 0) {
		const messages = bookingBlockerMessages(
			standing.filter((code) => !CHOSEN_HOUR_BLOCKERS.includes(code)),
			locale
		);
		return {
			kind: 'locked',
			reason: 'blocked',
			// A blocker with no words of its own (a newer server's code): the refusal is still said.
			messages:
				messages.length > 0 || standing.some((code) => CHOSEN_HOUR_BLOCKERS.includes(code))
					? messages
					: [m.booking_submit_error({}, { locale })]
		};
	}
	if (!serviceId) {
		return {
			kind: 'locked',
			reason: 'blocked',
			messages: [m.booking_submit_blocked_service({}, { locale })]
		};
	}
	if (
		visitor.kind === 'relative' &&
		!patient.relatives.some((relative) => relative.relativeId === visitor.relativeId)
	) {
		return {
			kind: 'locked',
			reason: 'blocked',
			messages: [m.booking_submit_blocked_relative({}, { locale })]
		};
	}
	if (!patient.firstName || !patient.lastName || !readiness.nameComplete) {
		return { kind: 'open', step: 'details/name' };
	}
	if (!readiness.phoneVerified) return { kind: 'open', step: 'details/phone' };
	return { kind: 'submit' };
}

/**
 * 🔴 THE body of the booking's one write (the application's `resolveBookingSubmission`): the instant is the offered
 * slot's own `startTime` (never built from the address), ONE service (U-103.2), the note trimmed and clamped, the
 * relative only when chosen and known by name — a body naming a relative the list cannot name would confirm one person
 * on screen and book another — and the first-visit answer only when it was asked. `null` when it cannot be whole.
 */
export function buildBookingRequest({
	doctorId,
	officeId,
	startTime,
	serviceId,
	patient,
	visitor,
	note,
	firstVisit
}: {
	doctorId: string | undefined;
	officeId: string;
	startTime: string | null;
	serviceId: string | undefined;
	patient: BookingPatientFacts | null | undefined;
	visitor: BookingVisitor;
	note: string;
	firstVisit: { asked: boolean; answer: 'yes' | 'no' };
}): AppointmentCreateRequest | null {
	if (!doctorId || !startTime || !serviceId || !patient) return null;
	if (
		visitor.kind === 'relative' &&
		!patient.relatives.some((relative) => relative.relativeId === visitor.relativeId)
	) {
		return null;
	}
	return {
		doctorId,
		officeId,
		patientId: patient.patientId,
		bookedForType: visitor.kind === 'self' ? 'SELF' : 'RELATIVE',
		relativeId: visitor.kind === 'relative' ? visitor.relativeId : null,
		startTime,
		patientNote: toBookingNotePayload(note),
		services: [{ doctorServiceId: serviceId, quantity: BOOKING_SERVICE_QUANTITY }],
		...firstVisitPayload(firstVisit.asked, firstVisit.answer)
	};
}
