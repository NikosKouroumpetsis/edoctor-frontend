import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import type {
	ApiResponseData,
	AppointmentConfirmationMode,
	AppointmentStatus
} from '$shared/lib/api-client';
import { isUuid } from '$shared/lib/ids';
import { readInstant } from '$shared/lib/instant';
import { clampTextLength } from '$shared/lib/text';
import type {
	DoctorAppointmentActions,
	DoctorAppointmentActor,
	DoctorAppointmentAuditLine,
	DoctorAppointmentDetailFacts,
	DoctorAppointmentFacts,
	DoctorAppointmentOffice,
	DoctorAppointmentOutcome,
	DoctorAppointmentPageFacts,
	DoctorAppointmentPerson,
	DoctorAppointmentRelative,
	DoctorAppointmentServiceLine,
	DoctorAppointmentVerdict,
	DoctorOutcomeCorrection,
	DoctorOutcomeSource,
	DoctorPatientKind,
	DoctorRescheduleSlotsFacts,
	DoctorServiceFacts
} from './types';

/** One row of the doctor's side of the list (`AppointmentResponseView`, with `actions` and `unattendedOutcomeAt`). */
type DoctorAppointmentView = ApiResponseData<'listAppointments', 200>['items'][number];

// Long enough for any real name, service or street, short enough that a broken answer cannot grow what a page draws.
const MAX_TEXT = 200;
// The patient's note: the server's own bound (`patientNote` ≤ 500, D-39).
const MAX_NOTE = 500;

const record = (value: unknown): Record<string, unknown> | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
const textUpTo = (max: number) => (value: unknown) => {
	if (typeof value !== 'string') return null;
	const read = value.trim();
	return read && read.length <= max ? read : null;
};
const text = textUpTo(MAX_TEXT);
const finite = (value: unknown): number | null =>
	typeof value === 'number' && Number.isFinite(value) ? value : null;
const fullName = (first: unknown, last: unknown) =>
	[text(first), text(last)].filter(Boolean).join(' ') || null;

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

const OUTCOMES = {
	ARRIVED: true,
	NO_SHOW: true,
	COMPLETED: true
} as const satisfies Record<DoctorAppointmentOutcome, true>;

const ACTORS = {
	DOCTOR: true,
	BACKOFFICE: true,
	PATIENT: true,
	SYSTEM: true
} as const satisfies Record<DoctorAppointmentActor, true>;

const oneOf =
	<T extends string>(table: Record<T, true>) =>
	(value: unknown): T | null =>
		typeof value === 'string' && Object.hasOwn(table, value) ? (value as T) : null;
const VERDICTS = { NO_SHOW: true, COMPLETED: true } as const satisfies Record<
	DoctorAppointmentVerdict,
	true
>;

const OUTCOME_SOURCES = { DOCTOR: true, SYSTEM: true } as const satisfies Record<
	DoctorOutcomeSource,
	true
>;

const statusOf = oneOf(STATUSES);
const outcomeOf = oneOf(OUTCOMES);
const actorOf = oneOf(ACTORS);
const verdictOf = oneOf(VERDICTS);
const outcomeSourceOf = oneOf(OUTCOME_SOURCES);

/**
 * 🔴 D-W51-53 / D-W51-71: `RECORD` only when the server says it, every other answer an account's (the server's default,
 * and every appointment before step 8) — so an older answer never loses «Μήνυμα».
 */
const patientKindOf = (value: unknown): DoctorPatientKind =>
	value === 'RECORD' ? 'RECORD' : 'ACCOUNT';

/** 🔴 D-W51-61: the correction the server opens — only a settling verdict and an instant, else none at all. */
function mapCorrection(value: unknown): DoctorOutcomeCorrection | null {
	const correction = record(value);
	const to = verdictOf(correction?.to);
	const until = readInstant(correction?.until);
	return to && until ? { to, until } : null;
}

