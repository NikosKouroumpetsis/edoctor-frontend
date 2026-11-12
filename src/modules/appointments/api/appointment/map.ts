import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import type { ApiResponseData, AppointmentDetailResponseView } from '$shared/lib/api-client';
import { readInstant } from '$modules/appointments/api/instant';
import type {
	AppointmentActionsFacts,
	AppointmentActorKind,
	AppointmentAuditFacts,
	AppointmentConfirmationMode,
	AppointmentDetailFacts,
	AppointmentFacts,
	AppointmentOfficeFacts,
	AppointmentOfficeTranslationFacts,
	AppointmentPageFacts,
	AppointmentRatingInvitationRef,
	AppointmentRelativeFacts,
	AppointmentRescheduleDenial,
	AppointmentServiceLineFacts,
	AppointmentSnapshotFacts,
	AppointmentStatus
} from './types';

/** One row of the list's page (`AppointmentResponseView`): every field of one appointment but its `actions`. */
type AppointmentItemView = ApiResponseData<'listAppointments', 200>['items'][number];
type AppointmentView = AppointmentItemView | AppointmentDetailResponseView;

// W-4: a text only when it is one (an id sent as a number by a broken answer reads as none, never a throw).
const text = (value: unknown): string | null =>
	typeof value === 'string' ? value.trim() || null : null;
const finite = (value: unknown): number | null =>
	typeof value === 'number' && Number.isFinite(value) ? value : null;
/** An instant only when it is one whole (the module's one reader, review w4-w6 R1 MINOR-1). */
const instant = readInstant;
const record = (value: unknown): Record<string, unknown> | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
const fullName = (first: unknown, last: unknown) =>
	[text(first), text(last)].filter(Boolean).join(' ') || null;
/** The lines when they are a list, else none (review w3-w6 R2 NIT-1: `{}` or a `null` line never throws). */
const linesOf = (view: AppointmentView) =>
	Array.isArray(view.serviceLines) ? view.serviceLines : [];

/** 🔴 Every state the contract can answer, total over its union: any other word is no appointment of the page. */
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

const isStatus = (value: unknown): value is AppointmentStatus =>
	typeof value === 'string' && Object.hasOwn(STATUSES, value);

/** P-B4 §13.1: why the hour may not move, total over the contract's `PatientRescheduleDenial`. */
const RESCHEDULE_DENIALS = {
	STATUS: true,
	AFTER_CUTOFF: true,
	LIMIT_REACHED: true
} as const satisfies Record<AppointmentRescheduleDenial, true>;

const rescheduleDenialOf = (value: unknown): AppointmentRescheduleDenial | null =>
	typeof value === 'string' && Object.hasOwn(RESCHEDULE_DENIALS, value)
		? (value as AppointmentRescheduleDenial)
		: null;

/** A count of moves only when it is one (a whole number, never below zero); anything else is none (D-118). */
const movesLeft = (value: unknown): number | null =>
	typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

/**
 * D-W4-01 (P-B4 §13.1, §13.3.4): the visit's open invitation, only whole — its id and the instant it closes; a broken
 * one is none, so «Αξιολογήστε την επίσκεψη» never leads to a form the server cannot name.
 */
function mapRatingInvitationRef(value: unknown): AppointmentRatingInvitationRef | null {
	const ref = record(value);
	const invitationId = text(ref?.invitationId);
	const expiresAt = instant(ref?.expiresAt);
	return invitationId && expiresAt ? { invitationId, expiresAt } : null;
}

/**
 * Review w4-w3 R1 MINOR-4 (W-4): the modes the contract names, total over its union — any other word (or a number of a
 * broken answer) is none, so «Όροι του γιατρού» never claims a mode the server did not say.
 */
const CONFIRMATION_MODES = {
	AUTO: true,
	MANUAL: true
} as const satisfies Record<AppointmentConfirmationMode, true>;

const confirmationMode = (value: unknown): AppointmentConfirmationMode | null =>
	typeof value === 'string' && Object.hasOwn(CONFIRMATION_MODES, value)
		? (value as AppointmentConfirmationMode)
		: null;

const ACTOR_KINDS = {
	DOCTOR: true,
	BACKOFFICE: true,
	PATIENT: true,
	SYSTEM: true
} as const satisfies Record<AppointmentActorKind, true>;

const actorKind = (value: unknown): AppointmentActorKind | null =>
	typeof value === 'string' && Object.hasOwn(ACTOR_KINDS, value)
		? (value as AppointmentActorKind)
		: null;

