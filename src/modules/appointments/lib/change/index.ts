import { m } from '$paraglide/messages.js';
import { zonedDay } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	AppointmentActionsFacts,
	AppointmentChangeFailureFacts,
	AppointmentChangeRequest,
	AppointmentDetailFacts,
	AppointmentFacts,
	AppointmentServiceLineFacts
} from '$modules/appointments/api/appointment';
import type {
	AppointmentDoctorFacts,
	BookingAvailabilityFacts,
	BookingOfficeFacts
} from '$modules/appointments/types';
import type { BookingPatientFacts } from '$modules/appointments/api/patient';
import type {
	BookingBlockerCode,
	BookingReadinessFacts
} from '$modules/appointments/api/readiness';
import { bookingBlockerMessages } from '$modules/appointments/lib/booking/blockers';
import {
	buildForWhomOptions,
	type BookingForWhomOption
} from '$modules/appointments/lib/booking/for-whom';
import { toBookingNotePayload } from '$modules/appointments/lib/booking/note';
import type { BookingVisitor } from '$modules/appointments/lib/booking/types';
import type { AppointmentDone } from '$modules/appointments/lib/detail';
import { appointmentOfficeShortLine } from '$modules/appointments/lib/detail';
import { appointmentDoctorName, appointmentForWhomLine } from '$modules/appointments/lib/list';
import type { AppointmentStep } from '$modules/appointments/lib/paths';
import { relativeWordLabel } from '$modules/appointments/lib/relatives/words';
import { canAmendAppointment } from '$modules/appointments/lib/status';
import { appointmentDayTimeLabel, appointmentShortWhenLabel } from '$modules/appointments/lib/when';

/*
 * Screen 52 «Αλλαγή ραντεβού» in words and rules (record §8.2, U-136, P-W4 §4.3): the hour (same office, same
 * service), the person, the note — each a screen of its own (U-102), sent with «Αποθήκευση» (U-136.3).
 */

/**
 * The service the slots are read for (the application's `resolveRescheduleServiceId`, _source: backend
 * `commands/appointment/Command.ts` — a patch recomputes the visit from the LONGEST ACTIVE line): a line the doctor
 * removed (D-71) is history the server ignores. `''` without an active line.
 */
export function resolveRescheduleServiceId(
	serviceLines: readonly Pick<
		AppointmentServiceLineFacts,
		'doctorServiceId' | 'durationInMinutes' | 'isActive'
	>[]
): string {
	const longest = [...serviceLines]
		.filter((line) => line.isActive)
		.sort((left, right) => (right.durationInMinutes ?? 0) - (left.durationInMinutes ?? 0))[0];
	return longest?.doctorServiceId ?? '';
}

/**
 * «Ήταν / Νέα ώρα» once an hour is picked (record §8.2): both on the office's clock, and what happens to the state —
 * «Το ραντεβού μένει επιβεβαιωμένο…» or «Το αίτημα μένει σε αναμονή…».
 */
export function buildTimeDiff(
	appointment: Pick<AppointmentFacts, 'startTime' | 'officeTimeZone' | 'status'>,
	startTime: string,
	locale: SupportedLocale
): { was: string; next: string; stays: string } {
	const options = { locale };
	return {
		was: appointmentDayTimeLabel(appointment.startTime, locale, appointment.officeTimeZone),
		next: appointmentDayTimeLabel(startTime, locale, appointment.officeTimeZone),
		stays:
			appointment.status === 'pending'
				? m.appointments_change_time_stays_pending({}, options)
				: m.appointments_change_time_stays_booked({}, options)
	};
}

/** 🔴 P-B4 §13.3.3: «Είναι η τελευταία αλλαγή ώρας…» only while a move is allowed and exactly one is left. */
export function isLastReschedule(actions: AppointmentActionsFacts | null): boolean {
	return actions?.canReschedule === true && actions.reschedulesLeft === 1;
}

/**
 * U-136.4 · the «yes» of U-91.1 asked in the screen: «Για τις {Πέμ 12 Νοε · 10:00} η προθεσμία ακύρωσης έχει ήδη
 * περάσει: …», the hour on the office's clock.
 */
export function insideCutoffMessage(
	appointment: Pick<AppointmentFacts, 'officeTimeZone'>,
	startTime: string,
	locale: SupportedLocale
): string {
	const time = appointmentShortWhenLabel(startTime, locale, appointment.officeTimeZone);
	return m.appointments_reschedule_inside_cutoff_message({ time }, { locale });
}

const HOUR_MS = 3_600_000;