/** 🔴 D-W51-21: the server's word on the row — a flag only when `true`, an outcome only as the contract names one. */
function mapActions(value: unknown): DoctorAppointmentActions {
	const actions = record(value);
	const outcomes = Array.isArray(actions?.outcomes) ? actions.outcomes : [];
	return {
		canConfirm: actions?.canConfirm === true,
		canReject: actions?.canReject === true,
		canReschedule: actions?.canReschedule === true,
		canCancel: actions?.canCancel === true,
		canEditCharges: actions?.canEditCharges === true,
		outcomes: [...new Set(outcomes.flatMap((entry) => outcomeOf(entry) ?? []))],
		correction: mapCorrection(actions?.correction)
	};
}

/** The first active line as booked: its title and length (the visit's own length when the line names none). */
function mapService(view: DoctorAppointmentView): DoctorAppointmentFacts['service'] {
	const lines = Array.isArray(view.serviceLines) ? view.serviceLines : [];
	const line = lines.map(record).find((entry) => entry?.isActive === true);
	const title = text(line?.serviceTitleSnapshot);
	if (!title) return null;
	return {
		title,
		durationInMinutes:
			finite(line?.durationInMinutesSnapshot) ?? finite(view.effectiveDurationInMinutes)
	};
}

/** «Κηφισίας 120»: the street and its number as booked (D-06), and the same in each language the office kept. */
function mapOfficeLines(value: unknown): DoctorAppointmentFacts['office'] {
	const office = record(value);
	if (!office) return null;
	const lineOf = (street: unknown, number: unknown) =>
		[text(street), text(number)].filter(Boolean).join(' ') || null;
	const translations = Array.isArray(office.translations) ? office.translations : [];
	return {
		line: lineOf(office.street, office.streetNumber),
		translated: translations.flatMap((entry) => {
			const translation = record(entry);
			const language = text(translation?.language);
			const line = lineOf(translation?.street, translation?.streetNumber);
			return language && line ? [{ language, line }] : [];
		})
	};
}

/**
 * One row of the doctor's side as FACTS (U-65.6: field by field, nothing made up): `null` for a row with no id, a state
 * the contract does not have or an hour that is no instant — nothing on the page may claim a visit the server did not
 * name. The visit is the relative's when it was booked for one; the account holder is then the one who booked it.
 */
export function mapDoctorAppointment(
	view: DoctorAppointmentView | null | undefined
): DoctorAppointmentFacts | null {
	const row = record(view);
	if (!row) return null;
	const id = text(row.id);
	const status = statusOf(row.status);
	const startTime = readInstant(row.startTime);
	if (!id || !status || !startTime) return null;
	const appointment = row as DoctorAppointmentView;
	const relativeSnapshot = record(appointment.relativeSnapshot);
	const forRelative = appointment.bookedForType === 'RELATIVE' || relativeSnapshot !== null;
	const patient = record(appointment.patientSnapshot);
	return {
		id,
		status,
		startTime,
		endTime: readInstant(appointment.endTime),
		officeTimeZone: text(appointment.officeTimeZone) ?? PLATFORM_TIME_ZONE,
		expiresAt: readInstant(appointment.expiresAt),
		unattendedOutcomeAt: readInstant(appointment.unattendedOutcomeAt),
		patientKind: patientKindOf(appointment.patientKind),
		patientName: fullName(patient?.firstName, patient?.lastName),
		relative: forRelative
			? {
					name: fullName(relativeSnapshot?.firstName, relativeSnapshot?.lastName),
					relationship: text(relativeSnapshot?.relationship) ?? ''
				}
			: null,
		patientNote: textUpTo(MAX_NOTE)(appointment.patientNote),
		service: mapService(appointment),
		office: mapOfficeLines(appointment.officeSnapshot),
		canceledBy: actorOf(appointment.canceledBy),
		rejectedBy: actorOf(appointment.rejectedBy),
		actions: mapActions(appointment.actions)
	};
}