// _source: the application's `ACTOR_KIND_BY_ROLE` (`api/appointments/map/index.ts`): an audit line names the ROLE that
// acted; the support roles act for the backoffice, a member is the patient. `Object.hasOwn`: a role is server data.
const ACTOR_KIND_BY_ROLE: Record<string, AppointmentActorKind> = {
	ADMIN: 'BACKOFFICE',
	BACKOFFICE: 'BACKOFFICE',
	DOCTOR: 'DOCTOR',
	MEMBER: 'PATIENT',
	PATIENT: 'PATIENT',
	SEMI_ADMIN: 'BACKOFFICE',
	SUPPORT: 'BACKOFFICE',
	SYSTEM: 'SYSTEM'
};

const actorOfRole = (value: unknown): AppointmentActorKind | null => {
	const role = text(value);
	return role && Object.hasOwn(ACTOR_KIND_BY_ROLE, role) ? ACTOR_KIND_BY_ROLE[role] : null;
};

/** What the appointment froze (D-06): the visitor's names, the first active line's title and length, the cost. */
function mapSnapshot(view: AppointmentView): AppointmentSnapshotFacts {
	const relative = view.bookedForType === 'RELATIVE' || Boolean(text(view.relativeId));
	const line = linesOf(view).find((entry) => entry?.isActive === true);
	const title = text(line?.serviceTitleSnapshot);
	return {
		visitor: relative
			? {
					kind: 'relative',
					name: fullName(view.relativeSnapshot?.firstName, view.relativeSnapshot?.lastName)
				}
			: {
					kind: 'self',
					name: fullName(view.patientSnapshot?.firstName, view.patientSnapshot?.lastName)
				},
		service: title
			? {
					title,
					durationInMinutes:
						finite(line?.durationInMinutesSnapshot) ?? finite(view.effectiveDurationInMinutes)
				}
			: null,
		totalAmount: finite(view.finalTotalAmount) ?? finite(view.quotedTotalAmount)
	};
}

/** Every line that names its service and says whether it is active; its title, length and cost as booked. */
function mapServiceLines(view: AppointmentView): AppointmentServiceLineFacts[] {
	return linesOf(view).flatMap((entry) => {
		const line = record(entry);
		const doctorServiceId = text(line?.doctorServiceId);
		if (!line || !doctorServiceId || typeof line.isActive !== 'boolean') return [];
		return [
			{
				doctorServiceId,
				title: text(line.serviceTitleSnapshot) ?? '',
				durationInMinutes: finite(line.durationInMinutesSnapshot),
				amount: finite(line.lineGrossAmount),
				isActive: line.isActive
			}
		];
	});
}

function mapOfficeTranslations(value: unknown): AppointmentOfficeTranslationFacts[] {
	return (Array.isArray(value) ? value : []).flatMap((entry) => {
		const translation = record(entry);
		const language = text(translation?.language);
		if (!translation || !language) return [];
		return [
			{
				language,
				street: text(translation.street),
				streetNumber: text(translation.streetNumber),
				city: text(translation.city),
				state: text(translation.state),
				floor: finite(translation.floor)
			}
		];
	});
}

/** The office as address PARTS (the line, the floor's words, the map's link are `lib/`'s); none without its id. */
function mapOffice(value: unknown): AppointmentOfficeFacts | null {
	const office = record(value);
	const officeId = text(office?.id);
	if (!office || !officeId) return null;
	return {
		officeId,
		street: text(office.street),
		streetNumber: text(office.streetNumber),
		city: text(office.city),
		postalCode: text(office.postalCode),
		state: text(office.state),
		floor: finite(office.floor),
		phone: text(office.phone),
		translations: mapOfficeTranslations(office.translations)
	};
}

/** 🔴 U-139.5: the relative as frozen, its relationship and gender as spelled (`''` when absent); nothing else of it. */
function mapRelative(value: unknown): AppointmentRelativeFacts | null {
	const relative = record(value);
	if (!relative) return null;
	return {
		relativeId: text(relative.id),
		firstName: text(relative.firstName),
		lastName: text(relative.lastName),
		relationship: text(relative.relationship) ?? '',
		gender: text(relative.gender) ?? ''
	};
}

// _source: the application's `readSnapshotStartTime` (backend `application/mappers/snapshots`): both sides of an
// `UPDATED` line carry `startTime` as ISO; the blobs are `unknown`, so only that one field is read.
const startTimeOf = (snapshot: unknown) => instant(record(snapshot)?.startTime);

/** The trail as facts (D-42: the only source of «the doctor moved the hour»); a line without its action or time is none. */
function mapAuditTrail(view: AppointmentView): AppointmentAuditFacts[] {
	return (Array.isArray(view.auditLogs) ? view.auditLogs : []).flatMap((entry) => {
		const line = record(entry);
		const action = text(line?.action);
		const at = instant(line?.createdAt);
		if (!line || !action || !at) return [];
		return [
			{
				action,
				actorKind: actorOfRole(line.actorRole),
				at,
				previousStartTime: startTimeOf(line.beforeSnapshot),
				nextStartTime: startTimeOf(line.afterSnapshot)
			}
		];
	});
}