/**
 * 🔴 D-W4-67 (the prototype's `c=ask`): whether the server will ask its «yes» for this hour (U-91.1, its
 * `patientMoveNeedsCutoffAcknowledgement`), foreseen from the appointment's own hours of the deadline against the
 * server's «now» — a kept visit moved to an hour whose deadline is already behind; exactly on it is on time (D-19). The
 * server stays the judge: its `422` asks the same question when the page did not foresee it; unknown hours foresee nothing.
 */
export function moveAsksCutoffYes(
	appointment: Pick<AppointmentDetailFacts, 'status'> & { actions: AppointmentActionsFacts | null },
	startTime: string,
	now: number
): boolean {
	const hours = appointment.actions?.cancellationCutoffHours;
	if (appointment.status !== 'booked' || typeof hours !== 'number') return false;
	const start = Date.parse(startTime);
	if (!Number.isFinite(start) || !Number.isFinite(now) || !Number.isFinite(hours)) return false;
	return start - hours * HOUR_MS < now;
}

/** The hour's write: the instant alone, with the «yes» only when the patient gave it (U-91.1). */
export function toTimeChangeRequest(
	startTime: string,
	acknowledged: boolean
): AppointmentChangeRequest {
	return acknowledged ? { startTime, acknowledgeInsideCancellationCutoff: true } : { startTime };
}

/** The person the appointment is for now, as an option's id (`self`, or the relative's id). */
export function currentVisitorId(
	appointment: Pick<AppointmentFacts, 'snapshot' | 'relativeId'>
): string {
	return appointment.snapshot.visitor.kind === 'relative' && appointment.relativeId
		? appointment.relativeId
		: 'self';
}

/**
 * «Για ποιον είναι το ραντεβού;» of screen 52: the booking's ONE builder (P-W4 Σ-15, D-W4-22) — «Για μένα» over the
 * holder's name, each relative over its word — and (record §11.4, U-139.4) a relative deleted since, from the
 * appointment's snapshot, so the person it is for now is always on the list.
 */
export function buildVisitorOptions(
	patient: BookingPatientFacts | null | undefined,
	appointment: Pick<AppointmentFacts, 'snapshot' | 'relativeId' | 'relative'>,
	locale: SupportedLocale
): BookingForWhomOption[] {
	const options = buildForWhomOptions(patient, locale);
	const current = currentVisitorId(appointment);
	if (current === 'self' || options.some((option) => option.id === current)) return options;
	const relative = appointment.relative;
	return [
		...options,
		{
			id: current,
			label: appointment.snapshot.visitor.name ?? '',
			description:
				relativeWordLabel(relative?.relationship ?? '', relative?.gender, locale) || null,
			visitor: { kind: 'relative', relativeId: current }
		}
	];
}

/**
 * 🔴 «Είναι το πρώτο ραντεβού με …;» (record §8.1, D-W3-22): asked ONLY when the person changes and the server knows no
 * earlier visit of theirs with the doctor (`firstVisitKnown === false`); the server takes the answer only with a change
 * of person.
 */
export function asksFirstVisitOnChange(
	changed: boolean,
	readiness: Pick<BookingReadinessFacts, 'firstVisitKnown'> | undefined
): boolean {
	return changed && readiness?.firstVisitKnown === false;
}

/**
 * D-70: «Υπάρχει ήδη ένα αίτημα σε αναμονή…» only for a REQUEST handed to another person whose place is taken — a kept
 * visit is never refused by it, so it is never said.
 */
export function pendingLimitBlocks(
	appointment: Pick<AppointmentFacts, 'status'>,
	changed: boolean,
	blockers: readonly BookingBlockerCode[] | undefined
): boolean {
	return (
		appointment.status === 'pending' &&
		changed &&
		(blockers ?? []).includes('PATIENT_PENDING_LIMIT_REACHED')
	);
}

/**
 * «Είναι το πρώτο ραντεβού με Dr. …;» and «Η απάντηση αφορά: {name}.» (record §8.2, `appt.js:350`): the doctor named with
 * the title (U-99.1; while unknown, the booking's word for one, `doctor_name_unknown`), the person it is about when named.
 */
export function firstVisitCopy(
	doctor: AppointmentDoctorFacts | null | undefined,
	personName: string | null,
	locale: SupportedLocale
): { title: string; about: string | undefined } {
	const options = { locale };
	return {
		title: m.appointments_change_first_visit_title(
			{ doctor: appointmentDoctorName(doctor) ?? m.doctor_name_unknown({}, options) },
			options
		),
		about: personName
			? m.appointments_change_first_visit_about({ name: personName }, options)
			: undefined
	};
}