/** One page: the rows the page can name (an unreadable one is left out), the cursor, the count. */
export function mapDoctorAppointmentPage(
	view: ApiResponseData<'listAppointments', 200> | null | undefined
): DoctorAppointmentPageFacts {
	const page = record(view);
	const items = Array.isArray(page?.items) ? (page.items as DoctorAppointmentView[]) : [];
	return {
		items: items.flatMap((item) => mapDoctorAppointment(item) ?? []),
		nextCursor: text(page?.nextCursor),
		total: Math.max(0, Math.trunc(finite(page?.total) ?? 0))
	};
}

/** One appointment as every single-appointment answer carries it (`getAppointment`, the writes' answers). */
type DoctorAppointmentDetailView = ApiResponseData<'getAppointment', 200>;

// An email of the RFC's length at most; a ΑΜΚΑ / ΑΦΜ / phone as digits (a broken answer never grows what a page draws).
const MAX_EMAIL = 254;
const email = (value: unknown) => {
	const read = textUpTo(MAX_EMAIL)(value);
	return read && read.includes('@') ? read : null;
};
/** The other side's words read back, cut at the server's own bound (a record from before the bound draws no wall). */
const words = (value: unknown) => {
	const read = typeof value === 'string' ? value.trim() : '';
	return read ? clampTextLength(read, MAX_NOTE) : null;
};
const DIGITS = /^\d{1,20}$/u;
const digits = (value: unknown) => {
	const read = text(value);
	return read && DIGITS.test(read) ? read : null;
};
const phone = (value: unknown) => {
	const read = text(value);
	return read && /\d/u.test(read) && read.length <= 32 ? read : null;
};

const CONFIRMATION_MODES = { AUTO: true, MANUAL: true } as const satisfies Record<
	AppointmentConfirmationMode,
	true
>;
const confirmationModeOf = oneOf(CONFIRMATION_MODES);

// _source: the application's `ACTOR_KIND_BY_ROLE` (the patient's `api/appointment/map.ts`): an audit line names the ROLE
// that acted; the support roles act for the backoffice, a member is the patient.
const ACTOR_KIND_BY_ROLE: Record<string, DoctorAppointmentActor> = {
	ADMIN: 'BACKOFFICE',
	BACKOFFICE: 'BACKOFFICE',
	DOCTOR: 'DOCTOR',
	MEMBER: 'PATIENT',
	PATIENT: 'PATIENT',
	SEMI_ADMIN: 'BACKOFFICE',
	SUPPORT: 'BACKOFFICE',
	SYSTEM: 'SYSTEM'
};
const actorOfRole = (value: unknown): DoctorAppointmentActor | null => {
	const role = text(value);
	return role && Object.hasOwn(ACTOR_KIND_BY_ROLE, role) ? ACTOR_KIND_BY_ROLE[role] : null;
};

/** 🔴 U-182.7: the holder as the doctor reads them whole — each fact by its own rule, nothing made up. */
function mapPerson(value: unknown, first: unknown, last: unknown): DoctorAppointmentPerson {
	const person = record(value);
	return {
		name: fullName(first, last),
		phone: phone(person?.phoneE164 ?? person?.phone),
		email: email(person?.email),
		amka: digits(person?.amka),
		afm: digits(person?.afm)
	};
}

function mapRelativeWhole(value: unknown): DoctorAppointmentRelative | null {
	const relative = record(value);
	if (!relative) return null;
	return {
		...mapPerson(relative, relative.firstName, relative.lastName),
		relationship: text(relative.relationship) ?? '',
		gender: text(relative.gender) ?? ''
	};
}

// The server's bound of one line's count (`APPOINTMENT_SERVICE_QUANTITY_MAX`): a broken answer is read as one.
const MAX_QUANTITY = 50;
const quantityOf = (value: unknown) => {
	const count = finite(value);
	return count !== null && Number.isInteger(count) && count >= 1 && count <= MAX_QUANTITY
		? count
		: 1;
};
const serverId = (value: unknown) => {
	const id = text(value);
	return id && isUuid(id) ? id : null;
};