/**
 * The appointment as FACTS: the instants as the server sent them, the office's zone (the platform's when it names
 * none), what it froze, how it ended, its trail. `null` for an answer with no id, doctor or office as text, a state the
 * contract does not have or an hour that is no instant: nothing on the page may claim a booking the server did not
 * name. 🔴 U-137.5: `canceledLate` is not read. D-W4-01 (P-B4 §13.1): the open invitation and the review's id, as the
 * server names them on the patient's side (a doctor's answer carries `null`), read here and nowhere else.
 */
export function mapAppointment(view: AppointmentView): AppointmentFacts | null {
	const id = text(view?.id);
	const doctorId = text(view?.doctorId);
	const officeId = text(view?.officeId);
	const startTime = instant(view?.startTime);
	if (!view || !id || !doctorId || !officeId || !startTime || !isStatus(view.status)) return null;
	const serviceLines = mapServiceLines(view);
	return {
		id,
		doctorId,
		officeId,
		officeTimeZone: text(view.officeTimeZone) ?? PLATFORM_TIME_ZONE,
		status: view.status,
		confirmationMode: confirmationMode(view.confirmationModeSnapshot),
		startTime,
		endTime: instant(view.endTime),
		durationInMinutes: finite(view.effectiveDurationInMinutes),
		expiresAt: text(view.expiresAt),
		officePhone: text((view as Partial<AppointmentDetailResponseView>).officePhone),
		patientNote: text(view.patientNote),
		firstVisit: typeof view.firstVisit === 'boolean' ? view.firstVisit : null,
		relativeId: text(view.relativeId),
		serviceIds: serviceLines.flatMap((line) => (line.isActive ? [line.doctorServiceId] : [])),
		snapshot: mapSnapshot(view),
		serviceLines,
		office: mapOffice(view.officeSnapshot),
		relative: mapRelative(view.relativeSnapshot),
		patientHasEmail: Boolean(text(record(view.patientSnapshot)?.email)),
		confirmedAt: instant(view.confirmedAt),
		canceledAt: instant(view.canceledAt),
		canceledBy: actorKind(view.canceledBy),
		cancelReasonCode: text(view.cancelReasonCode),
		cancelReasonText: text(view.cancelReasonText),
		rejectedAt: instant(view.rejectedAt),
		rejectedBy: actorKind(view.rejectedBy),
		rejectReasonText: text(view.rejectReasonText),
		updatedAt: instant(view.updatedAt),
		auditTrail: mapAuditTrail(view),
		ratingInvitation: mapRatingInvitationRef(view.ratingInvitation),
		ratingId: text(view.ratingId)
	};
}

/**
 * What the reader may do NOW (D-118), read as the server said it: a flag only when it is `true`, the cutoff only as a
 * number. The three of P-B4 §13.1 as the server sends them — the deadline only as an instant, the denial only as one of
 * its words, the moves left only as a whole count — anything else `null`, never a value of ours.
 */
function mapActions(value: unknown): AppointmentActionsFacts {
	const actions = record(value);
	return {
		canCancel: actions?.canCancel === true,
		canReschedule: actions?.canReschedule === true,
		cancellationCutoffHours: finite(actions?.cancellationCutoffHours),
		isPastCancellationCutoff: actions?.isPastCancellationCutoff === true,
		cancellationDeadline: instant(actions?.cancellationDeadline),
		rescheduleDenial: rescheduleDenialOf(actions?.rescheduleDenial),
		reschedulesLeft: movesLeft(actions?.reschedulesLeft)
	};
}

/** One appointment as its own page reads it: the facts and its `actions` (none of them for an answer without any). */
export function mapAppointmentDetail(
	view: AppointmentDetailResponseView
): AppointmentDetailFacts | null {
	const facts = mapAppointment(view);
	return facts ? { ...facts, actions: mapActions(view.actions) } : null;
}

/** One page of the list: the rows the page can name (an unreadable one is left out, W-4), the cursor, the count. */
export function mapAppointmentPage(
	view: ApiResponseData<'listAppointments', 200> | null | undefined
): AppointmentPageFacts {
	const page = record(view);
	const items = Array.isArray(page?.items) ? (page.items as AppointmentItemView[]) : [];
	return {
		items: items.flatMap((item) => {
			const facts = record(item) ? mapAppointment(item) : null;
			return facts ? [facts] : [];
		}),
		nextCursor: text(page?.nextCursor),
		total: Math.max(0, Math.trunc(finite(page?.total) ?? 0))
	};
}