/** The person's write: who, and the «first visit?» answer only when it was asked (else the server answers 422). */
export function toVisitorChangeRequest(
	visitor: BookingVisitor,
	firstVisit: boolean | null
): AppointmentChangeRequest {
	return {
		bookedForType: visitor.kind === 'relative' ? 'RELATIVE' : 'SELF',
		relativeId: visitor.kind === 'relative' ? visitor.relativeId : null,
		...(firstVisit === null ? {} : { firstVisit })
	};
}

/** The note's write: trimmed and cut to 500 (UTF-16 units, D-W4-36.8), `null` for an empty one (the server removes it). */
export function toNoteChangeRequest(note: string): AppointmentChangeRequest {
	return { patientNote: toBookingNotePayload(note) };
}

/** What a refused change means for the screen (P-W4 §4.3, D-W4-37). */
export type ChangeOutcome =
	| { kind: 'inside-cutoff' }
	| { kind: 'slot-gone'; message: string }
	| { kind: 'session' }
	| { kind: 'refused'; message: string };

/**
 * 🔴 A refused change in the screen's terms (P-W4 §4.3, D-W4-37): `RESCHEDULE_INSIDE_CANCELLATION_CUTOFF` asks the «yes»
 * inside the screen (U-136.4); a taken hour says «Αυτή η ώρα δεν είναι πλέον διαθέσιμη.» and the hours are read again;
 * the session opens the sign-in; the codes say the booking's words («Η ώρα δεν αλλάζει πια…», «Έχετε αλλάξει την ώρα
 * όσες φορές…», notice, horizon, D-70), too many writes «Πολλές προσπάθειες…»; anything that names nothing — a `403` /
 * `404` with no code (closed meanwhile, or a relative deleted), the `409` «changed concurrently», an unknown code — says
 * «Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας…» (D-W4-35) and the patient STAYS with what was chosen (D-W4-37.1),
 * never the booking's «Η κράτηση δεν ολοκληρώθηκε…» (the application's `readAppointmentChangeRefusal`).
 */
export function readChangeOutcome(
	failure: AppointmentChangeFailureFacts,
	locale: SupportedLocale
): ChangeOutcome {
	const options = { locale };
	if (failure.kind === 'session') return { kind: 'session' };
	if (failure.blockers.includes('RESCHEDULE_INSIDE_CANCELLATION_CUTOFF')) {
		return { kind: 'inside-cutoff' };
	}
	if (failure.kind === 'closed' || failure.kind === 'changed') {
		return { kind: 'refused', message: m.appointments_change_failed({}, options) };
	}
	const slotGone = m.booking_blocker_slot_unavailable({}, options);
	if (failure.kind === 'slot-unavailable') return { kind: 'slot-gone', message: slotGone };
	if (failure.kind === 'rate-limited') {
		return { kind: 'refused', message: m.booking_details_errors_rate_limited({}, options) };
	}
	const own: Partial<Record<BookingBlockerCode, string>> = {
		RESCHEDULE_AFTER_CANCELLATION_CUTOFF: m.booking_blocker_reschedule_cutoff({}, options),
		PATIENT_RESCHEDULE_LIMIT_REACHED: m.booking_blocker_reschedule_limit({}, options)
	};
	const said = failure.blockers.flatMap((code) => (own[code] ? [own[code]] : []));
	const messages = [...new Set([...said, ...bookingBlockerMessages(failure.blockers, locale)])];
	if (messages.includes(slotGone)) return { kind: 'slot-gone', message: slotGone };
	return {
		kind: 'refused',
		message: messages[0] ?? m.appointments_change_failed({}, options)
	};
}

/**
 * 🔴 D-W4-37.1 / .3: after which refusal the appointment is read again — every one that answers the change (a code or
 * none), so the 51 never offers what the server just refused and a screen no longer allowed gives way to it (D-W4-37.2);
 * not the session (nothing was decided) nor the «yes» the hour inside the cutoff asks (the screen's own question).
 */
export function changeRefusalRereads(outcome: ChangeOutcome): boolean {
	return outcome.kind !== 'session' && outcome.kind !== 'inside-cutoff';
}

/**
 * «Το ραντεβού σας» over every screen an appointment opens (record §8.2, §9.2; `appt.js:307-311`): «Το αίτημά σας» for
 * a request, «Η επίσκεψή σας» for a visit that took place (screen 54's form); the day and the hour on the office's
 * clock; the doctor (once read: never an id) with the services and their length; the street and the city; and (screens
 * 53, 54) «Για: …» for a relative (U-139.5).
 */