/**
 * Every line that names its service and says whether it is active; its title, length and gross amount as booked, the
 * doctor's service it is of (only a server id: it travels back in «Υπηρεσίες και κόστος») and how many.
 */
function mapServiceLines(value: unknown): DoctorAppointmentServiceLine[] {
	return (Array.isArray(value) ? value : []).flatMap((entry) => {
		const line = record(entry);
		const title = text(line?.serviceTitleSnapshot);
		if (!line || !title || typeof line.isActive !== 'boolean') return [];
		return [
			{
				title,
				durationInMinutes: finite(line.durationInMinutesSnapshot),
				amount: finite(line.lineGrossAmount),
				isActive: line.isActive,
				doctorServiceId: serverId(line.doctorServiceId),
				quantity: quantityOf(line.quantity)
			}
		];
	});
}

const floorOf = (value: unknown) => {
	const floor = finite(value);
	return floor === null ? null : Math.trunc(floor);
};

/** The office as frozen: its address parts, its floor, and the same in each language it kept. */
function mapOfficeWhole(value: unknown): DoctorAppointmentOffice | null {
	const office = record(value);
	if (!office) return null;
	const translations = Array.isArray(office.translations) ? office.translations : [];
	return {
		street: text(office.street),
		streetNumber: text(office.streetNumber),
		city: text(office.city),
		state: text(office.state),
		floor: floorOf(office.floor),
		translations: translations.flatMap((entry) => {
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
					floor: floorOf(translation.floor)
				}
			];
		})
	};
}

// _source: the backend's `readSnapshotStartTime`: the trail's snapshots are `unknown`, so only these fields are read.
const snapshotStart = (snapshot: unknown) => readInstant(record(snapshot)?.startTime);
const snapshotStatus = (snapshot: unknown) => statusOf(record(snapshot)?.status);

/** The trail as facts (D-W51-38): a line without its action or its time is none; at most the last 100 are kept. */
function mapAuditTrail(value: unknown): DoctorAppointmentAuditLine[] {
	return (Array.isArray(value) ? value : []).slice(-100).flatMap((entry) => {
		const line = record(entry);
		const action = text(line?.action);
		const at = readInstant(line?.createdAt);
		if (!line || !action || !at) return [];
		return [
			{
				action,
				actorKind: actorOfRole(line.actorRole),
				at,
				status: snapshotStatus(line.afterSnapshot),
				previousStartTime: snapshotStart(line.beforeSnapshot),
				nextStartTime: snapshotStart(line.afterSnapshot)
			}
		];
	});
}

/** D-W51-33: the visits before this one — a whole count and the last start; nothing for a broken answer. */
function mapVisits(value: unknown): DoctorAppointmentDetailFacts['visitsWithDoctor'] {
	const visits = record(value);
	const count = finite(visits?.count);
	if (count === null || count < 0 || !Number.isInteger(count)) return null;
	return { count, lastAt: count > 0 ? readInstant(visits?.lastAt) : null };
}

/** D-W51-33: the patient's cutoff (whole hours) and the deadline as the server says it; nothing for a broken answer. */
function mapPatientCancellation(
	value: unknown
): DoctorAppointmentDetailFacts['patientCancellation'] {
	const terms = record(value);
	const hours = finite(terms?.cutoffHours);
	if (hours === null || hours < 0 || !Number.isInteger(hours)) return null;
	return { cutoffHours: hours, deadline: readInstant(terms?.deadline) };
}

/**
 * 🔴 Screen 68 (D-W51-33, D-W51-38; U-65.6): one appointment of the doctor's side as FACTS, field by field, nothing made
 * up — `null` for an answer with no id, a state the contract does not have or an hour that is no instant. The three
 * keys of the doctor side are read only as the contract shapes them; the conversation only as a server id (it goes in
 * an address). 🔴 U-182.7: the holder and the relative WHOLE — on this page only.
 */