export type AppointmentContext = {
	label: string;
	when: string;
	line: string;
	address: string;
	forWhom: string | null;
	photo: { url: string; alt: string } | null;
};

export function buildAppointmentContext({
	appointment,
	doctor,
	withVisitor = false,
	locale
}: {
	appointment: AppointmentFacts;
	doctor: AppointmentDoctorFacts | null | undefined;
	withVisitor?: boolean;
	locale: SupportedLocale;
}): AppointmentContext {
	const options = { locale };
	const services = appointment.serviceLines
		.filter((line) => line.isActive && line.title)
		.map((line) =>
			line.durationInMinutes
				? m.booking_summary_reason_value(
						{
							service: line.title,
							duration:
								line.durationInMinutes === 1
									? m.booking_service_duration_one({ minutes: 1 }, options)
									: m.booking_service_duration_other({ minutes: line.durationInMinutes }, options)
						},
						options
					)
				: line.title
		);
	const image = doctor?.images[0];
	return {
		label:
			appointment.status === 'pending'
				? m.appointments_change_context_request({}, options)
				: appointment.status === 'completed'
					? m.ratings_form_context({}, options)
					: m.appointments_change_context({}, options),
		when: appointmentDayTimeLabel(appointment.startTime, locale, appointment.officeTimeZone),
		line: [appointmentDoctorName(doctor), services.join(', ')].filter(Boolean).join(' · '),
		address: appointmentOfficeShortLine(appointment.office, locale),
		forWhom: withVisitor ? appointmentForWhomLine(appointment, locale) : null,
		photo: image ? { url: image.thumbUrl || image.url, alt: image.alt ?? '' } : null
	};
}

/** The screens of 52 an appointment opens (D-W4-20). */
export type AppointmentChangeStep = Exclude<AppointmentStep, 'cancel'>;

/**
 * 🔴 Whether a screen of 52 may open on this appointment NOW (P-W4 §4.3, record §7.1): the hour while the server says
 * `canReschedule`; the person, a new relative and the note while it is pending or booked (D-W4-01: the ONE owner of
 * that rule, `canAmendAppointment`). Opened by its address when it may not, the screen gives way to the appointment.
 */
export function appointmentChangeOpen(
	step: AppointmentChangeStep,
	appointment: Pick<AppointmentDetailFacts, 'status' | 'actions'>
): boolean {
	return step === 'time'
		? appointment.actions.canReschedule
		: canAmendAppointment(appointment.status);
}

/**
 * The office the hour moves in (P-A4 Σ4, record §8.1): the appointment's OWN, from what it froze — the picker's one
 * office, so no office is offered to pick (`office-tabs`: one draws nothing).
 */
export function appointmentRescheduleOffice(
	appointment: Pick<AppointmentFacts, 'officeId' | 'office'>
): Pick<BookingOfficeFacts, 'officeId' | 'street' | 'streetNumber' | 'city' | 'state'> {
	const office = appointment.office;
	return {
		officeId: appointment.officeId,
		street: office?.street ?? undefined,
		streetNumber: office?.streetNumber ?? undefined,
		city: office?.city ?? undefined,
		state: office?.state ?? undefined
	};
}

/** The day the hours open on: the appointment's own on its office's calendar (`appt.js:323`), `undefined` for none. */
export function appointmentOfficeDay(
	appointment: Pick<AppointmentFacts, 'startTime' | 'officeTimeZone'>
): string | undefined {
	const at = Date.parse(appointment.startTime);
	return Number.isNaN(at) ? undefined : zonedDay(at, appointment.officeTimeZone);
}

/**
 * 🔴 The hours of 52 (record §8.2, the application's `withoutHours`): the office's window without the appointment's own
 * hour (no move) and without the hours the server said were taken (U-136, «η ώρα φεύγει»); a day left with none is an
 * empty day like any other. The window's other facts stay as they are.
 */
export function withoutAppointmentHours<T extends BookingAvailabilityFacts>(
	availability: T,
	hours: readonly string[]
): T {
	const gone = new Set(hours.map((hour) => Date.parse(hour)));
	return {
		...availability,
		days: availability.days.map((day) => ({
			...day,
			slots: day.slots.filter((slot) => !gone.has(Date.parse(slot.startTime)))
		}))
	};
}

/** What a saved note tells on the appointment (U-136.6): «Η σημείωση αποθηκεύτηκε.», or «…αφαιρέθηκε.» for an empty one. */
export function noteChangeDone(
	request: AppointmentChangeRequest
): Extract<AppointmentDone, { kind: 'note' }> {
	return { kind: 'note', removed: 'patientNote' in request && request.patientNote === null };
}