export function mapDoctorAppointmentDetail(
	view: DoctorAppointmentDetailView | null | undefined
): DoctorAppointmentDetailFacts | null {
	const row = record(view);
	if (!row) return null;
	const id = text(row.id);
	const status = statusOf(row.status);
	const startTime = readInstant(row.startTime);
	if (!id || !status || !startTime) return null;
	const appointment = row as DoctorAppointmentDetailView;
	const patient = record(appointment.patientSnapshot);
	const forRelative =
		appointment.bookedForType === 'RELATIVE' || record(appointment.relativeSnapshot) !== null;
	const conversation = text(appointment.conversationId);
	const minutes = finite(appointment.effectiveDurationInMinutes);
	return {
		id,
		status,
		startTime,
		endTime: readInstant(appointment.endTime),
		durationInMinutes: minutes !== null && minutes > 0 ? minutes : null,
		officeTimeZone: text(appointment.officeTimeZone) ?? PLATFORM_TIME_ZONE,
		expiresAt: readInstant(appointment.expiresAt),
		unattendedOutcomeAt: readInstant(appointment.unattendedOutcomeAt),
		outcomeSource: outcomeSourceOf(appointment.outcomeSource),
		outcomeAt: readInstant(appointment.outcomeAt),
		outcomeCorrectableUntil: readInstant(appointment.outcomeCorrectableUntil),
		confirmationMode: confirmationModeOf(appointment.confirmationModeSnapshot),
		patientKind: patientKindOf(appointment.patientKind),
		patient: mapPerson(patient, patient?.firstName, patient?.lastName),
		relative: forRelative ? mapRelativeWhole(appointment.relativeSnapshot) : null,
		patientNote: textUpTo(MAX_NOTE)(appointment.patientNote),
		serviceLines: mapServiceLines(appointment.serviceLines),
		totalAmount: finite(appointment.finalTotalAmount) ?? finite(appointment.quotedTotalAmount),
		priceOverriddenAt: readInstant(appointment.priceOverriddenAt),
		office: mapOfficeWhole(appointment.officeSnapshot),
		confirmedAt: readInstant(appointment.confirmedAt),
		canceledBy: actorOf(appointment.canceledBy),
		canceledAt: readInstant(appointment.canceledAt),
		cancelReasonCode: text(appointment.cancelReasonCode),
		cancelReasonText: words(appointment.cancelReasonText),
		rejectedBy: actorOf(appointment.rejectedBy),
		rejectedAt: readInstant(appointment.rejectedAt),
		rejectReasonCode: text(appointment.rejectReasonCode),
		rejectReasonText: words(appointment.rejectReasonText),
		actions: mapActions(appointment.actions),
		auditTrail: mapAuditTrail(appointment.auditLogs),
		visitsWithDoctor: mapVisits(appointment.visitsWithDoctor),
		patientCancellation: mapPatientCancellation(appointment.patientCancellation),
		conversationId: conversation && isUuid(conversation) ? conversation : null,
		patientKey: patientKeyOf(appointment)
	};
}

/**
 * 🔴 D-W51-73 (the backend's `doctorPatientAppointmentFilters`): whose card the name of screen 68 opens — a `RECORD`'s
 * `patientId` is the doctor's record, a relative's visit the relative, else the account; only server ids.
 */
function patientKeyOf(
	appointment: DoctorAppointmentDetailView
): DoctorAppointmentDetailFacts['patientKey'] {
	const patientId = text(appointment.patientId);
	const relativeId = text(appointment.relativeId);
	if (!patientId || !isUuid(patientId)) return null;
	if (patientKindOf(appointment.patientKind) === 'RECORD') return { kind: 'record', id: patientId };
	if (relativeId) return isUuid(relativeId) ? { kind: 'relative', id: relativeId } : null;
	return { kind: 'account', id: patientId };
}

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/u;
// The server's own bounds: 7 days a read (`APPOINTMENT_RESCHEDULE_SLOTS_MAX_DAYS`), a day of 5-minute hours at most.
const MAX_SLOT_DAYS = 7;
const MAX_DAY_SLOTS = 288;
// A visit of a day at most; a zone is an IANA name (`Europe/Athens`), never a sentence.
const MAX_MINUTES = 1440;
const ZONE = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){0,2}$/u;

/**
 * 🔴 Screen 70 (D-W51-41; U-65.6): the doctor's free hours as FACTS — a day only as a calendar day, an hour only with
 * both instants and its end after its start, at most the server's 7 days and a day's hours; the office's zone only as
 * an IANA name (the platform's otherwise), the length only as whole minutes of a day.
 */
export function mapDoctorRescheduleSlots(
	view: ApiResponseData<'listAppointmentRescheduleSlots', 200> | null | undefined
): DoctorRescheduleSlotsFacts {
	return mapSlots(view);
}

/**
 * 🔴 Screen 72 (D-W51-56 / 70; U-65.6): the doctor's free hours for a NEW appointment (`GET /appointment/doctor/slots`)
 * — the very shape and rules of screen 70's (`mapDoctorRescheduleSlots`), its office's id left out (the request named it).
 */
export function mapDoctorNewSlots(
	view: ApiResponseData<'listDoctorSlots', 200> | null | undefined
): DoctorRescheduleSlotsFacts {
	return mapSlots(view);
}

/** The two answers of free hours (70's and 72's), read by the same rules. */
function mapSlots(view: unknown): DoctorRescheduleSlotsFacts {
	const answer = record(view);
	const zone = text(answer?.timezone);
	const minutes = finite(answer?.durationMinutes);
	const days = Array.isArray(answer?.slotsByDate) ? answer.slotsByDate : [];
	return {
		timeZone: zone && ZONE.test(zone) ? zone : PLATFORM_TIME_ZONE,
		durationMinutes:
			minutes !== null && Number.isInteger(minutes) && minutes > 0 && minutes <= MAX_MINUTES
				? minutes
				: null,
		days: days.slice(0, MAX_SLOT_DAYS).flatMap((entry) => {
			const day = record(entry);
			const date = typeof day?.date === 'string' && CALENDAR_DAY.test(day.date) ? day.date : null;
			if (!date) return [];
			const slots = (Array.isArray(day?.slots) ? day.slots : [])
				.slice(0, MAX_DAY_SLOTS)
				.flatMap((item) => {
					const slot = record(item);
					const startTime = readInstant(slot?.startTime);
					const endTime = readInstant(slot?.endTime);
					return startTime && endTime && Date.parse(endTime) > Date.parse(startTime)
						? [{ startTime, endTime }]
						: [];
				});
			return [{ date, slots }];
		})
	};
}

// The server's bound of an amount (`APPOINTMENT_MONEY_MAX_AMOUNT`).
const MAX_PRICE = 99_999_999;

/**
 * 🔴 Screen 70 «Υπηρεσίες και κόστος» (D-W51-44; U-65.6): the doctor's services as FACTS — a row only with a server id,
 * a title, a length of whole minutes of a day and a price of 0 to the server's bound; each id once (the first kept).
 */
export function mapDoctorServices(
	view: ApiResponseData<'listDoctorServices', 200> | null | undefined
): DoctorServiceFacts[] {
	const seen = new Set<string>();
	return (Array.isArray(view) ? view : []).flatMap((entry) => {
		const row = record(entry);
		const id = serverId(row?.id);
		const title = text(row?.title);
		const minutes = finite(row?.customDurationInMinutes);
		const price = finite(row?.price);
		if (!id || !title || seen.has(id)) return [];
		if (minutes === null || !Number.isInteger(minutes) || minutes <= 0 || minutes > MAX_MINUTES)
			return [];
		if (price === null || price < 0 || price > MAX_PRICE) return [];
		seen.add(id);
		return [{ id, title, durationInMinutes: minutes, price }];
	});
}
